/**
 * OpenDesign quota — Host half.
 *
 * Reads the OpenDesign *control plane* (`amr-api.open-design.ai`) for one
 * account's Design Plan allowance and publishes the reading into this plugin's
 * own configuration, which is the only channel the page already receives.
 *
 * Why the control plane: the inference gateway (`amr-link…/v1`) has no quota
 * route at all, and an `sk-amr-…` API key is refused there. The allowance needs
 * a `vela_ctrl_…` key, and that key is not printed on any page — it is issued by
 * the CLI device-authorization flow this module runs, the same one `vela login`
 * uses. Nothing is stored on disk here except the key, and only in the Host
 * credential service.
 *
 * Failure policy: a failed read never erases a previous good reading. The page
 * shows the last numbers marked stale, because "no reading" and "the network
 * blipped" are different facts and only the second one is recoverable.
 *
 * Everything this module registers is inside `ctx.effect`, so unloading the
 * plugin stops the timers, the device poll and the config watch.
 *
 * @module dsh-od-quota
 */

import z from '@deepseek-ai/schemastery'
import { readFileSync } from 'node:fs'
import { hostname } from 'node:os'

/** Stable plugin module name; also the Loader id the page addresses. */
export const name = 'od-quota'

/** Profile entry id; doubles as the settings namespace the page reads. */
const ENTRY_ID = 'od-quota'

/**
 * Package version reported to the control plane when a device authorization
 * starts. Read from the installed manifest rather than typed here: the literal
 * used to live in this file and stayed at 0.1.0 across three releases.
 */
const PLUGIN_VERSION = (() => {
  try {
    const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
    return typeof manifest.version === 'string' && manifest.version.length > 0 ? manifest.version : '0.0.0'
  } catch {
    return '0.0.0'
  }
})()

/** Control plane base. The model plane is a different host on purpose. */
const CONSOLE_BASE = 'https://amr-api.open-design.ai/api/v1'

/** Default credential reference holding the `vela_ctrl_…` key. */
const DEFAULT_KEY_REF = 'OPENDESIGN_CONTROL_KEY'

/** One HTTP call deadline. */
const REQUEST_TIMEOUT_MS = 20_000

/** Steady-state allowance poll. A five-hour window does not move faster. */
const QUOTA_POLL_MS = 60_000

/** How often the config document is compared for a user action. */
const CONFIG_WATCH_MS = 1_000

/** A repeat of the same numbers is not worth even a `describe()`. */
const PUBLISH_DEDUPE_MS = 15_000

/**
 * How many times one field write is attempted before giving up.
 *
 * Every write goes through the host settings editor, which recomposes the
 * profile and checks a revision before it commits. A reading that collides
 * with another writer — the open settings page, a market toggle, a click on
 * refresh — is refused with a conflict, and dropping that refusal on the floor
 * is what makes the panel look frozen. Four attempts across ~600 ms ride out a
 * conflict without turning a failure into a busy loop.
 */
const PUBLISH_ATTEMPTS = 4

/** Delay between publish attempts, multiplied by the attempt number. */
const PUBLISH_RETRY_MS = 80

/**
 * How often the poll deadline is checked against the clock.
 *
 * `setInterval` is a request, not a guarantee: a suspended timer, a stalled
 * event loop or a dropped tick leaves the panel stale until the next minute.
 * The watchdog compares the wall clock with the last read instead of trusting
 * the timer, so a missed tick is repaired within seconds.
 */
const WATCHDOG_MS = 15_000

/** Device approval poll fallback, when the server omits its own interval. */
const DEVICE_POLL_FALLBACK_MS = 2_000

/** A device authorization is only worth polling for this long. */
const DEVICE_MAX_WAIT_MS = 10 * 60_000

/** After a rejected key, one automatic re-sign-in per this interval. */
const LOGIN_COOLDOWN_MS = 5 * 60_000

/**
 * Credits per US dollar.
 *
 * `preflight` reports credits; the dollar figure is what makes a bar legible.
 * The control plane used to expose the rate through `billing summary`; when it
 * stopped, both Go windows still imply 10,000, so the documented constant
 * stands in. A rate the service does report always wins over this one.
 */
const FALLBACK_CREDITS_PER_USD = 10_000

/**
 * Configuration schema.
 *
 * Every field is volatile: the Loader hands the running plugin stable
 * references and the page's edits take effect without a restart.
 */
