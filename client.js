window.__ModuleLoader__.load({
  id: 'dsh-od-quota',
  factory: (require) => {
    /**
     * OpenDesign quota — browser half.
     *
     * Three surfaces, one data source: the sidebar page owns the detail view,
     * the settings page carries sign-in, preferences, and a summary, and the
     * session header holds an adaptive meter. None of them talk to the network;
     * the Host polls the control plane and publishes one document into this
     * entry's config, which arrives through `configForms`.
     *
     * Plain JavaScript on purpose: no Harness Client package is imported as a
     * module, every colour comes from `--dsw-alias-*` tokens (with `light-dark`
     * fallbacks so a renamed token still renders), and the only stylesheet is a
     * component-owned <style> element carrying this plugin's `odq-` prefix.
     */

    const React = require('react')
    const h = React.createElement
    const {
      useState,
      useEffect,
      useLayoutEffect,
      useRef,
      useCallback,
    } = React

    const ENTRY_ID = 'od-quota'
    const PANEL_ID = 'od-quota'
    const DEFAULT_KEY_REF = 'OPENDESIGN_CONTROL_KEY'
    const BADGE_URI = 'data:image/png;base64,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'
    const BADGE_URL = 'https://github.com/deepseek-ai/deepseek-harness'

    /**
     * The window opened for approval, kept so it can be closed the moment the
     * Host reports success — "approve and come back" should not need a manual
     * close of the vendor tab.
     */
    let approvalWindow

    /** Monotonic part of the refresh nonce; every click must be distinct. */
    let refreshSequence = 0
    const nextRefreshNonce = () => {
      refreshSequence += 1
      return `${Date.now()}-${refreshSequence}`
    }

    /**
     * Nonce for "start a new device code".
     *
     * Separate from the refresh nonce because the two ask the Host for
     * different things: a refresh re-reads the quota and leaves a live
     * authorization alone, while this discards it. Sharing one field meant the
     * retry button on an expired approval sheet only refreshed the quota and
     * left the dead code on screen.
     */
    let loginSequence = 0
    const nextLoginNonce = () => {
      loginSequence += 1
      return `${Date.now()}-${loginSequence}`
    }

    /** Remaining-percentage thresholds: green plenty, amber watch, red dry. */
    const GREEN_AT = 50
    const AMBER_AT = 20

    /**
     * Estimated widths of the three meter levels, in CSS pixels.
     *
     * The level picker compares these against the space the host header leaves
     * for us. They are deliberately above the rendered width (the safety margin
     * lives in `meterLevel`) so a font or zoom that runs slightly wide still
     * lands on the conservative side.
     */
    const METER_FULL_AT = 148
    const METER_COMPACT_AT = 104
    const METER_MINI_AT = 64

    // --- copy ---------------------------------------------------------------
    //
    // Two complete dictionaries, selected by the Client locale service. All
    // visible text lives here; the active language is read from `locale` so a
    // language switch re-renders every surface through `useCopy`.

    const COPY = {
      zh: {
        app: {
          name: 'OpenDesign 额度',
        },
        meter: {
          title: (tier, summary, at, stale) =>
            (tier === '' ? 'OpenDesign' : 'Design Plan ' + tier)
            + ' · 剩余额度（' + summary + '）'
            + ' · 读取于 ' + at
            + (stale ? '（刷新失败，数据可能过期）' : ''),
          hostStalled: '宿主可能没有在轮询',
          aria: (summary, at, stale) =>
            'OpenDesign 额度：' + summary + '，读取于 ' + at
            + (stale ? '（数据可能过期）' : '')
            + '。点击打开额度页',
        },
        page: {
          title: 'OpenDesign 额度',
          intro: '5 小时与 7 天窗口的剩余额度，来自 OpenDesign 控制面。',
          refresh: '刷新',
          refreshing: '刷新中…',
          relogin: '重新登录',
          signingOut: '正在退出…',
          enable: '启用',
          readAt: '读取于 ',
          lastSuccess: (at) => '（上次成功 ' + at + '）',
          wallet: '钱包',
          balance: '余额 ',
          periodEnd: '周期结束 ',
          remaining: ' 剩余',
          disabled: '插件已在配置里停用（enabled=false）：不轮询，顶栏额度条和本页都不会更新。',
          disabledShort: '插件已停用：不轮询，顶栏额度条也不显示。',
          noForm: '配置服务未就绪：这个宿主没有提供设置表单，插件暂时无法保存登录信息。',
          unwritable: '当前 profile 不接受写入，登录结果无法保存。',
          refreshPending: '已请求刷新…',
          refreshed: '已刷新',
          refreshStuck: '宿主还没有给出新读数：这一轮可能卡住了，稍后会自动重试',
          refreshRejected: '这次刷新请求没有送达（配置被并发修改），请再点一下',
          staleHint: '数据可能过期',
          hostStalled: (m) => '宿主已 ' + m + ' 分钟没有更新读数：自动轮询可能停了，重启 dsh web 后恢复。',
        },
        status: {
          connected: '已连接',
          stale: '数据已过期',
        },
        signIn: {
          title: '连接 OpenDesign',
          titleError: '登录未完成',
          subtitle: '在浏览器登录你的 OpenDesign 账号，5 小时与 7 天额度会自动同步到这里。',
          login: '在浏览器中登录',
          manual: '手动连接',
          manualHint: '粘贴以 vela_ctrl_ 开头的控制面 key。模型 API key（sk-amr_…）读不到额度。',
          placeholder: 'vela_ctrl_…',
          save: '保存',
          saving: '保存中…',
          tooShort: '这个值太短，不像是控制面 key。',
          modelKey: '这是模型 API key，控制面不接受它。请用上面的浏览器登录，或粘贴 vela_ctrl_… 开头的控制面 key。',
          failed: '保存失败',
        },
        pending: {
          waiting: '等待浏览器确认',
          expired: '批准已过期',
          remaining: '剩余 ',
          expiredShort: '已过期',
          code: '确认码',
          link: '批准链接',
          blocked: '浏览器拦截了新标签页：复制上面的批准链接，手动粘贴到浏览器打开。',
          hint: '批准后额度会自动同步，浏览器标签页会自动关闭。',
          refresh: '刷新状态',
          retry: '重新发起',
          open: '打开批准页',
        },
        settings: {
          openPage: '打开额度页',
          autoRefresh: '自动刷新',
          autoRefreshHint: '每 60 秒读取一次',
          enabled: '读取与顶栏显示',
          enabledHint: '关闭后不再轮询，标题栏的额度条也会消失',
          writeFailed: '这次写入没有送达（配置被并发修改），请再试一次',
        },
        common: {
          copy: '复制',
          copied: '已复制',
        },
        errors: {
          credentialsNotReady: '凭据服务尚未就绪，请稍后重试。',
          credentialsUnavailable: '凭据服务尚未就绪，无法退出登录。',
        },
        window: {
          days: (n) => n + ' 天窗口',
          hours: (n) => n + ' 小时窗口',
          minutes: (n) => n + ' 分钟窗口',
        },
        countdown: {
          unknown: '重置时间未知',
          soon: '即将重置',
          days: (d, h) => d + '天 ' + h + '小时后重置',
          hours: (h, m) => h + '小时 ' + m + '分后重置',
          minutes: (m) => m + '分钟后重置',
        },
      },
      en: {
        app: {
          name: 'OpenDesign Quota',
        },
        meter: {
          title: (tier, summary, at, stale) =>
            (tier === '' ? 'OpenDesign' : 'Design Plan ' + tier)
            + ' · remaining quota (' + summary + ')'
            + ' · read at ' + at
            + (stale ? ' (refresh failed; data may be stale)' : ''),
          hostStalled: 'host may not be polling',
          aria: (summary, at, stale) =>
            'OpenDesign quota: ' + summary + ', read at ' + at
            + (stale ? ' (data may be stale)' : '')
            + '. Click to open the quota page',
        },
        page: {
          title: 'OpenDesign quota',
          intro: 'The 5-hour and 7-day allowance, read from the OpenDesign control plane.',
          refresh: 'Refresh',
          refreshing: 'Refreshing…',
          relogin: 'Sign in again',
          signingOut: 'Signing out…',
          enable: 'Enable',
          readAt: 'Read at ',
          lastSuccess: (at) => ' (last success ' + at + ')',
          wallet: 'Wallet',
          balance: 'Balance ',
          periodEnd: 'Period ends ',
          remaining: ' remaining',
          disabled: 'The plugin is disabled (enabled=false): it does not poll, so the header meter and this page stay frozen.',
          disabledShort: 'Plugin disabled: no polling, and the header meter is hidden.',
          noForm: 'The config service is not ready: this host does not expose a settings form, so sign-in cannot be saved.',
          unwritable: 'This profile does not accept writes; sign-in results cannot be saved.',
          refreshPending: 'Refresh requested…',
          refreshed: 'Refreshed',
          refreshStuck: 'The host has not produced a new reading yet; this round may be stuck and will retry automatically',
          refreshRejected: 'The refresh request did not land (the config changed concurrently). Please click again.',
          staleHint: 'Data may be stale',
          hostStalled: (m) => 'The host has not refreshed for ' + m + ' minutes: polling may have stopped. Restart dsh web to resume.',
        },
        status: {
          connected: 'Connected',
          stale: 'Data is stale',
        },
        signIn: {
          title: 'Connect OpenDesign',
          titleError: 'Sign-in incomplete',
          subtitle: 'Sign in to your OpenDesign account in the browser; the 5-hour and 7-day allowance will sync here automatically.',
          login: 'Sign in with browser',
          manual: 'Connect manually',
          manualHint: 'Paste a control-plane key starting with vela_ctrl_. A model API key (sk-amr_…) cannot read quota.',
          placeholder: 'vela_ctrl_…',
          save: 'Save',
          saving: 'Saving…',
          tooShort: 'That value is too short to be a control-plane key.',
          modelKey: 'That is a model API key; the control plane does not accept it. Use the browser sign-in above, or paste a vela_ctrl_… control-plane key.',
          failed: 'Save failed',
        },
        pending: {
          waiting: 'Waiting for browser approval',
          expired: 'Approval expired',
          remaining: 'remaining ',
          expiredShort: 'expired',
          code: 'Code',
          link: 'Approval link',
          blocked: 'The browser blocked the new tab: copy the approval link above and open it manually.',
          hint: 'The allowance syncs automatically after approval; the browser tab closes itself.',
          refresh: 'Refresh status',
          retry: 'Start over',
          open: 'Open approval page',
        },
        settings: {
          openPage: 'Open quota page',
          autoRefresh: 'Auto refresh',
          autoRefreshHint: 'Reads once every 60 seconds',
          enabled: 'Reading & header meter',
          enabledHint: 'Turn off to stop polling and hide the header meter',
          writeFailed: 'That write did not land (the config changed concurrently). Please try again.',
        },
        common: {
          copy: 'Copy',
          copied: 'Copied',
        },
        errors: {
          credentialsNotReady: 'The credential service is not ready yet. Please try again in a moment.',
          credentialsUnavailable: 'The credential service is not ready, so signing out is unavailable.',
        },
        window: {
          days: (n) => n + '-day window',
          hours: (n) => n + '-hour window',
          minutes: (n) => n + '-minute window',
        },
        countdown: {
          unknown: 'Reset time unknown',
          soon: 'Resetting soon',
          days: (d, h) => 'resets in ' + d + 'd ' + h + 'h',
          hours: (h, m) => 'resets in ' + h + 'h ' + m + 'm',
          minutes: (m) => 'resets in ' + m + 'm',
        },
      },
    }

    /** Placeholder snapshot used before the locale service arrives. */
    const EMPTY_LOCALE = { active: 'zh', locales: [], revision: 0 }

    /** Locale face; resolved when the Client locale service is available. */
    let localeFace

    function subscribeLocale(listener) {
      return localeFace === undefined ? () => {} : localeFace.subscribe(listener)
    }

    function readLocale() {
      return localeFace === undefined ? EMPTY_LOCALE : localeFace.getSnapshot()
    }

    /** Copy for one locale id; language packs without a table fall back to English. */
    function copyFor(active) {
      return COPY[active] === undefined ? COPY.en : COPY[active]
    }

    /** Copy for the current locale, for non-component callers (slot labels). */
    function copyNow() {
      return copyFor(readLocale().active)
    }

    /** Current copy, re-rendering the component whenever the locale changes. */
    function useCopy() {
      const snapshot = React.useSyncExternalStore(subscribeLocale, readLocale, readLocale)
      return copyFor(snapshot.active)
    }

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

    /** Human window label for the detail cards. */
    function windowTitle(seconds, copy) {
      const days = seconds / 86400
      if (Number.isInteger(days) && days >= 1) return copy.window.days(days)
      const hours = seconds / 3600
      if (Number.isInteger(hours) && hours >= 1) return copy.window.hours(hours)
      return copy.window.minutes(Math.round(seconds / 60))
    }

    /** Abbreviated label for the compact meter. */
    function compactLabel(seconds) {
      const days = seconds / 86400
      if (Number.isInteger(days) && days >= 1) return days + 'd'
      const hours = seconds / 3600
      if (Number.isInteger(hours) && hours >= 1) return hours + 'h'
      return Math.round(seconds / 60) + 'm'
    }

    /** Coarse countdown to a reset instant. */
    function countdown(resetsAt, now, copy) {
      const target = Date.parse(resetsAt)
      if (!Number.isFinite(target)) return copy.countdown.unknown
      const delta = target - (now === undefined ? Date.now() : now)
      if (delta <= 0) return copy.countdown.soon
      const minutes = Math.floor(delta / 60000)
      const days = Math.floor(minutes / 1440)
      const hours = Math.floor((minutes % 1440) / 60)
      const rest = minutes % 60
      if (days > 0) return copy.countdown.days(days, hours)
      if (hours > 0) return copy.countdown.hours(hours, rest)
      return copy.countdown.minutes(rest)
    }

    /** Compact mm:ss for an approval countdown. */
    function mmss(until) {
      const left = Math.max(0, until - Date.now())
      const minutes = Math.floor(left / 60000)
      const seconds = Math.floor((left % 60000) / 1000)
      return minutes + ':' + String(seconds).padStart(2, '0')
    }

    /** Dollar figure for a credit amount; sub-cent stays explicit. */
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
      if (remaining === null || remaining === undefined) return 'var(--dsw-alias-border-l2, light-dark(#0000001a, #ffffff1f))'
      if (remaining <= AMBER_AT) return 'var(--dsw-alias-state-error-primary, #d54941)'
      if (remaining <= GREEN_AT) return 'var(--dsw-alias-state-warn-primary, #c8871a)'
      return 'var(--dsw-alias-state-success-primary, #2f9e63)'
    }

    /** Percentage text, `—` when a window did not report one. */
    function pctText(remaining) {
      return remaining === null || remaining === undefined ? '—' : remaining + '%'
    }

    /** Worst window of a reading, used for the meter's dot and mini readout. */
    function worstOf(windows) {
      let worst
      for (const window of windows) {
        if (window.percentRemaining === null || window.percentRemaining === undefined) continue
        if (worst === undefined || window.percentRemaining < worst.percentRemaining) worst = window
      }
      return worst
    }

    /** First letter upper-cased, for a tier token. */
    function cap(text) {
      return typeof text === 'string' && text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : ''
    }

    /** One-line summary of all windows, shared by the meter's tooltip. */
    function summaryOf(windows) {
      return windows
        .map((window) => compactLabel(window.durationSeconds) + ' ' + pctText(window.percentRemaining))
        .join(' · ')
    }

    /** Error message of an unknown thrown value. */
    function messageOf(problem) {
      return problem instanceof Error ? problem.message : String(problem)
    }

    /** Resolve after `ms`, never rejecting. */
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    // --- theme --------------------------------------------------------------

    const T = {
      text: 'var(--dsw-alias-label-primary, light-dark(#0f1115, #f9fafb))',
      dim: 'var(--dsw-alias-label-secondary, light-dark(#61666b, #cfd3d6))',
      faint: 'var(--dsw-alias-label-tertiary, light-dark(#81858c, #adb2b8))',
      border: 'var(--dsw-alias-border-l1, light-dark(#0000000a, #ffffff0f))',
      border2: 'var(--dsw-alias-border-l2, light-dark(#0000001a, #ffffff1f))',
      border3: 'var(--dsw-alias-border-l3, light-dark(#0000001f, #ffffff29))',
      layer1: 'var(--dsw-alias-bg-layer-1, light-dark(#f8f9fa, #202124))',
      layer2: 'var(--dsw-alias-bg-layer-2, light-dark(#f1f2f4, #2a2b2e))',
      base: 'var(--dsw-alias-bg-base, light-dark(#ffffff, #151618))',
      brand: 'var(--dsw-alias-brand-primary, #4d6bfe)',
      ok: 'var(--dsw-alias-state-success-primary, #2f9e63)',
      warn: 'var(--dsw-alias-state-warn-primary, #c8871a)',
      err: 'var(--dsw-alias-state-error-primary, #d54941)',
      skeleton: 'var(--dsw-alias-bg-skeleton, light-dark(#eceef1, #2a2b2e))',
      mono: 'var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)',
    }

    // --- stylesheet ---------------------------------------------------------
    //
    // Rendered as a component-owned <style> element, so it appears with the
    // surface that needs it and disappears with it. Every class carries the
    // `odq-` prefix; only theme tokens are referenced.

    const CSS = `
.odq-meter{box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 6px;border:0;border-radius:var(--dsw-radius-md,8px);background:transparent;color:var(--dsw-alias-label-secondary,light-dark(#61666b,#cfd3d6));font:inherit;font-size:11px;line-height:13px;cursor:pointer;flex:none;white-space:nowrap;transition:background-color .12s ease}
.odq-meter:hover{background:var(--dsw-alias-interactive-bg-hover,light-dark(#2631480f,#ffffff14))}
.odq-meter:active{background:var(--dsw-alias-interactive-bg-active,light-dark(#2631481a,#ffffff24))}
.odq-meter:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#4d6bfe));outline-offset:1px}
.odq-tier{color:var(--dsw-alias-brand-primary,#4d6bfe);font-size:10px;line-height:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.odq-rows{display:flex;flex-direction:column;gap:2px}
.odq-mrow{display:flex;align-items:center;gap:4px}
.odq-mwin{width:14px;color:var(--dsw-alias-label-tertiary,light-dark(#81858c,#adb2b8));font-size:10px;line-height:11px;text-align:left}
.odq-mtrack{display:block;width:44px;height:4px;border-radius:999px;background:var(--dsw-alias-border-l2,light-dark(#0000001a,#ffffff1f));overflow:hidden;flex:none}
.odq-mfill{display:block;height:100%;border-radius:inherit;transition:width .32s cubic-bezier(.2,0,0,1)}
.odq-mpct{width:26px;text-align:right;font-size:10px;line-height:12px;font-variant-numeric:tabular-nums}
.odq-meter[data-level="compact"] .odq-mtrack{width:26px}
.odq-dot{display:inline-block;width:6px;height:6px;border-radius:999px;flex:none}
.odq-mini-pct{font-size:11px;line-height:13px;font-variant-numeric:tabular-nums}
.odq-page{box-sizing:border-box;height:100%;overflow:auto;color:var(--dsw-alias-label-primary,light-dark(#0f1115,#f9fafb));font-size:13px;line-height:20px}
.odq-page-inner{max-width:960px;margin:0 auto;padding:calc(28px + var(--dsh-frame-top-clearance,0px)) clamp(24px,4vw,48px) 48px;display:flex;flex-direction:column;gap:24px}
.odq-page-head{display:flex;align-items:flex-start;gap:16px}
.odq-page-title{margin:0;font-size:20px;font-weight:500;line-height:28px}
.odq-page-intro{margin:4px 0 0;color:var(--dsw-alias-label-secondary,light-dark(#61666b,#cfd3d6));font-size:13px;line-height:20px}
.odq-page-actions{display:flex;align-items:center;gap:8px;flex:none}
.odq-status{display:flex;align-items:center;gap:8px;min-width:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,light-dark(#61666b,#cfd3d6))}
.odq-status-title{color:var(--dsw-alias-label-primary,light-dark(#0f1115,#f9fafb));font-weight:500;white-space:nowrap}
.odq-status-sub{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.odq-status-meta{margin-left:auto;color:var(--dsw-alias-label-tertiary,light-dark(#81858c,#adb2b8));white-space:nowrap}
.odq-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.odq-card{box-sizing:border-box;display:flex;flex-direction:column;gap:14px;border:.5px solid var(--dsw-alias-border-l1,light-dark(#0000000a,#ffffff0f));border-radius:var(--dsw-radius-xl,12px);background:var(--dsw-alias-bg-layer-1,light-dark(#f8f9fa,#202124));padding:18px 20px;corner-shape:var(--dsw-corner-shape,superellipse(1.5))}
.odq-card-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.odq-card-label{font-size:13px;font-weight:500;line-height:20px}
.odq-card-value{font-size:34px;line-height:38px;font-weight:600;font-variant-numeric:tabular-nums}
.odq-card-track{height:8px;border-radius:999px;background:var(--dsw-alias-border-l1,light-dark(#0000000a,#ffffff0f));overflow:hidden}
.odq-card-fill{height:100%;border-radius:inherit;transition:width .32s cubic-bezier(.2,0,0,1)}
.odq-card-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--dsw-alias-label-tertiary,light-dark(#81858c,#adb2b8));font-size:12px;line-height:18px}
.odq-wallet{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.odq-wallet-value{font-size:20px;line-height:26px;font-weight:600;font-variant-numeric:tabular-nums}
.odq-wallet-meta{color:var(--dsw-alias-label-tertiary,light-dark(#81858c,#adb2b8));font-size:12px;line-height:18px}
.odq-footer{display:flex;align-items:center;gap:12px;padding-top:12px;border-top:.5px solid var(--dsw-alias-border-l1,light-dark(#0000000a,#ffffff0f));color:var(--dsw-alias-label-tertiary,light-dark(#81858c,#adb2b8));font-size:12px;line-height:18px}
.odq-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 12px;border:.5px solid var(--dsw-alias-border-l3,light-dark(#0000001f,#ffffff29));border-radius:var(--dsw-radius-md,8px);background:transparent;color:var(--dsw-alias-label-primary,light-dark(#0f1115,#f9fafb));font:inherit;font-size:13px;line-height:20px;cursor:pointer;transition:background-color .12s ease,border-color .12s ease}
.odq-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,light-dark(#2631480f,#ffffff14))}
.odq-btn:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active,light-dark(#2631481a,#ffffff24))}
.odq-btn:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#4d6bfe));outline-offset:2px}
.odq-btn:disabled{opacity:.55;cursor:default}
.odq-btn-primary{border-color:transparent;background:var(--dsw-alias-brand-primary,#4d6bfe);color:var(--dsw-alias-label-primary-foreground,#fff)}
.odq-btn-primary:hover:not(:disabled){background:var(--dsw-alias-brand-primary,#4d6bfe);filter:brightness(1.08)}
.odq-btn-small{height:28px;padding:0 8px;font-size:12px}
.odq-btn-wide{min-width:150px}
.odq-switch{position:relative;flex:none;width:36px;height:20px;padding:0;border:0;border-radius:999px;background:var(--dsw-alias-border-l2,light-dark(#0000001a,#ffffff1f));cursor:pointer;transition:background-color .15s ease}
.odq-switch-on{background:var(--dsw-alias-brand-primary,#4d6bfe)}
.odq-switch:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#4d6bfe));outline-offset:2px}
.odq-switch-knob{position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-label-primary-foreground,#fff);box-shadow:0 1px 2px rgba(0,0,0,.2);transition:transform .15s ease}
.odq-switch-on .odq-switch-knob{transform:translateX(16px)}
.odq-settings{display:flex;flex-direction:column;gap:12px;max-width:620px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary,light-dark(#0f1115,#f9fafb))}
.odq-summary-actions{display:flex;justify-content:flex-end;gap:8px}
.odq-mini-list{display:flex;flex-direction:column;gap:6px}
.odq-mini-row{display:flex;align-items:center;gap:8px;font-size:12px;line-height:18px}
.odq-mini-label{width:22px;color:var(--dsw-alias-label-tertiary,light-dark(#81858c,#adb2b8));font-size:11px}
.odq-mini-track{flex:1;height:5px;border-radius:999px;background:var(--dsw-alias-border-l1,light-dark(#0000000a,#ffffff0f));overflow:hidden}
.odq-mini-fill{height:100%;border-radius:inherit;transition:width .3s ease}
.odq-mini-pct{width:34px;text-align:right;color:var(--dsw-alias-label-tertiary,light-dark(#81858c,#adb2b8));font-variant-numeric:tabular-nums}
.odq-read{color:var(--dsw-alias-label-tertiary,light-dark(#81858c,#adb2b8));font-size:12px;line-height:18px}
.odq-pref{display:flex;align-items:center;gap:16px;min-height:40px}
.odq-pref+.odq-pref{border-top:.5px solid var(--dsw-alias-border-l1,light-dark(#0000000a,#ffffff0f))}
.odq-pref-text{flex:1;min-width:0}
.odq-pref-title{font-size:13px;line-height:20px}
.odq-pref-hint{color:var(--dsw-alias-label-tertiary,light-dark(#81858c,#adb2b8));font-size:12px;line-height:18px}
.odq-hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:14px 8px 20px}
.odq-tile{width:56px;height:56px;display:grid;place-items:center;border-radius:18px;background:var(--dsw-alias-bg-layer-2,light-dark(#f1f2f4,#2a2b2e));border:.5px solid var(--dsw-alias-border-l1,light-dark(#0000000a,#ffffff0f));corner-shape:var(--dsw-corner-shape,superellipse(1.5))}
.odq-h2{margin:0;font-size:15px;font-weight:600;line-height:20px}
.odq-h3{margin:0;font-size:13px;font-weight:600;line-height:20px}
.odq-p{margin:0;color:var(--dsw-alias-label-secondary,light-dark(#61666b,#cfd3d6));font-size:12px;line-height:20px;max-width:420px}
.odq-divider{border-top:.5px solid var(--dsw-alias-border-l1,light-dark(#0000000a,#ffffff0f));margin:2px 0}
.odq-manual{display:flex;flex-direction:column;gap:8px}
.odq-input-row{display:flex;gap:8px}
.odq-input{flex:1;min-width:0;height:32px;box-sizing:border-box;padding:0 10px;border:.5px solid var(--dsw-alias-border-l2,light-dark(#0000001a,#ffffff1f));border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-base,light-dark(#ffffff,#151618));color:var(--dsw-alias-label-primary,light-dark(#0f1115,#f9fafb));font:inherit;font-size:13px;outline:none}
.odq-input:focus{border-color:var(--dsw-alias-state-business-primary,#4d6bfe)}
.odq-alert{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--dsw-radius-md,8px);font-size:12px;line-height:18px}
.odq-alert-warn{background:var(--dsw-alias-state-warn-tertiary,color-mix(in srgb,var(--dsw-alias-state-warn-primary,#c8871a) 12%,transparent));color:var(--dsw-alias-label-primary,light-dark(#0f1115,#f9fafb))}
.odq-alert-error{color:var(--dsw-alias-state-error-primary,#d54941)}
.odq-note{color:var(--dsw-alias-label-tertiary,light-dark(#81858c,#adb2b8));font-size:12px;line-height:18px}
.odq-kv{display:flex;align-items:center;gap:12px;min-height:34px}
.odq-kv-label{width:72px;flex:none;color:var(--dsw-alias-label-secondary,light-dark(#61666b,#cfd3d6));font-size:12px}
.odq-kv-body{flex:1;min-width:0;display:flex;align-items:center;gap:8px}
.odq-code{font-family:var(--dsw-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:20px;line-height:26px;letter-spacing:6px;padding:4px 14px;border-radius:8px;background:var(--dsw-alias-bg-layer-2,light-dark(#f1f2f4,#2a2b2e));border:.5px solid var(--dsw-alias-border-l1,light-dark(#0000000a,#ffffff0f))}
.odq-link{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:6px 10px;border-radius:8px;border:.5px solid var(--dsw-alias-border-l1,light-dark(#0000000a,#ffffff0f));background:var(--dsw-alias-bg-base,light-dark(#ffffff,#151618));font-size:12px;color:var(--dsw-alias-label-secondary,light-dark(#61666b,#cfd3d6))}
.odq-progress{height:2px;border-radius:1px;background:var(--dsw-alias-border-l1,light-dark(#0000000a,#ffffff0f));overflow:hidden;margin-top:-6px;margin-bottom:2px}
.odq-progress-fill{height:100%;border-radius:inherit;opacity:.7;transition:width 1s linear}
.odq-actions{display:flex;gap:8px;justify-content:flex-end;padding-top:4px}
.odq-skel{border-radius:6px;background:var(--dsw-alias-bg-skeleton,light-dark(#eceef1,#2a2b2e))}
.odq-skel-line{height:12px}
.odq-fade{animation:odq-fade .12s ease-out}
@keyframes odq-fade{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.odq-fade,.odq-card-fill,.odq-mini-fill,.odq-mfill,.odq-meter,.odq-btn,.odq-switch,.odq-switch-knob,.odq-progress-fill{animation:none!important;transition:none!important}}
`

    function StyleTag() {
      return h('style', { 'data-odq-sheet': '' }, CSS)
    }

    // --- icons --------------------------------------------------------------

    /** The plugin's gauge mark, drawn in the host's current foreground colour. */
    function GaugeIcon(props) {
      const size = props.size === undefined ? 24 : props.size
      const tone = props.tone === undefined ? 'currentColor' : props.tone
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      },
        h('path', {
          d: 'M4 16.5a8 8 0 1 1 16 0',
          stroke: tone,
          strokeOpacity: 0.3,
          strokeWidth: 2,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M4 16.5a8 8 0 0 1 4.2-7',
          stroke: tone,
          strokeWidth: 2,
          strokeLinecap: 'round',
        }),
        h('circle', { cx: 12, cy: 16.5, r: 1.5, fill: tone }),
        h('path', {
          d: 'M12 16.5l3.6-3.6',
          stroke: tone,
          strokeWidth: 1.8,
          strokeLinecap: 'round',
        }),
      )
    }

    // --- form binding -------------------------------------------------------

    /** Subscribe one component to the entry's config form. */
    function useForm(form) {
      const subscribe = useCallback((notify) => form.subscribe(notify), [form])
      const snapshot = useCallback(() => form.getSnapshot(), [form])
      return React.useSyncExternalStore(subscribe, snapshot)
    }

    /** A ticking clock, for live countdowns. */
    function useNow(intervalMs) {
      const [now, setNow] = useState(() => Date.now())
      useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs)
        return () => clearInterval(timer)
      }, [intervalMs])
      return now
    }

    /**
     * Ask the Host for one immediate read and keep the button honest.
     *
     * A write can be refused because the Host republished the config while the
     * click was in flight; retry once, then say so. "Sent" is not "updated":
     * the note is confirmed against the reading the page can actually see.
     */
    function useRefresh(form, send) {
      const t = useCopy()
      const [busy, setBusy] = useState(false)
      const [note, setNote] = useState(undefined)
      const timer = useRef(undefined)
      const alive = useRef(true)
      useEffect(() => () => {
        alive.current = false
        if (timer.current !== undefined) clearTimeout(timer.current)
      }, [])
      const run = useCallback(async () => {
        if (busy) return
        setBusy(true)
        setNote(undefined)
        let delivered = false
        let failure
        try {
          delivered = (await send()) !== false
          if (!delivered) {
            await sleep(350)
            delivered = (await send()) !== false
          }
        } catch (problem) {
          failure = messageOf(problem)
        }
        if (!delivered) {
          setNote(failure === undefined ? t.page.refreshRejected : failure)
          setBusy(false)
          return
        }
        const before = parseJson(form.getSnapshot().value?.quotaJson)?.asOf
        setNote(t.page.refreshPending)
        timer.current = setTimeout(() => {
          if (!alive.current) return
          const after = parseJson(form.getSnapshot().value?.quotaJson)?.asOf
          setNote(after === before ? t.page.refreshStuck : t.page.refreshed)
        }, 4000)
        setBusy(false)
      }, [busy, form, send])
      return { busy, note, run }
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

    // --- header meter measurement ------------------------------------------
    //
    // The host title row declares `container-type: inline-size`, and lays out
    // [title cluster][utilities][corner] with the utilities pinned right. The
    // meter lives inside the utilities; when the row shrinks (right sidebar,
    // extra header chips) the cluster can be squeezed until the chips spill
    // over the utilities. Rather than guess from the viewport, measure the
    // host-owned layout boxes and pick the widest meter level that still leaves
    // the cluster its room.
    //
    // Only host containers are measured by their bounding box; no other
    // plugin's component, class name, or internal DOM is inspected. Any
    // structural surprise falls back to the full layout.

    /** Nearest ancestor the host made a query container. */
    function findContainer(node) {
      let element = node.parentElement
      while (element !== null && element !== document.body) {
        let type
        try {
          type = getComputedStyle(element).containerType
        } catch {
          type = undefined
        }
        if (typeof type === 'string' && type !== '' && type !== 'normal') return element
        element = element.parentElement
      }
      return null
    }

    /** The ancestor of `node` that is a direct child of `row`. */
    function directChildOf(node, row) {
      if (row === null) return null
      let current = node
      while (current.parentElement !== null && current.parentElement !== row) current = current.parentElement
      return current.parentElement === row ? current : null
    }

    /** How many pixels the meter may occupy without stealing the cluster's room. */
    function measureAvailable(node) {
      const row = findContainer(node)
      if (row === null) return undefined
      const utils = directChildOf(node, row)
      if (utils === null) return undefined
      const rowStyle = getComputedStyle(row)
      if (rowStyle.display !== 'flex') return undefined
      const utilsRect = utils.getBoundingClientRect()
      const rootRect = node.getBoundingClientRect()
      const others = Math.max(0, utilsRect.width - rootRect.width)
      let actionsWidth = 0
      const cluster = row.firstElementChild
      if (cluster !== null && cluster !== utils && cluster.children.length > 1) {
        const actions = cluster.lastElementChild
        if (actions !== null) actionsWidth = actions.getBoundingClientRect().width
      }
      const corner = utils.nextElementSibling
      const cornerWidth = corner === null ? 0 : Math.max(0, corner.getBoundingClientRect().width - 8)
      const padding = (parseFloat(rowStyle.paddingLeft) || 0) + (parseFloat(rowStyle.paddingRight) || 0)
      const utilsStyle = getComputedStyle(utils)
      const marginLeft = parseFloat(utilsStyle.marginLeft) || 0
      const inner = row.clientWidth - padding
      const value = inner - actionsWidth - 10 - others - marginLeft - 8 - cornerWidth
      return Number.isFinite(value) ? Math.max(0, value) : undefined
    }

    /**
     * Observe the header layout and report the meter's available width.
     * @returns [callbackRef, availableWidth]
     */
    function useHeaderFit() {
      const [node, setNode] = useState(null)
      const [max, setMax] = useState(undefined)
      const ref = useCallback((element) => setNode(element), [])
      useLayoutEffect(() => {
        if (node === null) return undefined
        let frame = 0
        const measure = () => {
          const result = measureAvailable(node)
          setMax((previous) => (previous === result ? previous : result))
        }
        const schedule = () => {
          if (frame !== 0) return
          if (typeof requestAnimationFrame !== 'function') {
            measure()
            return
          }
          frame = requestAnimationFrame(() => {
            frame = 0
            measure()
          })
        }
        measure()
        if (typeof ResizeObserver === 'undefined') return undefined
        const observer = new ResizeObserver(schedule)
        const row = findContainer(node)
        if (row !== null) observer.observe(row)
        const utils = directChildOf(node, row)
        if (utils !== null) {
          observer.observe(utils)
          const cluster = row === null ? null : row.firstElementChild
          if (cluster !== null && cluster !== utils && cluster.children.length > 1) {
            const actions = cluster.lastElementChild
            if (actions !== null) observer.observe(actions)
          }
          const corner = utils.nextElementSibling
          if (corner !== null) observer.observe(corner)
        }
        return () => {
          if (frame !== 0 && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
          observer.disconnect()
        }
      }, [node])
      return [ref, max]
    }

    /** Widest level that fits the measured space. */
    function meterLevel(available) {
      if (available === undefined) return 'full'
      if (available >= METER_FULL_AT) return 'full'
      if (available >= METER_COMPACT_AT) return 'compact'
      if (available >= METER_MINI_AT) return 'mini'
      return 'hidden'
    }

    // --- primitives ---------------------------------------------------------

    function Button(props) {
      const className = 'odq-btn'
        + (props.variant === 'primary' ? ' odq-btn-primary' : '')
        + (props.wide === true ? ' odq-btn-wide' : '')
      return h('button', {
        type: 'button',
        className,
        disabled: props.disabled === true,
        title: props.title,
        onClick: props.onClick,
      }, props.children)
    }

    function CopyButton(props) {
      const t = useCopy()
      const [copied, setCopied] = useState(false)
      const timer = useRef(undefined)
      useEffect(() => () => {
        if (timer.current !== undefined) clearTimeout(timer.current)
      }, [])
      return h('button', {
        type: 'button',
        className: 'odq-btn odq-btn-small',
        onClick: async () => {
          const ok = await copyText(props.value)
          setCopied(ok)
          if (timer.current !== undefined) clearTimeout(timer.current)
          timer.current = setTimeout(() => setCopied(false), 1500)
        },
      }, copied ? t.common.copied : t.common.copy)
    }

    function Switch(props) {
      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': props.checked === true,
        'aria-label': props.label,
        className: 'odq-switch' + (props.checked === true ? ' odq-switch-on' : ''),
        onClick: () => props.onChange(!props.checked),
      }, h('span', { className: 'odq-switch-knob' }))
    }

    function PrefRow(props) {
      return h('div', { className: 'odq-pref' },
        h('div', { className: 'odq-pref-text' },
          h('div', { className: 'odq-pref-title' }, props.title),
          props.hint === undefined ? null : h('div', { className: 'odq-pref-hint' }, props.hint)),
        h(Switch, {
          checked: props.checked,
          label: props.title,
          onChange: props.onChange,
        }))
    }

    // --- header meter -------------------------------------------------------

    /** @param props - injected `form` and `onOpen`. */
    function Meter(props) {
      // The guard lives outside the hook-bearing component: a conditional hook
      // call would change the hook order the moment the form arrives.
      if (props.form === undefined) return null
      return h(MeterBody, props)
    }

    /** @param props - injected `form` and `onOpen`. */
    function MeterBody(props) {
      const snapshot = useForm(props.form)
      const t = useCopy()
      const [setRoot, available] = useHeaderFit()
      const value = snapshot.value instanceof Object ? snapshot.value : {}
      const enabled = value.enabled !== false
      const quota = parseJson(value.quotaJson)
      const windows = quota !== undefined && Array.isArray(quota.windows) ? quota.windows : []
      const usable = enabled
        && quota !== undefined
        && quota.status !== 'disabled'
        && quota.status !== 'unconfigured'
        && windows.length > 0
      if (!usable) return null

      const level = meterLevel(available)
      const stale = quota.status !== 'ok'
      const worst = worstOf(windows)
      const worstPct = worst === undefined ? undefined : worst.percentRemaining
      const tier = typeof quota.tier === 'string' ? cap(quota.tier) : ''
      const summary = summaryOf(windows)
      const at = clockOf(quota.asOf)
      const age = Date.now() - Date.parse(quota.asOf)
      const stalled = Number.isFinite(age) && age > 3 * 60_000
      const title = t.meter.title(tier, summary, at, stale) + (stalled ? ' · ' + t.meter.hostStalled : '')
      const aria = t.meter.aria(summary, at, stale)
      const compact = level === 'compact'
      const mini = level === 'mini'
      const hidden = level === 'hidden'

      return h(React.Fragment, null,
        h(StyleTag, { key: 'sheet' }),
        h('button', {
          key: 'meter',
          ref: setRoot,
          type: 'button',
          className: 'odq-meter',
          'data-level': level,
          'aria-label': aria,
          title,
          onClick: props.onOpen,
          style: hidden ? { display: 'none' } : { opacity: stale ? 0.6 : 1 },
        },
          tier !== '' && !compact && !mini
            ? h('span', { key: 'tier', className: 'odq-tier' }, tier)
            : null,
          mini
            ? h(React.Fragment, null,
              h('span', {
                key: 'dot',
                className: 'odq-dot',
                style: { background: meterColor(worstPct) },
              }),
              h('span', { key: 'pct', className: 'odq-mini-pct' }, pctText(worstPct)))
            : h('span', { key: 'rows', className: 'odq-rows' },
              windows.map((window) => h(MeterRow, {
                key: window.durationSeconds,
                window,
                compact,
              })))))
    }

    function MeterRow(props) {
      const window = props.window
      const pct = window.percentRemaining
      const width = pct === null || pct === undefined ? 0 : Math.max(0, Math.min(100, pct))
      return h('span', { className: 'odq-mrow' },
        h('span', { className: 'odq-mwin' }, compactLabel(window.durationSeconds)),
        h('span', { className: 'odq-mtrack' },
          h('span', {
            className: 'odq-mfill',
            style: { width: width + '%', background: meterColor(pct) },
          })),
        h('span', { className: 'odq-mpct' }, pctText(pct)))
    }

    // --- shared surfaces ----------------------------------------------------

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

    function StatusLine(props) {
      const t = useCopy()
      const quota = props.quota
      const parts = [
        typeof quota.email === 'string' && quota.email.length > 0 ? quota.email : undefined,
        typeof quota.tier === 'string' && quota.tier.length > 0 ? 'Design Plan ' + cap(quota.tier) : undefined,
      ].filter(Boolean)
      const color = props.fresh ? T.ok : T.warn
      const label = props.fresh ? t.status.connected : t.status.stale
      return h('div', { className: 'odq-status' },
        h('span', { className: 'odq-dot', style: { background: color } }),
        h('span', { className: 'odq-status-title' }, label),
        parts.length === 0 ? null : h('span', { className: 'odq-status-sub' }, parts.join(' · ')),
        props.failure !== undefined && props.failure !== null
          ? h('span', { className: 'odq-status-sub' }, ' · ' + props.failure.message)
          : null,
        h('span', { style: { flex: 1 } }),
        h('span', { className: 'odq-status-meta' }, t.page.readAt + clockOf(quota.asOf)))
    }

    function WindowCard(props) {
      const t = useCopy()
      const window = props.window
      const pct = window.percentRemaining
      const width = pct === null || pct === undefined ? 0 : Math.max(0, Math.min(100, pct))
      const left = money(window.remainingCredits, props.rate)
      const limit = money(window.limitCredits, props.rate)
      const reset = countdown(window.resetsAt, props.now, t)
      const valueText = pctText(pct)
      return h('div', { className: 'odq-card odq-fade' },
        h('div', { className: 'odq-card-head' },
          h('span', { className: 'odq-card-label' }, windowTitle(window.durationSeconds, t)),
          h('span', { className: 'odq-card-meta' }, reset)),
        h('div', { className: 'odq-card-value', style: { color: meterColor(pct) } }, valueText),
        h('div', {
          className: 'odq-card-track',
          role: 'progressbar',
          'aria-valuenow': width,
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-label': windowTitle(window.durationSeconds, t) + t.page.remaining,
          'aria-valuetext': valueText + '，' + reset,
        }, h('div', {
          className: 'odq-card-fill',
          style: { width: width + '%', background: meterColor(pct) },
        })),
        h('div', { className: 'odq-card-meta' },
          h('span', null, (left === undefined ? window.remainingCredits + ' credits' : left)
            + (limit === undefined ? '' : ' / ' + limit)),
          h('span', null, props.fresh ? '' : t.page.staleHint)))
    }

    function WalletCard(props) {
      const t = useCopy()
      const wallet = props.wallet
      const balance = money(wallet.balanceUsd, 1)
      return h('div', { className: 'odq-card odq-fade' },
        h('div', { className: 'odq-card-head' },
          h('span', { className: 'odq-card-label' }, t.page.wallet)),
        h('div', { className: 'odq-wallet' },
          h('span', { className: 'odq-wallet-value' }, t.page.balance + (balance === undefined ? '—' : balance)),
          h('span', { className: 'odq-wallet-meta' },
            typeof wallet.periodEnd === 'string'
              ? t.page.periodEnd + wallet.periodEnd.slice(0, 10)
              : '')))
    }

    function MiniWindow(props) {
      const window = props.window
      const pct = window.percentRemaining
      const width = pct === null || pct === undefined ? 0 : Math.max(0, Math.min(100, pct))
      return h('div', { className: 'odq-mini-row' },
        h('span', { className: 'odq-mini-label' }, compactLabel(window.durationSeconds)),
        h('span', { className: 'odq-mini-track' },
          h('span', {
            className: 'odq-mini-fill',
            style: { width: width + '%', background: meterColor(pct) },
          })),
        h('span', { className: 'odq-mini-pct' }, pctText(pct)))
    }

    function SkeletonCards() {
      return h('div', { className: 'odq-grid' },
        [0, 1].map((index) => h('div', { key: index, className: 'odq-card odq-fade' },
          h('div', { className: 'odq-skel odq-skel-line', style: { width: '38%' } }),
          h('div', { className: 'odq-skel', style: { width: '52%', height: 38, marginTop: 4 } }),
          h('div', { className: 'odq-skel', style: { width: '100%', height: 8, marginTop: 6 } }),
          h('div', { className: 'odq-skel odq-skel-line', style: { width: '64%', marginTop: 6 } }))))
    }

    // --- sign-in ------------------------------------------------------------

    /**
     * The signed-out surface: browser sign-in as the single loud action, the
     * manual key as a quieter section underneath the same border.
     */
    function SignInCard(props) {
      const t = useCopy()
      const login = props.login
      const [draft, setDraft] = useState('')
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState(undefined)

      const message = login !== undefined && login.status === 'error' ? login.message : undefined

      const submit = async () => {
        const key = draft.trim()
        if (key.startsWith('sk-amr')) {
          setError(t.signIn.modelKey)
          return
        }
        if (key.length < 16) {
          setError(t.signIn.tooShort)
          return
        }
        setBusy(true)
        setError(undefined)
        try {
          await props.saveKey(key, props.keyRef)
          setDraft('')
        } catch (problem) {
          setError(messageOf(problem))
        } finally {
          setBusy(false)
        }
      }

      return h('div', { className: 'odq-card odq-fade' },
        h('div', { className: 'odq-hero' },
          h('div', { className: 'odq-tile' }, h(GaugeIcon, { size: 32, tone: T.brand })),
          h('div', { className: 'odq-h2' }, message === undefined ? t.signIn.title : t.signIn.titleError),
          message === undefined
            ? null
            : h('div', {
              className: 'odq-p',
              style: { color: T.err },
            }, message),
          h('div', { className: 'odq-p' }, t.signIn.subtitle),
          h(Button, { variant: 'primary', wide: true, onClick: props.onRefresh }, t.signIn.login)),
        h('div', { className: 'odq-divider' }),
        h('div', { className: 'odq-manual' },
          h('div', { className: 'odq-h3' }, t.signIn.manual),
          h('div', { className: 'odq-p' }, t.signIn.manualHint),
          h('div', { className: 'odq-input-row' },
            h('input', {
              className: 'odq-input',
              type: 'password',
              placeholder: t.signIn.placeholder,
              value: draft,
              disabled: busy,
              onChange: (event) => setDraft(event.target.value),
              onKeyDown: (event) => { if (event.key === 'Enter') void submit() },
            }),
            h(Button, {
              disabled: busy || draft.trim().length === 0,
              onClick: () => { void submit() },
            }, busy ? t.signIn.saving : t.signIn.save)),
          error === undefined
            ? null
            : h('div', { className: 'odq-p', style: { color: T.err } }, error)))
    }

    /** The approval sheet with its countdown, code, and link. */
    function PendingCard(props) {
      const t = useCopy()
      const login = props.login
      const now = useNow(1000)
      const [blocked, setBlocked] = useState(false)
      const until = Date.parse(login.expiresAt)
      const since = Date.parse(login.issuedAt)
      const hasWindow = Number.isFinite(until)
      const left = hasWindow ? until - now : Number.NaN
      const span = Number.isFinite(since) && hasWindow && until > since ? until - since : 10 * 60 * 1000
      const ratio = Number.isFinite(left) ? Math.max(0, Math.min(1, left / span)) : 1
      const expired = Number.isFinite(left) && left <= 0
      const url = typeof login.activationUrl === 'string' ? login.activationUrl : undefined
      const code = login.userCode === undefined ? '—' : login.userCode

      return h('div', { className: 'odq-card odq-fade' },
        h('div', { className: 'odq-status' },
          h('span', {
            className: 'odq-dot',
            style: { background: expired ? T.err : T.warn },
          }),
          h('span', { className: 'odq-status-title' }, expired ? t.pending.expired : t.pending.waiting),
          h('span', { style: { flex: 1 } }),
          h('span', {
            className: 'odq-status-meta',
            style: { fontVariantNumeric: 'tabular-nums' },
          }, expired || !Number.isFinite(left)
            ? t.pending.expiredShort
            : t.pending.remaining + mmss(until))),
        h('div', { className: 'odq-progress' },
          h('div', {
            className: 'odq-progress-fill',
            style: {
              width: (ratio * 100) + '%',
              background: expired ? T.err : T.warn,
            },
          })),
        h('div', { className: 'odq-kv' },
          h('span', { className: 'odq-kv-label' }, t.pending.code),
          h('div', { className: 'odq-kv-body' },
            h('span', { className: 'odq-code' }, code),
            h(CopyButton, { value: code }))),
        h('div', { className: 'odq-kv' },
          h('span', { className: 'odq-kv-label' }, t.pending.link),
          h('div', { className: 'odq-kv-body' },
            h('span', { className: 'odq-link', title: url }, url === undefined ? '—' : url),
            url === undefined ? null : h(CopyButton, { value: url }))),
        h('div', { className: 'odq-note', style: { textAlign: 'right' } },
          blocked ? t.pending.blocked : t.pending.hint),
        h('div', { className: 'odq-actions' },
          h(Button, {
            // An expired code cannot be refreshed back to life: the button has
            // to ask for a new one, or the sheet keeps showing a dead code and
            // a link the vendor will refuse.
            onClick: expired ? props.onRestartLogin : props.onRefresh,
          }, expired ? t.pending.retry : t.pending.refresh),
          h(Button, {
            variant: 'primary',
            disabled: url === undefined,
            onClick: () => {
              if (url === undefined) return
              try {
                if (approvalWindow !== undefined) approvalWindow.close()
              } catch {
                // already gone
              }
              const opened = window.open(url, '_blank')
              setBlocked(opened === null || opened === undefined)
              // Keep the opener relationship: a window whose `opener` was
              // nulled is no longer script-closable in Chrome, and this one is
              // closed once the vendor page reports approval.
              approvalWindow = opened === null ? undefined : opened
            },
          }, t.pending.open)))
    }

    // --- sidebar page -------------------------------------------------------

    function PageShell(props) {
      return h('div', { className: 'odq-page' },
        h(StyleTag, { key: 'sheet' }),
        h('div', { className: 'odq-page-inner' }, props.children))
    }

    function QuotaPage(props) {
      const t = useCopy()
      if (props.form === undefined) {
        return h(PageShell, null,
          h('div', { className: 'odq-note' }, t.page.noForm))
      }
      return h(QuotaPageBody, props)
    }

    function QuotaPageBody(props) {
      const t = useCopy()
      const form = props.form
      const snapshot = useForm(form)
      const now = useNow(30_000)
      const value = snapshot.value instanceof Object ? snapshot.value : {}
      const quota = parseJson(value.quotaJson)
      const login = parseJson(value.loginJson)
      const windows = quota !== undefined && Array.isArray(quota.windows) ? quota.windows : []
      const enabled = value.enabled !== false
      const pending = login !== undefined && login.status === 'pending'
      const hasNumbers = windows.length > 0 && quota !== undefined && quota.status !== 'unconfigured'
      const fresh = hasNumbers && quota.status === 'ok'
      const scanning = quota === undefined && login === undefined
      const failure = quota === undefined ? undefined : quota.error
      const age = quota === undefined ? Number.NaN : now - Date.parse(quota.asOf)
      const hostStalled = enabled
        && hasNumbers
        && value.autoRefresh !== false
        && Number.isFinite(age)
        && age > 3 * 60_000
      const { busy, note, run } = useRefresh(form, props.onRefresh)
      const [reLoginBusy, setReLoginBusy] = useState(false)
      const [reLoginError, setReLoginError] = useState(undefined)
      const [writeNote, setWriteNote] = useState(undefined)

      const write = async (name, next) => {
        setWriteNote(undefined)
        let accepted = await form.set(name, next)
        if (accepted === false) {
          await sleep(300)
          accepted = await form.set(name, next)
        }
        if (accepted === false) setWriteNote(t.settings.writeFailed)
      }

      const doReLogin = async () => {
        setReLoginBusy(true)
        setReLoginError(undefined)
        try {
          await props.onReLogin()
        } catch (problem) {
          setReLoginError(messageOf(problem))
        } finally {
          setTimeout(() => setReLoginBusy(false), 1500)
        }
      }

      let content
      if (!enabled) {
        content = null
      } else if (pending) {
        content = h(PendingCard, {
          login,
          onRefresh: () => void run(),
          onRestartLogin: props.onRestartLogin,
        })
      } else if (scanning) {
        content = h(SkeletonCards, null)
      } else if (!hasNumbers) {
        content = h(SignInCard, {
          login,
          onRefresh: () => void run(),
          saveKey: props.saveKey,
          keyRef: typeof value.keyRef === 'string' && value.keyRef.length > 0 ? value.keyRef : DEFAULT_KEY_REF,
        })
      } else {
        content = h(React.Fragment, null,
          h(StatusLine, { quota, fresh, failure }),
          h('div', { className: 'odq-grid' },
            windows.map((window) => h(WindowCard, {
              key: window.durationSeconds,
              window,
              rate: quota.creditsPerUsd,
              now,
              fresh,
            }))),
          quota.wallet === undefined ? null : h(WalletCard, { wallet: quota.wallet }),
          h('div', { className: 'odq-footer' },
            h('span', { style: { flex: 1, minWidth: 0 } },
              t.page.readAt + clockOf(quota.asOf)
              + (quota.staleSince === undefined ? '' : t.page.lastSuccess(clockOf(quota.staleSince)))
              + (failure === undefined ? '' : ' · ' + failure.message)),
            h(Badge, null)))
      }

      return h(PageShell, null,
        h('header', { className: 'odq-page-head' },
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('h1', { className: 'odq-page-title' }, t.page.title),
            h('p', { className: 'odq-page-intro' }, t.page.intro)),
          enabled && hasNumbers && !pending
            ? h('div', { className: 'odq-page-actions' },
              h(Button, { onClick: () => void run(), disabled: busy }, busy ? t.page.refreshing : t.page.refresh),
              h(Button, { onClick: () => void doReLogin(), disabled: reLoginBusy }, reLoginBusy ? t.page.signingOut : t.page.relogin))
            : null),
        enabled
          ? null
          : h('div', { className: 'odq-alert odq-alert-warn' },
            h('span', { style: { flex: 1 } }, t.page.disabled),
            h(Button, { onClick: () => void write('enabled', true) }, t.page.enable)),
        hostStalled
          ? h('div', { className: 'odq-alert odq-alert-warn' }, t.page.hostStalled(Math.floor(age / 60000)))
          : null,
        content,
        note === undefined ? null : h('div', { className: 'odq-note' }, note),
        writeNote === undefined ? null : h('div', { className: 'odq-note' }, writeNote),
        reLoginError === undefined
          ? null
          : h('div', { className: 'odq-alert odq-alert-error' }, reLoginError))
    }

    // --- settings section ---------------------------------------------------

    function SettingsSection(props) {
      const t = useCopy()
      if (props.form === undefined) {
        return h('div', { style: { padding: 16, color: T.dim } }, t.page.noForm)
      }
      return h(SettingsBody, props)
    }

    function SettingsBody(props) {
      const t = useCopy()
      const form = props.form
      const snapshot = useForm(form)
      const now = useNow(30_000)
      const value = snapshot.value instanceof Object ? snapshot.value : {}
      const quota = parseJson(value.quotaJson)
      const login = parseJson(value.loginJson)
      const windows = quota !== undefined && Array.isArray(quota.windows) ? quota.windows : []
      const enabled = value.enabled !== false
      const autoRefresh = value.autoRefresh !== false
      const pending = login !== undefined && login.status === 'pending'
      const hasNumbers = windows.length > 0 && quota !== undefined && quota.status !== 'unconfigured'
      const fresh = hasNumbers && quota.status === 'ok'
      const failure = quota === undefined ? undefined : quota.error
      const age = quota === undefined ? Number.NaN : now - Date.parse(quota.asOf)
      const hostStalled = enabled
        && hasNumbers
        && autoRefresh
        && Number.isFinite(age)
        && age > 3 * 60_000
      const keyRef = typeof value.keyRef === 'string' && value.keyRef.length > 0 ? value.keyRef : DEFAULT_KEY_REF
      const { busy, note, run } = useRefresh(form, props.onRefresh)
      const [reLoginBusy, setReLoginBusy] = useState(false)
      const [reLoginError, setReLoginError] = useState(undefined)
      const [writeNote, setWriteNote] = useState(undefined)

      const write = async (name, next) => {
        setWriteNote(undefined)
        let accepted = await form.set(name, next)
        if (accepted === false) {
          await sleep(300)
          accepted = await form.set(name, next)
        }
        if (accepted === false) setWriteNote(t.settings.writeFailed)
      }

      const doReLogin = async () => {
        setReLoginBusy(true)
        setReLoginError(undefined)
        try {
          await props.onReLogin()
        } catch (problem) {
          setReLoginError(messageOf(problem))
        } finally {
          setTimeout(() => setReLoginBusy(false), 1500)
        }
      }

      const summary = hasNumbers
        ? h('div', { className: 'odq-card odq-fade' },
          h(StatusLine, { quota, fresh, failure }),
          h('div', { className: 'odq-mini-list' },
            windows.map((window) => h(MiniWindow, {
              key: window.durationSeconds,
              window,
            }))),
          failure === undefined || fresh
            ? null
            : h('div', { className: 'odq-note' }, failure.message),
          hostStalled
            ? h('div', { className: 'odq-alert odq-alert-warn' }, t.page.hostStalled(Math.floor(age / 60000)))
            : null,
          h('div', { className: 'odq-summary-actions' },
            h(Button, { onClick: () => void run(), disabled: busy }, busy ? t.page.refreshing : t.page.refresh),
            h(Button, {
              variant: 'primary',
              onClick: () => {
                try {
                  if (typeof props.close === 'function') props.close()
                } finally {
                  if (typeof props.onOpen === 'function') props.onOpen()
                }
              },
            }, t.settings.openPage)),
          h('div', { className: 'odq-read' }, t.page.readAt + clockOf(quota.asOf)))
        : null

      return h('div', { className: 'odq-settings' },
        h(StyleTag, { key: 'sheet' }),
        enabled ? null : h('div', { className: 'odq-alert odq-alert-warn' }, t.page.disabledShort),
        pending
          ? h(PendingCard, {
            login,
            onRefresh: () => void run(),
            onRestartLogin: props.onRestartLogin,
          })
          : hasNumbers
            ? summary
            : enabled
              ? h(SignInCard, {
                login,
                onRefresh: () => void run(),
                saveKey: props.saveKey,
                keyRef,
              })
              : null,
        note === undefined ? null : h('div', { className: 'odq-note' }, note),
        writeNote === undefined ? null : h('div', { className: 'odq-note' }, writeNote),
        reLoginError === undefined
          ? null
          : h('div', { className: 'odq-alert odq-alert-error' }, reLoginError),
        pending
          ? null
          : h('div', { className: 'odq-card' },
            h(PrefRow, {
              title: t.settings.autoRefresh,
              hint: t.settings.autoRefreshHint,
              checked: autoRefresh,
              onChange: (next) => void write('autoRefresh', next),
            }),
            h(PrefRow, {
              title: t.settings.enabled,
              hint: t.settings.enabledHint,
              checked: enabled,
              onChange: (next) => void write('enabled', next),
            })),
        hasNumbers && !pending
          ? h('div', { className: 'odq-actions', style: { justifyContent: 'space-between' } },
            h('span', { className: 'odq-read' },
              quota.wallet === undefined
                ? ''
                : t.page.balance + (money(quota.wallet.balanceUsd, 1) ?? '—')),
            h(Button, {
              onClick: () => void doReLogin(),
              disabled: reLoginBusy,
            }, reLoginBusy ? t.page.signingOut : t.page.relogin))
          : null,
        snapshot.writable === false
          ? h('div', { className: 'odq-note' }, t.page.unwritable)
          : null)
    }

    /** Sidebar glyph: the plugin's gauge, painted by the host row's colour. */
    function SidebarIcon(props) {
      const size = props.size === undefined ? 20 : props.size
      return h('span', { style: { display: 'inline-flex' } }, h(GaugeIcon, { size }))
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

        /**
         * Layout face used by the meter and the settings summary to open the
         * quota page. Optional: hosts without a main panel keep every other
         * surface working, and a missing service only means "click does
         * nothing".
         */
        let layout
        ctx.inject(['layout'], (scoped) => {
          layout = scoped.layout
        })

        /** Locale preference; every surface re-renders when it changes. */
        const localeNow = ctx.get('locale')
        if (localeNow !== undefined) localeFace = localeNow
        ctx.inject(['locale'], (scoped) => {
          localeFace = scoped.locale
        })

        const openPage = () => {
          try {
            if (layout !== undefined) layout.selectPanel(PANEL_ID)
          } catch (error) {
            console.warn('od-quota: could not open the quota panel', error)
          }
        }

        ctx.inject(['configForms'], (ready) => {
          const form = ready.configForms.get(ENTRY_ID)

          /**
           * Close the approval tab as soon as a successful reading lands. This
           * lives on the plugin root: the user usually approves after closing
           * the panel, and a component effect would never run in that state.
           */
          ready.effect(() => form.subscribe(() => {
            if (approvalWindow === undefined) return
            const value = form.getSnapshot().value
            const quota = parseJson(value === undefined ? undefined : value.quotaJson)
            if (quota === undefined || quota.status !== 'ok') return
            const opened = approvalWindow
            approvalWindow = undefined
            try { opened.close() } catch { /* blocked */ }
            setTimeout(() => {
              try { if (opened.closed !== true) opened.close() } catch { /* blocked */ }
            }, 800)
            try { window.focus() } catch { /* browsers may ignore focus */ }
          }))

          /** Store the pasted control-plane key; the Host picks it up from there. */
          const saveKey = async (key, ref) => {
            if (credentials === undefined) throw new Error(copyNow().errors.credentialsNotReady)
            const result = await credentials.set(typeof ref === 'string' && ref.length > 0 ? ref : DEFAULT_KEY_REF, key)
            if (result !== undefined && result.ok === false) {
              throw new Error(messageOf(result.error))
            }
          }

          /** Drop the stored key, which makes the Host offer a sign-in again. */
          const reLogin = async (ref) => {
            if (credentials === undefined) {
              throw new Error(copyNow().errors.credentialsUnavailable)
            }
            const target = typeof ref === 'string' && ref.length > 0 ? ref : DEFAULT_KEY_REF
            const result = await credentials.unset(target)
            if (result !== undefined && result.ok === false) {
              throw new Error(messageOf(result.error))
            }
            void form.set('refreshNonce', nextRefreshNonce())
          }

          /**
           * Ask the Host for one immediate read through the entry's nonce.
           * @returns whether the write was accepted.
           */
          const refresh = () => form.set('refreshNonce', nextRefreshNonce())

          /**
           * Ask the Host for a brand-new device code.
           * @returns whether the write was accepted.
           */
          const restartLogin = () => form.set('loginNonce', nextLoginNonce())

          const injected = () => ({
            form,
            saveKey,
            onRefresh: refresh,
            onRestartLogin: restartLogin,
            onReLogin: async () => { await reLogin(form.getSnapshot().value?.keyRef) },
            onOpen: openPage,
          })

          ready.effect(() => ready.slots.inject('settings.section', () => ready.slots.register({
            name: 'settings.section',
            id: ENTRY_ID,
            order: 60,
            label: () => copyNow().app.name,
            inject: injected,
          }, SettingsSection)))

          // The page is the primary surface: a sidebar icon selects a `main`
          // panel, exactly like the shipped Plugins and scheduled-task pages.
          ready.effect(() => ready.slots.inject('main', () => ready.slots.register({
            name: 'main',
            key: PANEL_ID,
            inject: injected,
          }, QuotaPage)))

          ready.effect(() => ready.slots.inject('sidebar.panellist', () => ready.slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 50,
            label: () => copyNow().app.name,
          }, SidebarIcon)))

          // `order: -20` keeps the meter leftmost inside the right-anchored
          // utilities: immediately left of the "open in app" arrow, and stable
          // when the title side changes. The meter now measures its own room
          // and degrades in place, so no fixed gap hack is needed.
          ready.effect(() => {
            try {
              return ready.slots.inject('conversation.session.header.utilities', () => ready.slots.register({
                name: 'conversation.session.header.utilities',
                id: ENTRY_ID + '-meter',
                order: -20,
                label: () => copyNow().app.name,
                inject: () => ({ form, onOpen: openPage }),
              }, Meter))
            } catch (error) {
              console.error('od-quota: could not register the header meter', error)
              return () => {}
            }
          })
        })
      },
    }

    /** Sidebar glyph: the plugin's gauge, painted by the host row's colour. */
    function SidebarIcon(props) {
      const size = props.size === undefined ? 20 : props.size
      return h('span', { style: { display: 'inline-flex' } }, h(GaugeIcon, { size }))
    }
  },
})
