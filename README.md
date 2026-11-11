**English** | [中文](README.zh.md)

# dsh-od-quota

[![npm](https://img.shields.io/npm/v/dsh-od-quota)](https://www.npmjs.com/package/dsh-od-quota)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/WuWei-Peng/dsh-od-quota)](https://github.com/WuWei-Peng/dsh-od-quota/releases)

> Unofficial plugin: not affiliated with Open Design / Powerformer. It only reads your own account's allowance through the public control-plane endpoints.

OpenDesign subscription quota inside DSH. Three surfaces read the same reading:

| Surface | Where | What it does |
| --- | --- | --- |
| Quota page | Left sidebar "OpenDesign Quota" icon → full center page | 5-hour / 7-day windows, wallet, sign-in and approval |
| Settings summary | Settings sidebar "OpenDesign Quota" | Status, two mini bars, refresh / open page, auto-refresh and header toggles |
| Header meter | Session title bar, right of the title (left of the "Open in app" arrow) | Plan + two remaining bars; degrades when the row is tight; click to open the page |

The bars are coloured by remaining percentage (green = plenty, amber = watch, red = nearly dry); stale data is dimmed and explained in the tooltip.

## What it reads

OpenDesign cloud has two planes; quota lives on the control plane:

| Plane | Host | Key | Use |
| --- | --- | --- | --- |
| Control | `amr-api.open-design.ai` | `vela_ctrl_…` | plan, wallet, 5h/7d windows, workspace |
| Model | `amr-link.open-design.ai/v1` | `sk-amr_…` | inference |

`sk-amr_…` **cannot read quota** (the control plane refuses it), so the plugin uses the control plane. `vela_ctrl_…` is not printed on any page; it is issued by the CLI device-authorization flow (the same flow as `vela login`) — the plugin runs that flow for you.

## Install

```sh
# npm (recommended; also the path the plugin market uses)
dsh plugin --profile web add dsh-od-quota

# or straight from the repository
dsh plugin --profile web add github:WuWei-Peng/dsh-od-quota

# or the prebuilt package from the GitHub Release (no npm; for restricted networks/mirrors)
dsh plugin --profile web add https://github.com/WuWei-Peng/dsh-od-quota/releases/latest/download/dsh-od-quota.tgz
```

Restart `dsh web` once after installing. The left sidebar then shows an "OpenDesign Quota" icon, and Settings gets a summary entry.

## How it works

1. When the quota page or the settings summary opens without a key, the plugin calls `POST /api/v1/cli/device-authorizations` and gets an approval link plus a 6-character code; the page shows the code, a countdown, and a copyable link.
2. You sign in to OpenDesign in the browser and approve; the plugin polls out the `controlKey` and stores it in the DSH credential service (reference name `OPENDESIGN_CONTROL_KEY` by default; change it with `keyRef`).
3. After that it reads `billing/preflight` + `billing/summary` once every 60 seconds and writes the result into this plugin's `quotaJson`; the page, the settings summary and the header meter all parse only that document.
4. A manual refresh writes `refreshNonce` (a timestamp plus a sequence number, so two clicks never collide); the Host notices the change and reads immediately. A refused write is reported with a retry hint instead of a button that appears to do nothing.
5. A 15-second watchdog checks the last read against the **wall clock**: a missed tick, a request that never returns, or a write the settings editor refused is all repaired on the next pass.

Device authorization is the primary path; pasting `vela_ctrl_…` directly also works. Pasting `sk-amr_…` is rejected by the UI with an explanation.

## UI details

- **Quota page**: full-height scrolling page, content centred at 960px. Two large cards (5-hour / 7-day) show a big percentage, an 8px bar, remaining / limit money, and a reset countdown; the wallet gets its own card; the footer shows the read time and the `powered by dsh` badge. Countdowns tick every 30 seconds.
- **Settings summary**: a status row, two mini bars, refresh / open page, and two switches for existing config fields: `autoRefresh` (read every 60 s) and `enabled` (reading + header meter).
- **Header meter**: 28px tall, borderless, hover background — the same size and tokens as the header icon buttons. Its width is chosen from the space the host title row actually leaves: full (plan + two 44px bars) → compact (no plan + 26px bars) → mini (state dot + worst percentage) → hidden. Clicking it opens the quota page.
- **Colour and theme**: only `--dsw-alias-*` / `--dsw-radius-*` / `--dsw-focus-ring-*` host tokens; light/dark follow automatically.
- **Bilingual**: copy follows DSH's language setting (Settings → General → Language); strings live in the `COPY` table in `client.js`; other language packs fall back to English.

## When things fail

- **A read fails but a previous reading exists**: the last numbers stay, marked `status: "stale"`; the page shows "Data is stale" plus the reason and the meter is dimmed. A network blip is never reported as "you are signed out".
- **No reading has ever succeeded**: the page shows "not connected" and the concrete failure, not 0%.
- **`enabled: false`**: no polling; the header meter does not render; the quota page shows a disabled notice and an Enable button.
- **A request hangs (connection black hole, neither returns nor errors)**: every request has an outside deadline in addition to its `AbortSignal`, so one hang costs at most one round; a reading still pending after two timeouts is abandoned and restarted, and later refreshes never join a promise that will never resolve.
- **The control plane answers 502/503/504/520–524**: the request is retried inside the call — up to 6 attempts, ~7.5 s of backoff, and never longer than two per-attempt deadlines in total, so a retrying read cannot outlive the poll that scheduled it. Measured on 2026-11-11, the origin was returning `503 database_unavailable` on 15–25 % of requests while `billing/summary` stayed at 20/20; the failures carry Cloudflare headers and `curl` reproduces them, so they are the vendor's origin, not this machine. **Sign-in is the surface that suffered most**, because starting a device authorization is a single POST with no second chance: 15/20 successes before the retry, 20/20 after.
- **A Cloudflare 520 was found by real testing, not by reading code**: one live run surfaced `发起登录失败（HTTP 520）`, and a 40-sample follow-up returned 29 successes, 10 × 503 and 1 × 520 (a Cloudflare error page, not JSON). Codes drawn from the visible failures alone would have missed it, so 520–524 are retried too.
- **A refused settings write cannot starve the read**: the watchdog used to retry an unpublished reading on every pass and `return` each time, so while the profile kept refusing writes the numbers stopped updating even though the network was fine. After three passes it now falls through to the read instead of blocking it forever.
- **An approval code expired**: the sheet's button becomes "Start over" and asks the Host for a fresh device code (its own `loginNonce`), rather than refreshing a quota read and leaving a dead code and a refused link on screen.
- **Control plane 401**: one automatic re-sign-in, at most once per 5 minutes, so the 60-second poll does not become a device-authorization generator.
- **Sign out**: the credential is removed, the Host publishes `unconfigured` at once, the page returns to the sign-in state, and the header meter disappears — no stale numbers are left behind.
- **The Host stops refreshing**: after 3 minutes without a new reading, the page and settings summary say "the host may not be polling", and the header tooltip repeats it. The usual cause is an edit to the installed directory/config while the process was running, which unloads the Host half; restart `dsh web` to recover. Settings writes themselves have an 8-second deadline, so one wedged write can no longer freeze polling forever.

## Layout

| File | Purpose |
| --- | --- |
| `index.js` | Host: device authorization, quota reads, polling, writing back config |
| `client.js` | Client: quota page (`main`), sidebar icon (`sidebar.panellist`), settings summary (`settings.section`), header meter (`conversation.session.header.utilities`) |
| `cordis.patch.yml` | Inserts the `od-quota` row and its defaults |
| `locale/*.json` | Plugin-manager title and description |
| `icon.svg` | Plugin icon |

## Configuration

| Field | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | When off: no polling, no meter, no page |
| `keyRef` | `OPENDESIGN_CONTROL_KEY` | Credential reference holding the control-plane key |
| `workspaceId` | `''` | Empty resolves via `/workspaces/current` |
| `autoRefresh` | `true` | Read once every 60 seconds |
| `refreshNonce` | `''` | Written by the page's refresh button |
| `quotaJson` / `loginJson` | `''` | Plugin-written cache; the page only reads |

## Feedback

- GitHub Issues: https://github.com/WuWei-Peng/dsh-od-quota/issues
- Email: 18728030920@163.com

## Known limitations

- The control-plane API is a private contract. If its fields change, the page and logs show the failure (logs record field names, not values); the plugin never invents numbers.
- The header meter's width measurement relies on the host title row's layout containers (`container-type` plus the title cluster / utilities boxes). If the host changes that structure, the meter falls back to the full layout — it will not crash, but it may be less compact than intended.
- Money uses `creditsPerUsd`; when the API omits the rate, 10,000 credits = $1; amounts below one cent show `< $0.01`.
- Copy lives in the `COPY` table in `client.js` and is bilingual following the host language; it is not registered in the Client locale namespace, so third-party language packs fall back to English.
- Single account only; multiple accounts would need `keyRef` to become a list.
- The settings footer inlines the official `dsh-badge.png` (121×20, data URI) so it renders offline.

---

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