export const Config = z.object({
  /** Whether the plugin polls and the header pill renders. */
  enabled: z.boolean().default(true).volatile(),
  /** Credential reference of the control-plane key. */
  keyRef: z.string().default(DEFAULT_KEY_REF).volatile(),
  /** Workspace to read; empty means "discover from the account". */
  workspaceId: z.string().default('').volatile(),
  /** Whether the 60-second poll runs. The manual refresh works either way. */
  autoRefresh: z.boolean().default(true).volatile(),
  /** Bumped by the page's refresh button; a change forces one read. */
  refreshNonce: z.string().default('').volatile(),
  /** Serialized allowance reading; empty until the first successful read. */
  quotaJson: z.string().default('').volatile(),
  /** Serialized sign-in state; empty when no sign-in is in flight. */
  loginJson: z.string().default('').volatile(),
})

/**
 * Read the live configuration into one plain snapshot.
 *
 * The Loader may also hand over a plain object (tests, a hand-written
 * composition row), so both shapes are accepted and resolved here rather than
 * in every caller.
 * @param raw - live references or a plain config object.
 * @returns resolved values.
 */
function readConfig(raw) {
  const live = raw !== undefined && raw !== null && typeof raw === 'object'
    && typeof raw.enabled === 'object' && raw.enabled !== null && typeof raw.enabled.get === 'function'
  if (!live) {
    const plain = raw ?? {}
    return {
      enabled: plain.enabled !== false,
      keyRef: typeof plain.keyRef === 'string' && plain.keyRef.length > 0 ? plain.keyRef : DEFAULT_KEY_REF,
      workspaceId: typeof plain.workspaceId === 'string' ? plain.workspaceId : '',
      autoRefresh: plain.autoRefresh !== false,
      refreshNonce: typeof plain.refreshNonce === 'string' ? plain.refreshNonce : '',
    }
  }
  return {
    enabled: raw.enabled.get() !== false,
    keyRef: raw.keyRef.get() || DEFAULT_KEY_REF,
    workspaceId: raw.workspaceId.get() ?? '',
    autoRefresh: raw.autoRefresh.get() !== false,
    refreshNonce: raw.refreshNonce.get() ?? '',
  }
}

/** Resolve after `ms`, never rejecting. @param ms - delay. @returns a promise. */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * One JSON request with a deadline.
 *
 * `AbortSignal.timeout` asks fetch to give up; it does not promise that it
 * will. A connection that blackholes — a proxy that accepts the socket and
 * then says nothing is the usual one — can leave the promise pending with the
 * signal already fired, and everything waiting on it waits forever. So the
 * deadline is also enforced from the outside: whichever settles first wins,
 * and the loser is abandoned.
 * @param url - absolute URL.
 * @param options - method, headers, body.
 * @returns status and decoded body; a transport failure rejects.
 */
async function requestJson(url, options = {}) {
  const controller = typeof AbortController === 'function' ? new AbortController() : undefined
  let timer
  const deadline = new Promise((_resolve, reject) => {
    timer = setTimeout(
      () => {
        try { controller?.abort() } catch { /* already settled */ }
        reject(new Error(`request timed out after ${REQUEST_TIMEOUT_MS} ms`))
      },
      REQUEST_TIMEOUT_MS,
    )
    if (typeof timer?.unref === 'function') timer.unref()
  })
  const attempt = (async () => {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'dsh-od-quota/0.1.2',
        ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(options.headers ?? {}),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      signal: controller?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const text = await response.text().catch(() => '')
    let body
    try {
      body = text.length === 0 ? null : JSON.parse(text)
    } catch {
      body = { text }
    }
    return { status: response.status, ok: response.ok, body }
  })()
  try {
    return await Promise.race([attempt, deadline])
  } finally {
    clearTimeout(timer)
    // The loser must not surface as an unhandled rejection later.
    attempt.catch(() => {})
  }
}

/** Narrow a value to a non-empty string. @param value - candidate. @returns it or undefined. */
const textOf = (value) => (typeof value === 'string' && value.length > 0 ? value : undefined)

/**
 * Remaining percentage of one window, from the exact credit strings.
 *
 * Derived from `remaining / limit` rather than `100 - used/limit` so a window
 * whose used value drifted still reports what the console would show as left.
 * @param remaining - remaining credits as reported.
 * @param limit - limit credits as reported.
 * @returns 0–100, or null when the limit is unusable.
 */
