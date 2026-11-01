window.__ModuleLoader__.load({
  id: 'dsh-od-quota',
  factory: (require) => {
    /**
     * OpenDesign quota — browser half.
     *
     * Two surfaces, one data source: the settings page owns sign-in and detail,
     * the session header carries a compact 5-hour / 7-day meter. Neither one
     * talks to the network — the Host polls and publishes into this entry's
     * config, which arrives here through `configForms`.
     *
     * Plain JavaScript on purpose: no Harness Client package is imported as a
     * module (those change without notice), and every colour comes from the
     * host's `--dsw-alias-*` tokens so light/dark follows for free.
     */
    const React = require('react')
    const h = React.createElement

    const ENTRY_ID = 'od-quota'
    const DISPLAY_NAME = 'OpenDesign 额度'
    const DEFAULT_KEY_REF = 'OPENDESIGN_CONTROL_KEY'
    const BADGE_URI = 'data:image/png;base64,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'
    const BADGE_URL = 'https://github.com/deepseek-ai/deepseek-harness'

    /**
     * The window opened for approval, kept so it can be closed the moment the
     * Host reports success — "approve and come back" should not need a manual
     * close of the vendor tab.
     */
    let approvalWindow

    /**
     * Monotonic part of the refresh nonce.
     *
     * The Host refreshes when it sees a nonce that differs from the last one it
     * read, so two clicks inside the same millisecond used to write the same
     * value and the second one did nothing at all. A counter makes every click
     * a distinct request; the timestamp keeps it ordered and readable in the
     * profile patch.
     * @returns a nonce that never repeats.
     */
    let refreshSequence = 0
    const nextRefreshNonce = () => {
      refreshSequence += 1
      return `${Date.now()}-${refreshSequence}`
    }

    /**
     * Remaining-percentage thresholds for the header meter.
     *
     * Expressed as remaining because that is what the bar paints: plenty of
     * allowance is green, a window about to run dry is red, and the amber band
     * is the moment worth noticing before a long task.
     */
    const GREEN_AT = 50
    const AMBER_AT = 20

    // --- formatting ---------------------------------------------------------

    /** Parse a JSON field, returning undefined for empty or malformed input. */
    function parseJson(raw) {
      if (typeof raw !== 'string' || raw.length === 0) return undefined
      try {
        const value = JSON.parse(raw)
        return value !== null && typeof value === 'object' ? value : undefined
      } catch {
        return undefined
      }
    }

    /** Human label for a window length, derived from seconds. */
    function windowLabel(seconds) {
      const days = seconds / 86400
      if (Number.isInteger(days) && days >= 1) return days + ' 天'
      const hours = seconds / 3600
      if (Number.isInteger(hours) && hours >= 1) return hours + ' 小时'
      return Math.round(seconds / 60) + ' 分钟'
    }

    /** Abbreviated label for the header meter. */
    function compactLabel(seconds) {
      const days = seconds / 86400
      if (Number.isInteger(days) && days >= 1) return days + 'd'
      const hours = seconds / 3600
      if (Number.isInteger(hours) && hours >= 1) return hours + 'h'
      return Math.round(seconds / 60) + 'm'
    }

    /** Coarse countdown to a reset instant. */
    function countdown(resetsAt, now) {
      const target = Date.parse(resetsAt)
      if (!Number.isFinite(target)) return '重置时间未知'
      const delta = target - (now === undefined ? Date.now() : now)
      if (delta <= 0) return '即将重置'
      const minutes = Math.floor(delta / 60000)
      const days = Math.floor(minutes / 1440)
      const hours = Math.floor((minutes % 1440) / 60)
      const rest = minutes % 60
      if (days > 0) return days + '天 ' + hours + '小时后重置'
      if (hours > 0) return hours + '小时 ' + rest + '分后重置'
      return rest + '分钟后重置'
    }

    /** Compact mm:ss for an approval countdown. */
    function mmss(until) {
      const left = Math.max(0, until - Date.now())
      const minutes = Math.floor(left / 60000)
      const seconds = Math.floor((left % 60000) / 1000)
      return minutes + ':' + String(seconds).padStart(2, '0')
    }

    /**
     * Dollar figure for a credit amount.
     *
     * Sub-cent amounts read `$0.00`, which looks like zero quota left; the
     * alternative honest form is to name the threshold rather than round down.
     */
    function money(credits, creditsPerUsd) {
      const value = Number(credits)
      const rate = Number(creditsPerUsd)
      if (!Number.isFinite(value) || !Number.isFinite(rate) || rate <= 0) return undefined
      const usd = value / rate
      if (usd > 0 && usd < 0.01) return '< $0.01'
      return '$' + usd.toFixed(2)
    }

    /** Clock time for one ISO instant. */
    function clockOf(iso) {
      const at = Date.parse(iso)
      if (!Number.isFinite(at)) return '—'
      const date = new Date(at)
      const pad = (n) => String(n).padStart(2, '0')
      return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
    }

    /** Colour for one remaining percentage; null means "unknown", not "empty". */
    function meterColor(remaining) {
      if (remaining === null || remaining === undefined) return 'var(--dsw-alias-border-l2)'
      if (remaining <= AMBER_AT) return 'var(--dsw-alias-state-error-primary)'
      if (remaining <= GREEN_AT) return 'var(--dsw-alias-state-warn-primary)'
      return 'var(--dsw-alias-state-success-primary)'
    }

    /** Worst window of a reading, used for the meter's dot and label. */
    function worstOf(windows) {
      let worst
      for (const window of windows) {
        if (window.percentRemaining === null || window.percentRemaining === undefined) continue
        if (worst === undefined || window.percentRemaining < worst.percentRemaining) worst = window
      }
      return worst
    }

    // --- form binding -------------------------------------------------------

    /** Subscribe one component to the entry's config form. */
    function useForm(form) {
      const subscribe = React.useCallback((notify) => form.subscribe(notify), [form])
      const snapshot = React.useCallback(() => form.getSnapshot(), [form])
      return React.useSyncExternalStore(subscribe, snapshot)
    }

    /** Copy text to the clipboard; returns whether it worked. */
    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        return false
      }
    }

    // --- shared styles ------------------------------------------------------

    const card = {
      border: '1px solid var(--dsw-alias-border-l1)',
      borderRadius: 10,
      background: 'var(--dsw-alias-bg-layer-1)',
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }
    const muted = { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' }
    const rowTitle = { fontSize: 13, fontWeight: 600, color: 'var(--dsw-alias-label-primary)' }
    const dot = (color) => ({
      width: 6,
      height: 6,
      borderRadius: 999,
      background: color,
      display: 'inline-block',
      flex: '0 0 auto',
    })
    const button = {
      fontSize: 13,
      lineHeight: '20px',
      padding: '6px 12px',
      borderRadius: 8,
      border: '1px solid var(--dsw-alias-border-l2)',
      background: 'var(--dsw-alias-bg-layer-2)',
      color: 'var(--dsw-alias-label-primary)',
      cursor: 'pointer',
    }
    const primaryButton = {
      ...button,
      border: '1px solid transparent',
      background: 'var(--dsw-alias-brand-primary)',
      color: '#fff',
    }
    const disabledButton = { ...button, opacity: 0.55, cursor: 'default' }
    const input = {
      flex: 1,
      minWidth: 0,
      fontSize: 13,
      lineHeight: '20px',
      padding: '6px 10px',
      borderRadius: 8,
      border: '1px solid var(--dsw-alias-border-l1)',
      background: 'var(--dsw-alias-bg-base)',
      color: 'var(--dsw-alias-label-primary)',
    }
    const mono = {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      color: 'var(--dsw-alias-label-primary)',
      wordBreak: 'break-all',
      userSelect: 'all',
    }
    const chip = (color) => ({
      fontSize: 11,
      lineHeight: '16px',
      padding: '0 7px',
      borderRadius: 999,
      border: '1px solid ' + color,
      color,
      whiteSpace: 'nowrap',
    })

    // --- icons --------------------------------------------------------------

    /** The plugin's own gauge mark, used as the empty-state illustration. */
    function GaugeIcon(props) {
      const size = props.size === undefined ? 26 : props.size
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 64 64',
        'aria-hidden': true,
        style: { display: 'block' },
      },
        h('path', {
          d: 'M12 42a20 20 0 1 1 40 0',
          fill: 'none',
          stroke: 'var(--dsw-alias-brand-primary)',
          strokeOpacity: 0.25,
          strokeWidth: 6,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M12 42a20 20 0 0 1 11.7-18.1',
          fill: 'none',
          stroke: 'var(--dsw-alias-brand-primary)',
          strokeWidth: 6,
          strokeLinecap: 'round',
        }),
        h('circle', { cx: 32, cy: 42, r: 3.4, fill: 'var(--dsw-alias-brand-primary)' }),
        h('path', {
          d: 'M32 42l11-11',
          stroke: 'var(--dsw-alias-brand-primary)',
          strokeWidth: 3.4,
          strokeLinecap: 'round',
        }),
      )
    }

    // --- header meter -------------------------------------------------------

    /**
     * Compact 5-hour / 7-day meter for the session header.
     *
     * Two thin bars, one per window, coloured by how much is left. The header
     * row is shared with the title and other chips, so the widget stays inside
     * ~150px and never grows with the account's wording.
     * @param props - injected `form`.
     */
    function Meter(props) {
      // The guard lives outside the hook-bearing component: a conditional hook
      // call would change the hook order the moment the form arrives.
      if (props.form === undefined) return null
      return h(MeterBody, props)
    }

    /** @param props - injected `form`. */
    function MeterBody(props) {
      const snapshot = useForm(props.form)
      const value = snapshot.value instanceof Object ? snapshot.value : {}
      if (value.enabled === false) return null
      const quota = parseJson(value.quotaJson)
      if (quota === undefined || quota.status === 'disabled' || quota.status === 'unconfigured') return null
      const windows = Array.isArray(quota.windows) ? quota.windows : []
      if (windows.length === 0) return null
      const stale = quota.status !== 'ok'
      const worst = worstOf(windows)
      const remaining = worst === undefined ? 100 : worst.percentRemaining
      const tier = typeof quota.tier === 'string' && quota.tier.length > 0 ? quota.tier : ''
      const tierText = tier === '' ? '' : tier.charAt(0).toUpperCase() + tier.slice(1)
      const summary = windows
        .map((window) => compactLabel(window.durationSeconds) + ' '
          + (window.percentRemaining === null || window.percentRemaining === undefined ? '—' : window.percentRemaining + '%'))
        .join(' · ')
      const title = (tierText === '' ? 'OpenDesign' : 'Design Plan ' + tierText)
        + ' · 剩余额度（' + summary + '）'
        + ' · 读取于 ' + clockOf(quota.asOf)
        + (stale ? '（刷新失败，数据可能过期）' : '')

      return h('div', {
        role: 'status',
        tabIndex: 0,
        title,
        'aria-label': title,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          // Right margin pushes the widget away from the arrow: the utilities
          // group lays items out left to right, so extra space on the right of
          // the leftmost item is what moves it further left.
          marginRight: 100,
          padding: '2px 12px',
          borderRadius: 8,
          border: '1px solid var(--dsw-alias-border-l1)',
          background: 'var(--dsw-alias-bg-layer-2)',
          opacity: stale ? 0.6 : 1,
          flexShrink: 0,
        },
      },
        tierText === ''
          ? null
          : h('span', {
            style: {
              fontSize: 13,
              lineHeight: '19px',
              padding: '0 9px',
              borderRadius: 999,
              border: '1px solid var(--dsw-alias-brand-primary)',
              color: 'var(--dsw-alias-brand-primary)',
              whiteSpace: 'nowrap',
            },
          }, tierText),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
          windows.map((window) => {
            const pct = window.percentRemaining
            const width = pct === null || pct === undefined ? 0 : pct
            return h('div', {
              key: window.durationSeconds,
              style: { display: 'flex', alignItems: 'center', gap: 6 },
            },
              h('span', {
                style: { fontSize: 13, lineHeight: '15px', width: 20, color: 'var(--dsw-alias-label-secondary)' },
              }, compactLabel(window.durationSeconds)),
              h('span', {
                style: {
                  display: 'block',
                  width: 100,
                  height: 7,
                  borderRadius: 4,
                  background: 'var(--dsw-alias-border-l1)',
                  overflow: 'hidden',
                  flex: '0 0 auto',
                },
              }, h('span', {
                style: {
                  display: 'block',
                  height: '100%',
                  width: width + '%',
                  background: meterColor(pct),
                  transition: 'width 200ms ease',
                },
              })),
              h('span', {
                style: {
                  fontSize: 13,
                  lineHeight: '15px',
                  width: 40,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--dsw-alias-label-secondary)',
                },
              }, pct === null || pct === undefined ? '—' : pct + '%'),
            )
          })),
      )
    }

    // --- settings page ------------------------------------------------------

    /**
     * One window card: label, big percentage, bar, money and reset.
     * @param props - the normalized window and the rate.
     */
    function WindowCard(props) {
      const window = props.window
      const rate = props.creditsPerUsd
      const remaining = window.percentRemaining
      const left = money(window.remainingCredits, rate)
      const limit = money(window.limitCredits, rate)
      const width = remaining === null || remaining === undefined ? 0 : remaining
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 7 } },
        h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' } },
          h('span', { style: rowTitle }, windowLabel(window.durationSeconds)),
          h('span', {
            style: {
              fontSize: 20,
              lineHeight: '22px',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              color: meterColor(remaining),
            },
          }, remaining === null || remaining === undefined ? '—' : remaining + '%'),
        ),
        h('div', {
          role: 'progressbar',
          'aria-valuenow': width,
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-label': windowLabel(window.durationSeconds) + ' 剩余',
          style: { height: 6, borderRadius: 3, background: 'var(--dsw-alias-border-l1)', overflow: 'hidden' },
        }, h('div', {
          style: { height: '100%', width: width + '%', background: meterColor(remaining) },
        })),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', ...muted } },
          h('span', {}, (left === undefined ? window.remainingCredits + ' credits' : left)
            + (limit === undefined ? '' : ' / ' + limit)),
          h('span', {}, countdown(window.resetsAt)),
        ),
      )
    }

    /**
     * One label/value row, the shape every settings page in this shell uses.
     * @param props - `label` and the row content.
     */
    function Row(props) {
      return h('div', {
        style: { display: 'flex', alignItems: 'center', gap: 12, minHeight: 34, padding: '2px 0', fontSize: 13 },
      },
        h('span', { style: { width: 72, flex: '0 0 auto', ...muted } }, props.label),
        h('div', { style: { flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 } }, props.children),
      )
    }

    /**
     * The approval sheet.
     *
     * Laid out as label/value rows rather than a poster: the settings panel is
     * a form surface, and a full-width decorative card inside it reads as a
     * dialog someone forgot to close.
     * @param props - the pending login state and the refresh action.
     */
    function PendingCard(props) {
      const login = props.login
      const [now, setNow] = React.useState(Date.now())
      React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
      }, [])
      const until = Date.parse(login.expiresAt)
      const since = Date.parse(login.issuedAt)
      const hasWindow = Number.isFinite(until)
      const left = hasWindow ? until - now : Number.NaN
      const span = Number.isFinite(since) && hasWindow && until > since ? until - since : 10 * 60 * 1000
      const ratio = Number.isFinite(left) ? Math.max(0, Math.min(1, left / span)) : 1
      const expired = Number.isFinite(left) && left <= 0
      const url = typeof login.activationUrl === 'string' ? login.activationUrl : undefined
      const code = login.userCode === undefined ? '—' : login.userCode
      const [blocked, setBlocked] = React.useState(false)

      return h('div', card,
        h(Row, { label: '状态' },
          h('span', { style: dot(expired ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-state-warn-primary)') }),
          h('span', { style: rowTitle }, expired ? '批准已过期' : '等待浏览器确认'),
          h('span', { style: { flex: 1 } }),
          h('span', { style: { ...muted, fontVariantNumeric: 'tabular-nums' } },
            expired || !Number.isFinite(left) ? '已过期' : '剩余 ' + mmss(until)),
        ),
        h('div', {
          style: {
            height: 2,
            borderRadius: 1,
            background: 'var(--dsw-alias-border-l1)',
            overflow: 'hidden',
            marginLeft: 84,
            marginTop: -6,
            marginBottom: 2,
          },
        }, h('div', {
          style: {
            height: '100%',
            width: (ratio * 100) + '%',
            background: expired ? 'var(--dsw-alias-state-error-primary)' : 'var(--dsw-alias-state-warn-primary)',
            opacity: 0.7,
            transition: 'width 1s linear',
          },
        })),
        h(Row, { label: '确认码' },
          h('span', {
            style: {
              ...mono,
              fontSize: 20,
              lineHeight: '26px',
              letterSpacing: 6,
              padding: '4px 14px',
              borderRadius: 8,
              background: 'var(--dsw-alias-bg-layer-2)',
              border: '1px solid var(--dsw-alias-border-l1)',
            },
          }, code),
          h(CopyButton, { value: code }),
        ),
        h(Row, { label: '批准链接' },
          h('span', {
            title: url,
            style: {
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--dsw-alias-border-l1)',
              background: 'var(--dsw-alias-bg-base)',
              fontSize: 12,
              color: 'var(--dsw-alias-label-secondary)',
            },
          }, url === undefined ? '—' : url),
          url === undefined ? null : h(CopyButton, { value: url }),
        ),
        h('div', { style: { ...muted, textAlign: 'right' } },
          blocked
            ? '浏览器拦截了新标签页：复制上面的批准链接，手动粘贴到浏览器打开。'
            : '批准后额度会自动同步，浏览器标签页会自动关闭。'),
        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 } },
          h('button', { style: button, onClick: props.onRefresh }, expired ? '重新发起' : '刷新状态'),
          h('button', {
            style: url === undefined ? disabledButton : primaryButton,
            disabled: url === undefined,
            onClick: () => {
              if (url === undefined) return
              try { if (approvalWindow !== undefined) approvalWindow.close() } catch { /* already gone */ }
              const opened = window.open(url, '_blank')
              setBlocked(opened === null || opened === undefined)
              // The handle must keep its opener relationship: a window whose
              // `opener` was nulled is no longer script-closable in Chrome, and
              // this one has to be closed after the vendor page redirects
              // itself to /dashboard. (Same-origin policy still keeps the
              // vendor page out of this document.)
              approvalWindow = opened === null ? undefined : opened
            },
          }, '打开批准页'),
        ),
      )
    }

    /** Small copy control with its own "copied" feedback. */
    function CopyButton(props) {
      const [copied, setCopied] = React.useState(false)
      return h('button', {
        style: { ...button, padding: '2px 8px', fontSize: 12 },
        onClick: async () => {
          const ok = await copyText(props.value)
          setCopied(ok)
          setTimeout(() => setCopied(false), 1500)
        },
      }, copied ? '已复制' : '复制')
    }

    /**
     * The signed-out surface.
     *
     * One card: the browser sign-in as the single loud action, the manual key
     * as a quieter section underneath the same border. Two separate cards made
     * the page read as two unrelated forms.
     * @param props - login state, refresh action, save action, key reference.
     */
    function SignInCard(props) {
      const login = props.login
      const [draft, setDraft] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState(undefined)

      if (login !== undefined && login.status === 'pending') {
        return h(PendingCard, { login, onRefresh: props.onRefresh })
      }

      const message = login !== undefined && login.status === 'error' ? login.message : undefined

      const submit = async () => {
        const key = draft.trim()
        if (key.startsWith('sk-amr')) {
          setError('这是模型 API key，控制面不接受它。请用上面的浏览器登录，或粘贴 vela_ctrl_… 开头的控制面 key。')
          return
        }
        if (key.length < 16) {
          setError('这个值太短，不像是控制面 key。')
          return
        }
        setBusy(true)
        setError(undefined)
        try {
          await props.saveKey(key, props.keyRef)
          setDraft('')
        } catch (problem) {
          setError(problem instanceof Error ? problem.message : String(problem))
        } finally {
          setBusy(false)
        }
      }

      return h('div', card,
        h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '14px 8px 22px' } },
          h('div', {
            style: {
              width: 56,
              height: 56,
              borderRadius: 18,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--dsw-alias-bg-layer-2)',
              border: '1px solid var(--dsw-alias-border-l1)',
            },
          }, h(GaugeIcon, { size: 32 })),
          h('div', { style: { fontSize: 15, lineHeight: '20px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } },
            message === undefined ? '连接 OpenDesign' : '登录未完成'),
          message === undefined ? null
            : h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary)', maxWidth: 380 } }, message),
          h('div', { style: { ...muted, maxWidth: 380, lineHeight: '20px' } },
            '在浏览器登录你的 OpenDesign 账号，5 小时与 7 天额度会自动同步到这里。'),
          h('button', {
            style: { ...primaryButton, padding: '8px 20px', minWidth: 150 },
            onClick: props.onRefresh,
          }, '在浏览器中登录'),
        ),

        h('div', { style: { borderTop: '1px solid var(--dsw-alias-border-l1)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 } },
          h('div', { style: rowTitle }, '手动连接'),
          h('div', { style: muted }, '粘贴以 vela_ctrl_ 开头的控制面 key。模型 API key（sk-amr_…）读不到额度。'),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('input', {
              style: input,
              type: 'password',
              placeholder: 'vela_ctrl_…',
              value: draft,
              disabled: busy,
              onChange: (event) => setDraft(event.target.value),
              onKeyDown: (event) => { if (event.key === 'Enter') void submit() },
            }),
            h('button', {
              style: busy || draft.trim().length === 0 ? disabledButton : button,
              disabled: busy || draft.trim().length === 0,
              onClick: () => { void submit() },
            }, busy ? '保存中…' : '保存'),
          ),
          error === undefined ? null
            : h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' } }, error),
        ),
      )
    }

    /** Attribution badge; sizes and artwork are fixed by the dsh badge asset. */
    function Badge() {
      return h('a', {
        href: BADGE_URL,
        target: '_blank',
        rel: 'noreferrer',
        style: { display: 'inline-block', lineHeight: 0, opacity: 0.9 },
      }, h('img', {
        src: BADGE_URI,
        width: 121,
        height: 20,
        alt: 'powered by dsh',
        style: { display: 'block', width: 121, height: 20 },
      }))
    }

    /**
     * The settings page.
     * @param props - injected `form`, actions, plus the shell's `close`.
     */
    function Section(props) {
      // The guard lives outside the hook-bearing component: a conditional hook
      // call would change the hook order the moment the form arrives.
      if (props.form === undefined) {
        return h('div', { style: { ...muted, padding: 16 } },
          '配置服务未就绪：这个宿主没有提供设置表单，插件暂时无法保存登录信息。')
      }
      return h(SectionBody, props)
    }

    /** The settings page proper; always renders with a form. */
    function SectionBody(props) {
      const form = props.form
      const [busy, setBusy] = React.useState(false)
      const [reLoginBusy, setReLoginBusy] = React.useState(false)
      const [reLoginError, setReLoginError] = React.useState(undefined)
      const [refreshNote, setRefreshNote] = React.useState(undefined)
      const snapshot = useForm(form)
      const value = snapshot.value instanceof Object ? snapshot.value : {}

      /**
       * Run one refresh and keep the button honest for its duration.
       *
       * The host acts on a refresh only after the settings document reports a
       * new nonce, and that write is revision-checked. It can be refused — the
       * host republishes the same document every minute, so a click can land
       * behind the page's own snapshot. A refusal returned `false`, which the
       * old code dropped on the floor: the button flashed and nothing else
       * happened. Retry once with the recovered revision, and say so when even
       * that fails, instead of pretending the request went out.
       */
      const doRefresh = () => {
        if (busy) return
        setBusy(true)
        setRefreshNote(undefined)
        void (async () => {
          let sent = false
          let failure
          try {
            sent = (await props.onRefresh()) !== false
            if (!sent) {
              // The mirror needs a moment to catch up with the revision the
              // host bumped while this click was in flight.
              await new Promise((resolve) => setTimeout(resolve, 350))
              sent = (await props.onRefresh()) !== false
            }
          } catch (problem) {
            failure = problem instanceof Error ? problem.message : String(problem)
          }
          setRefreshNote(sent
            ? '已请求刷新，额度通常在一两秒内更新'
            : (failure === undefined ? '这次刷新请求没有送达（配置被并发修改），请再点一下' : failure))
          setBusy(false)
        })()
      }

      /** Sign out, surfacing whatever the credential store refuses to do. */
      const doReLogin = async () => {
        setReLoginBusy(true)
        setReLoginError(undefined)
        try {
          await props.onReLogin()
        } catch (problem) {
          setReLoginError(problem instanceof Error ? problem.message : String(problem))
        } finally {
          setTimeout(() => setReLoginBusy(false), 1_500)
        }
      }

      const enabled = value.enabled !== false
      const quota = parseJson(value.quotaJson)
      const login = parseJson(value.loginJson)
      const windows = quota !== undefined && Array.isArray(quota.windows) ? quota.windows : []
      const hasNumbers = windows.length > 0 && quota.status !== 'unconfigured'
      const fresh = quota !== undefined && quota.status === 'ok' && hasNumbers
      const stale = !fresh && hasNumbers
      const pending = login !== undefined && login.status === 'pending'
      const scanning = quota === undefined && login === undefined
      const failure = quota !== undefined ? quota.error : undefined
      const keyRef = typeof value.keyRef === 'string' && value.keyRef.length > 0 ? value.keyRef : DEFAULT_KEY_REF

      const statusRow = fresh
        ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('span', { style: dot('var(--dsw-alias-state-success-primary)') }),
          h('span', { style: rowTitle }, '已连接'),
          h('span', { style: muted },
            [quota.email, quota.tier === '' || quota.tier === undefined ? undefined : 'Design Plan ' + quota.tier]
              .filter(Boolean).join(' · ')),
          h('span', { style: { flex: 1 } }),
          h('button', { style: busy ? disabledButton : button, disabled: busy, onClick: doRefresh }, busy ? '刷新中…' : '刷新'),
          h('button', { style: reLoginBusy ? disabledButton : button, disabled: reLoginBusy, onClick: () => { void doReLogin() } }, reLoginBusy ? '正在退出…' : '重新登录'),
        )
        : stale
          ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('span', { style: dot('var(--dsw-alias-state-warn-primary)') }),
            h('span', { style: rowTitle }, '数据已过期'),
            h('span', { style: muted }, failure === undefined ? '' : failure.message),
            h('span', { style: { flex: 1 } }),
            h('button', { style: busy ? disabledButton : button, disabled: busy, onClick: doRefresh }, busy ? '刷新中…' : '重试'),
            h('button', { style: reLoginBusy ? disabledButton : button, disabled: reLoginBusy, onClick: () => { void doReLogin() } }, reLoginBusy ? '正在退出…' : '重新登录'),
          )
          : null

      return h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          fontSize: 13,
          // A form sheet, not a poster: on a wide settings column an uncapped
          // card stretches until its content floats in empty space.
          maxWidth: 620,
          color: 'var(--dsw-alias-label-primary)',
        },
      },
        enabled ? null : h('div', { style: { ...muted, color: 'var(--dsw-alias-state-warn-primary)' } },
          '插件已在配置里停用（enabled=false）：不轮询，标题栏额度条也不显示。'),

        // A pending sign-in wins over a cached reading: the previous numbers
        // belong to a credential that is already gone, and showing them is what
        // made "重新登录" look like a button that did nothing.
        pending
          ? h(SignInCard, { login, onRefresh: doRefresh })
          : statusRow === null
            ? (scanning
              ? h('div', { style: card }, h('div', { style: muted }, '正在读取额度…'))
              : h(SignInCard, { login, onRefresh: doRefresh, saveKey: props.saveKey, keyRef }))
            : h('div', { style: card }, statusRow),
        reLoginError === undefined ? null
          : h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' } }, reLoginError),
        // Feedback for the refresh button. Silence here was the bug report:
        // a click that produced no visible change could equally have been
        // "the numbers are the same" or "the request never left the page".
        refreshNote === undefined ? null
          : h('div', { style: { ...muted, fontSize: 12 } }, refreshNote),

        hasNumbers && !pending
          ? h('div', { style: card },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: rowTitle }, '额度'),
              stale ? h('span', { style: chip('var(--dsw-alias-state-warn-primary)') }, '已过期') : null,
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, opacity: stale ? 0.55 : 1 } },
              windows.map((window) => h(WindowCard, {
                key: window.durationSeconds,
                window,
                creditsPerUsd: quota.creditsPerUsd,
              }))),
          )
          : null,

        !pending && hasNumbers && quota !== undefined && quota.wallet !== undefined
          ? h('div', { style: card },
            h('div', { style: rowTitle }, '钱包'),
            h('div', { style: { display: 'flex', justifyContent: 'space-between' } },
              h('span', {}, '余额 ' + (quota.wallet.balanceUsd === undefined ? '—' : money(quota.wallet.balanceUsd, 1))),
              h('span', { style: muted },
                quota.wallet.periodEnd === undefined ? '' : '周期结束 ' + quota.wallet.periodEnd.slice(0, 10)),
            ),
          )
          : null,

        // The footer reports a reading; while signing in there is none to report,
        // and the previous account's timestamp would be a lie.
        pending ? null : h('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderTop: '1px solid var(--dsw-alias-border-l1)',
            paddingTop: 12,
            marginTop: 2,
          },
        },
          h('div', { style: { flex: 1, ...muted } },
            quota === undefined
              ? ''
              : '读取于 ' + clockOf(quota.asOf)
                + (quota.staleSince === undefined ? '' : '（上次成功 ' + clockOf(quota.staleSince) + '）')
                + (failure === undefined ? '' : ' · ' + failure.message)),
          h(Badge),
        ),

        snapshot.writable === false
          ? h('div', { style: { ...muted, color: 'var(--dsw-alias-state-warn-primary)' } },
            '当前 profile 不接受写入，登录结果无法保存。')
          : null,
      )
    }

    // --- activation ---------------------------------------------------------

    return {
      inject: ['slots', 'remote'],
      apply(ctx) {
        /** Credential namespace, resolved independently of the settings page. */
        let credentials

        ctx.inject(['remote.credentials'], (remoteCtx) => {
          credentials = remoteCtx.remote === undefined ? undefined : remoteCtx.remote.credentials
        })

        ctx.inject(['configForms'], (ready) => {
          const form = ready.configForms.get(ENTRY_ID)

          /**
           * Close the approval tab as soon as a successful reading lands.
           *
           * This lives on the plugin root, not in the settings component: the
           * user usually approves *after* closing the panel, and a component
           * effect would never run in that state — which is exactly how the tab
           * stayed open.
           */
          ready.effect(() => form.subscribe(() => {
            if (approvalWindow === undefined) return
            const value = form.getSnapshot().value
            const quota = parseJson(value === undefined ? undefined : value.quotaJson)
            if (quota === undefined || quota.status !== 'ok') return
            const opened = approvalWindow
            approvalWindow = undefined
            // The vendor page redirects itself to /dashboard the moment the
            // request is approved, and that navigation can land between our
            // poll and this call: close now, then once more after the dust
            // settles, unless the window reports itself closed already.
            try { opened.close() } catch { /* blocked */ }
            setTimeout(() => {
              try { if (opened.closed !== true) opened.close() } catch { /* blocked */ }
            }, 800)
            try { window.focus() } catch { /* browsers may ignore focus */ }
          }))

          /** Store the pasted control-plane key; the Host picks it up from there. */
          const saveKey = async (key, ref) => {
            if (credentials === undefined) throw new Error('凭据服务尚未就绪，请稍后重试。')
            const result = await credentials.set(typeof ref === 'string' && ref.length > 0 ? ref : DEFAULT_KEY_REF, key)
            if (result !== undefined && result.ok === false) {
              throw new Error(result.error instanceof Error ? result.error.message : String(result.error))
            }
          }

          /** Drop the stored key, which makes the Host offer a sign-in again. */
          const reLogin = async (ref) => {
            if (credentials === undefined) {
              throw new Error('凭据服务尚未就绪，无法退出登录。')
            }
            const target = typeof ref === 'string' && ref.length > 0 ? ref : DEFAULT_KEY_REF
            const result = await credentials.unset(target)
            if (result !== undefined && result.ok === false) {
              throw new Error(result.error instanceof Error ? result.error.message : String(result.error))
            }
            void form.set('refreshNonce', nextRefreshNonce())
          }

          /**
           * Ask the Host for one immediate read through the entry's own nonce.
           * The promise is returned so the caller can tell a delivered request
           * from one the settings editor refused.
           * @returns whether the write was accepted.
           */
          const refresh = () => form.set('refreshNonce', nextRefreshNonce())

          const injected = () => ({
            form,
            saveKey,
            onRefresh: refresh,
            onReLogin: async () => { await reLogin(form.getSnapshot().value?.keyRef) },
          })

          ready.effect(() => ready.slots.inject('settings.section', () => ready.slots.register({
            name: 'settings.section',
            id: ENTRY_ID,
            order: 60,
            label: () => DISPLAY_NAME,
            inject: injected,
          }, Section)))

          // The meter belongs to the right-anchored utilities group, not to the
          // title-adjacent chips: that group is pinned to the right edge, while
          // the chips shift left and right as agent-team / job counters appear,
          // which made the meter slide around under the pointer.
          //
          // `order: -20` is lower than every shipped utility (open-in-app -10,
          // schedule-catalog -5, session-log-download 0), so the meter renders
          // leftmost inside that group — immediately left of the "open in app"
          // arrow, and it stays there when the left side changes.
          ready.effect(() => {
            try {
              return ready.slots.inject('conversation.session.header.utilities', () => ready.slots.register({
                name: 'conversation.session.header.utilities',
                id: ENTRY_ID + '-meter',
                order: -20,
                label: () => DISPLAY_NAME,
                inject: injected,
              }, Meter))
            } catch (error) {
              console.error('od-quota: could not register the header meter', error)
              return () => {}
            }
          })
        })
      },
    }
  },
})