function percentRemainingOf(remaining, limit) {
  const left = Number(remaining)
  const total = Number(limit)
  if (!Number.isFinite(left) || !Number.isFinite(total) || total <= 0) return null
  return Math.max(0, Math.min(100, Math.round((left / total) * 100)))
}

/** API failure as a snapshot error. @param kind - stable kind. @param message - user text. @returns the error row. */
const failureOf = (kind, message) => ({ kind, message })

/**
 * Classify one HTTP answer into a snapshot error.
 * @param status - HTTP status.
 * @param body - decoded body.
 * @returns the error row.
 */
function httpFailure(status, body) {
  const said = textOf(body?.error?.message) ?? textOf(body?.error) ?? textOf(body?.message)
  if (status === 401) return failureOf('unauthorized', '控制面 key 已失效，请重新登录。')
  if (status === 403) return failureOf('forbidden', '该账号没有查看额度的权限。')
  if (status === 404) return failureOf('not-found', 'workspace 不存在（或 key 属于另一个工作空间）。')
  if (status === 429) return failureOf('rate-limited', '请求过于频繁，稍后会重试。')
  return failureOf('http', said ?? `控制面返回 HTTP ${status}。`)
}

/**
 * Read one allowance snapshot from the control plane.
 * @param key - control-plane key.
 * @param workspaceId - configured workspace, when any.
 * @param logger - host logger; also used to name unexpected shapes.
 * @returns the reading, or a snapshot carrying `error`.
 */
async function readQuota(key, workspaceId, logger) {
  const asOf = new Date().toISOString()
  const fail = (error) => ({ status: 'error', asOf, windows: [], error })

  let workspace = workspaceId.trim()
  if (workspace.length === 0) {
    const current = await requestJson(`${CONSOLE_BASE}/workspaces/current`, {
      headers: { authorization: `Bearer ${key}` },
    })
    if (!current.ok) return fail(httpFailure(current.status, current.body))
    workspace = textOf(current.body?.activeWorkspaceId) ?? textOf(current.body?.workspaceId) ?? ''
    if (workspace.length === 0) {
      return fail(failureOf('no-workspace', '该账号没有可读的工作空间。'))
    }
  }

  const preflight = await requestJson(
    `${CONSOLE_BASE}/workspaces/${encodeURIComponent(workspace)}/billing/preflight`,
    { headers: { authorization: `Bearer ${key}` } },
  )
  if (!preflight.ok) return fail(httpFailure(preflight.status, preflight.body))

  const plan = preflight.body?.codingPlan
  const rows = Array.isArray(plan?.windows) ? plan.windows : []
  const windows = []
  for (const row of rows) {
    const durationSeconds = Number(row?.durationSeconds)
    const usedCredits = textOf(row?.usedCredits)
    const limitCredits = textOf(row?.limitCredits)
    const remainingCredits = textOf(row?.remainingCredits)
    const resetsAt = textOf(row?.resetsAt)
    if (!Number.isFinite(durationSeconds) || usedCredits === undefined || limitCredits === undefined
      || remainingCredits === undefined || resetsAt === undefined) continue
    windows.push({
      durationSeconds,
      usedCredits,
      limitCredits,
      remainingCredits,
      resetsAt,
      percentRemaining: percentRemainingOf(remainingCredits, limitCredits),
    })
  }
  windows.sort((a, b) => a.durationSeconds - b.durationSeconds)
  if (windows.length === 0) {
    // Name the shape, never the values: a contract change has to be diagnosable
    // from the log without printing an account's numbers into it.
    const shape = plan !== null && typeof plan === 'object' ? Object.keys(plan).join(',') : typeof plan
    logger?.warn?.(`od-quota: codingPlan carried no usable window (keys: ${shape})`)
    if (plan?.eligible === false) {
      return fail(failureOf('no-plan', '该账号没有 Design Plan 额度，请求按钱包余额计费。'))
    }
    return fail(failureOf('no-window', '控制面没有返回任何额度窗口。'))
  }

  // The wallet and the period are optional: a reading without them is still a
  // usable allowance reading, so a failed summary never fails the whole call.
  let wallet
  let creditsPerUsd
  let tier = textOf(plan?.tier) ?? ''
  try {
    const summary = await requestJson(`${CONSOLE_BASE}/billing/summary`, {
      headers: { authorization: `Bearer ${key}` },
    })
    if (summary.ok) {
      const balanceUsd = textOf(summary.body?.balanceUsd) ?? textOf(summary.body?.totalAvailableCreditsUsd)
      const periodEnd = textOf(summary.body?.subscriptionCurrentPeriodEnd)
      if (balanceUsd !== undefined) wallet = { balanceUsd, ...(periodEnd === undefined ? {} : { periodEnd }) }
      const rate = Number(summary.body?.creditsPerUsd)
      if (Number.isFinite(rate) && rate > 0) creditsPerUsd = rate
      tier = textOf(summary.body?.membershipTier) ?? tier
    }
  } catch (error) {
    logger?.info?.(`od-quota: billing summary unavailable (${String(error)})`)
  }
  if (wallet === undefined) {
    const balanceUsd = textOf(preflight.body?.balanceUsd)
    if (balanceUsd !== undefined) wallet = { balanceUsd }
  }
  if (creditsPerUsd === undefined) creditsPerUsd = FALLBACK_CREDITS_PER_USD

  return {
    status: 'ok',
    asOf,
    ...(typeof preflight.body?.generatedAt === 'string' ? { generatedAt: preflight.body.generatedAt } : {}),
    workspace,
    tier,
    creditsPerUsd,
    windows,
    ...(wallet === undefined ? {} : { wallet }),
  }
}

/**
 * Mount the plugin.
 * @param ctx - host context.
 * @param raw - composition-entry config, or the Loader's live references.
 */
export function apply(ctx, raw) {
  const current = () => readConfig(raw)
  const log = (message) => ctx.logger.info(`od-quota: ${message}`)

  ctx.effect(() => {
    log('mounted')
    return () => log('unmounted')
  })

  // --- settings attachment -------------------------------------------------
  /**
   * The settings service, captured from the context that declared it.
   *
   * `ctx.get('settings')` on the plugin's own context answers `undefined` even
   * while the service is mounted — a service is only readable on a context that
   * declared the dependency. Reading it there made every publish a silent
   * no-op: the page kept showing "no reading" while nothing was ever written.
   */
  let settingsService
  const settingsOf = () => settingsService ?? ctx.get('settings')

  // `auto: false` because the page owns its own layout; the entry still has to
  // be opted into profile editing, or the page receives no form at all.
  ctx.inject(['settings'], (settingsCtx) => {
    const settings = settingsCtx.settings
    if (settings === undefined || typeof settings.configure !== 'function') {
      log('no settings service; the page will have no form to read')
      return
    }
    settingsService = settings
    settingsCtx.effect(() => settings.configure({ auto: false }, ctx.fiber))
  })

  // --- publishing ----------------------------------------------------------
  /**
   * Write one serialized field into this entry.
   *
   * A write costs a profile-level file lock and a full plugin-tree
   * recomposition, so an unchanged value never reaches `update`. A conflict is
   * re-read on every attempt — the page may have edited the entry between the
   * read and the write — because a refused write is otherwise indistinguishable
   * from a working panel that simply has nothing new to show.
   * @param field - config field name.
   * @param json - serialized value.
   * @returns whether the document now carries the value.
   */
  const publish = async (field, json) => {
    for (let attempt = 0; attempt < PUBLISH_ATTEMPTS; attempt += 1) {
      const settings = settingsOf()
      if (settings === undefined || typeof settings.update !== 'function'
        || typeof settings.describe !== 'function' || settings.writable !== true) return false
      let row
      try {
        row = settings.describe().find((candidate) => candidate.ns === ENTRY_ID)
      } catch {
        return false
      }
      if (row === undefined) {
        await sleep(PUBLISH_RETRY_MS * (attempt + 1))
        continue
      }
      if (row.value !== undefined && row.value[field] === json) return true
      try {
        await settings.update(ENTRY_ID, { [field]: json }, row.revision)
        return true
      } catch (error) {
        if (attempt + 1 < PUBLISH_ATTEMPTS) {
          await sleep(PUBLISH_RETRY_MS * (attempt + 1))
          continue
        }
        log(`could not publish ${field} (${String(error)})`)
        return false
      }
    }
    return false
  }

  // --- state ---------------------------------------------------------------
  /** Last reading that carried numbers; survives a failed refresh. */
  let lastGood
  /** Last published facts minus their timestamp, for change detection. */
  let lastPublished = ''
  let lastPublishedAt = 0
  /**
   * When the current (or last) read started, on the wall clock.
   *
   * The watchdog compares this against `Date.now()` rather than counting timer
   * ticks: a tick that never fired leaves no trace in a counter, but the gap it
   * leaves in this timestamp is exactly what needs repairing.
   */
  let lastReadStartedAt = 0
  /** A snapshot whose write was refused, kept so the watchdog can retry it. */
  let unpublished
  let inflight
  let device
  let disposed = false
  /** Email the last successful sign-in reported. */
  let signedInEmail
  /** A rejected key must not restart the sign-in every minute. */
  let loginCooldownUntil = 0

  /**
   * Build the snapshot to publish for one read outcome.
   *
   * A failure keeps the last numbers and marks them stale. Erasing them would
   * turn "the network blipped" into "you are signed out", which is a different
   * and much more alarming claim.
   * @param outcome - the fresh reading, or an error row.
   * @returns the snapshot to publish.
   */
  const snapshotOf = (outcome) => {
    const asOf = new Date().toISOString()
    if (outcome.status === 'ok') {
      lastGood = { ...outcome, ...(signedInEmail === undefined ? {} : { email: signedInEmail }) }
      return lastGood
    }
    if (lastGood === undefined) return { status: 'error', asOf, windows: [], error: outcome.error }
    return {
      ...lastGood,
      status: 'stale',
      asOf,
      staleSince: lastGood.asOf,
      ...(signedInEmail === undefined ? {} : { email: signedInEmail }),
      error: outcome.error,
    }
  }

  /**
   * Publish a reading, skipping an unchanged repeat inside the dedupe window.
   * @param snapshot - the reading.
   */
  const publishReading = async (snapshot) => {
    const { asOf: _freshness, ...facts } = snapshot
    const factsJson = JSON.stringify(facts)
    if (factsJson === lastPublished && Date.now() - lastPublishedAt < PUBLISH_DEDUPE_MS) {
      unpublished = undefined
      return
    }
    const accepted = await publish('quotaJson', JSON.stringify(snapshot))
    if (!accepted) {
      // Keep the reading: the watchdog retries it on its next pass, so one
      // refused write costs a few seconds instead of a whole poll interval.
      unpublished = snapshot
      return
    }
    unpublished = undefined
    lastPublished = factsJson
    lastPublishedAt = Date.now()
  }

  /** The credential service, captured from the context that declared it. */
  let credentialsService
  const credentialsOf = () => credentialsService ?? ctx.get('credentials')

  /** Read the key from the credential service, falling back to the process env. */
  const resolveKey = async (ref) => {
    const credentials = credentialsOf()
    if (credentials !== undefined) {
      try {
        const hit = await credentials.resolve(ref)
        if (hit !== undefined && typeof hit.value === 'string' && hit.value.length > 0) return hit.value.trim()
      } catch (error) {
        log(`credential lookup failed (${String(error)})`)
      }
    }
    const fromEnv = process.env[ref]
    return typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv.trim() : undefined
  }

  /** One quota read, deduplicated while a previous read is in flight. */
  const refresh = async () => {
    if (disposed) return
    if (inflight !== undefined) {
      // A read that is still "in flight" long after its own deadline is not in
      // flight at all: its promise was abandoned without settling. Keep waiting
      // on it and every later refresh, manual ones included, joins a promise
      // that never resolves — the panel stops updating until a restart.
      if (Date.now() - lastReadStartedAt > REQUEST_TIMEOUT_MS * 3) {
        log(`dropping a read that has been pending for ${Math.round((Date.now() - lastReadStartedAt) / 1000)}s`)
        inflight = undefined
      } else {
        return inflight
      }
    }
    inflight = (async () => {
      lastReadStartedAt = Date.now()
      const config = current()
      if (!config.enabled) return
      const key = await resolveKey(config.keyRef)
      if (key === undefined) {
        // Signed out. Publish that fact instead of leaving the last reading on
        // screen: the page must not keep claiming a quota it can no longer
        // verify, and the header meter has to disappear with the credential.
        lastGood = undefined
        lastPublished = ''
        await publishReading({ status: 'unconfigured', asOf: new Date().toISOString(), windows: [] })
        // Not awaited: a sign-in waits for a human for up to ten minutes, and
        // blocking the read loop on it would freeze every later refresh.
        void ensureLogin()
        return
      }
      try {
        const snapshot = await readQuota(key, config.workspaceId, ctx.logger)
        await publishReading(snapshotOf(snapshot))
        if (snapshot.status === 'error' && snapshot.error?.kind === 'unauthorized'
          && Date.now() >= loginCooldownUntil) {
          // The stored key no longer works. Offer a fresh sign-in, but at most
          // once per cooldown: a rejected authorization must not turn the
          // 60-second poll into a device-authorization generator.
          loginCooldownUntil = Date.now() + LOGIN_COOLDOWN_MS
          void ensureLogin({ force: true })
        }
      } catch (error) {
        await publishReading(snapshotOf({
          status: 'error',
          error: failureOf('network', `无法连接 OpenDesign：${error instanceof Error ? error.message : String(error)}`),
        }))
      }
    })().finally(() => { inflight = undefined })
    return inflight
  }

  // --- device authorization ------------------------------------------------
  /** Publish one sign-in state for the page to render. */
  const publishLogin = (state) => publish('loginJson', JSON.stringify(state))

  /**
   * Wait for the browser approval and exchange it for the account's keys.
   * @param authorization - the started device authorization.
   */
  const awaitApproval = async (authorization) => {
    const config = current()
    while (!disposed && Date.now() < authorization.until) {
      await sleep(authorization.interval)
      if (disposed) return
      if (authorization.cancelled === true) return
      let answer
      try {
        answer = await requestJson(
          `${CONSOLE_BASE}/cli/device-authorizations/${encodeURIComponent(authorization.deviceId)}/token`,
          { method: 'POST', body: { deviceSecret: authorization.deviceSecret } },
        )
      } catch {
        continue
      }
      const controlKey = textOf(answer.body?.controlKey)
      if (controlKey !== undefined) {
        const credentials = credentialsOf()
        if (credentials === undefined || typeof credentials.set !== 'function') {
          await publishLogin({ status: 'error', message: '凭据服务未挂载，无法保存登录结果。' })
          return
        }
        await credentials.set(config.keyRef, controlKey)
        signedInEmail = textOf(answer.body?.user?.email)
        await publishLogin({ status: 'ok', ...(signedInEmail === undefined ? {} : { email: signedInEmail }) })
        log('signed in; reading quota')
        lastPublished = ''
        loginCooldownUntil = 0
        void refresh()
        return
      }
      const status = String(answer.body?.status ?? '').toLowerCase()
      if (answer.status === 401 || answer.status === 404
        || ['expired', 'canceled', 'cancelled', 'denied', 'rejected'].includes(status)) {
        await publishLogin({ status: 'error', message: '批准已过期或被拒绝，请重新登录。' })
        return
      }
      // pending, or an answer this build does not know: keep polling.
    }
    if (!disposed) await publishLogin({ status: 'error', message: '等待批准超时，请重新登录。' })
  }

  /**
   * Start the browser sign-in, unless one is already in flight.
   *
   * While an authorization is live this republishes its pending state, because
   * the first publish can land before the settings row exists — losing the code
   * would leave the page with nothing to click for ten minutes.
   * @param options - `force` restarts an attempt that already finished.
   */
  const ensureLogin = async (options = {}) => {
    if (disposed) return
    if (device !== undefined) {
      if (options.force !== true) {
        if (device.payload !== undefined) await publishLogin(device.payload)
        return
      }
      // A forced restart within the first seconds would open a second approval
      // page for the same intention; ignore it and keep the live one.
      if (Date.now() - device.startedAt < 30_000) return
    }
    device = { startedAt: Date.now() }
    try {
      const started = await requestJson(`${CONSOLE_BASE}/cli/device-authorizations`, {
        method: 'POST',
        body: { cliVersion: 'od-quota/' + PLUGIN_VERSION, host: hostname() || 'dsh', profile: 'prod' },
      })
      const deviceId = textOf(started.body?.deviceId)
      const deviceSecret = textOf(started.body?.deviceSecret)
      if (!started.ok || deviceId === undefined || deviceSecret === undefined) {
        await publishLogin({ status: 'error', message: `发起登录失败（HTTP ${started.status}）。` })
        return
      }
      const intervalSeconds = Number(started.body?.pollIntervalSeconds)
      const authorization = {
        deviceId,
        deviceSecret,
        startedAt: Date.now(),
        until: Date.parse(started.body?.expiresAt ?? '') || Date.now() + DEVICE_MAX_WAIT_MS,
        interval: (Number.isFinite(intervalSeconds) && intervalSeconds > 0
          ? intervalSeconds
          : DEVICE_POLL_FALLBACK_MS / 1000) * 1000,
      }
      authorization.payload = {
        status: 'pending',
        userCode: textOf(started.body?.userCode),
        activationUrl: textOf(started.body?.activationUrl),
        // Both ends of the window travel with the code: the page's countdown
        // and progress bar need a real span, not a guessed ten minutes.
        issuedAt: new Date(authorization.startedAt).toISOString(),
        expiresAt: new Date(authorization.until).toISOString(),
        intervalMs: authorization.interval,
      }
      device = authorization
      await publishLogin(authorization.payload)
      await awaitApproval(authorization)
    } catch (error) {
      await publishLogin({
        status: 'error',
        message: `无法连接 OpenDesign：${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      device = undefined
    }
  }

  // --- scheduling ----------------------------------------------------------
  // One poll loop, one config watcher. Both belong to this entry's effect, so a
  // disable or an unload stops them without leaving a timer behind.
  let lastNonce = current().refreshNonce
  let lastKeyRef = current().keyRef
  let lastWorkspace = current().workspaceId
  let lastEnabled = current().enabled

  ctx.effect(() => {
    const tick = setInterval(() => {
      const config = current()
      if (config.enabled && config.autoRefresh) void refresh()
    }, QUOTA_POLL_MS)
    const watch = setInterval(() => {
      const config = current()
      const forced = config.refreshNonce !== lastNonce
      const retargeted = config.keyRef !== lastKeyRef || config.workspaceId !== lastWorkspace
      const reenabled = config.enabled && !lastEnabled
      lastNonce = config.refreshNonce
      lastKeyRef = config.keyRef
      lastWorkspace = config.workspaceId
      lastEnabled = config.enabled
      if (retargeted || reenabled) {
        // A different account or a re-enable starts from nothing; a plain
        // refresh of the same account keeps the last reading so a transient
        // failure can still be shown as stale numbers instead of an empty page.
        lastGood = undefined
      }
      if (forced || retargeted || reenabled) {
        lastPublished = ''
        void refresh()
      }
    }, CONFIG_WATCH_MS)
    // The watchdog repairs what a timer cannot promise. It looks at the clock,
    // so a tick that never fired, an event loop that stalled past a whole
    // interval, or a write the settings editor refused all end the same way:
    // the next pass notices the gap and reads again. A refused publish is
    // retried from the snapshot it left behind, not by reading the vendor API
    // a second time.
    const watchdog = setInterval(() => {
      const config = current()
      if (!config.enabled) return
      // A read that outlived its own deadline several times over is abandoned,
      // not joined. This is the difference between "one slow minute" and "the
      // panel never updates again until the process restarts".
      if (inflight !== undefined && Date.now() - lastReadStartedAt > REQUEST_TIMEOUT_MS * 2) {
        log(`read pending for ${Math.round((Date.now() - lastReadStartedAt) / 1000)}s; abandoning it`)
        inflight = undefined
      }
      if (unpublished !== undefined && inflight === undefined) {
        void publishReading(unpublished)
        return
      }
      if (!config.autoRefresh || inflight !== undefined) return
      const overdue = Date.now() - lastReadStartedAt
      if (lastReadStartedAt === 0 || overdue > QUOTA_POLL_MS + WATCHDOG_MS) {
        log(`poll overdue by ${Math.round(overdue / 1000)}s; reading again`)
        lastReadStartedAt = Date.now()
        void refresh()
      }
    }, WATCHDOG_MS)
    return () => {
      clearInterval(tick)
      clearInterval(watch)
      clearInterval(watchdog)
    }
  })

  // A credential written from the page (or another surface) has to be picked up
  // without waiting for the next poll.
  ctx.inject(['credentials'], (credentialsCtx) => {
    credentialsService = credentialsCtx.credentials
    credentialsCtx.effect(() => credentialsCtx.on('credentials/reference-updated', (ref) => {
      if (ref === current().keyRef) {
        lastPublished = ''
        lastGood = undefined
        loginCooldownUntil = 0
        void refresh()
      }
    }))
  })

  ctx.effect(() => () => { disposed = true })

  // First read happens after one tick so the settings row exists; an account
  // with no stored key starts the browser sign-in instead of showing nothing.
  ctx.effect(() => {
    const initial = setTimeout(() => { void refresh() }, 1_500)
    return () => clearTimeout(initial)
  })
}
