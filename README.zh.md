[English](README.md) | **中文**

# dsh-od-quota

[![npm](https://img.shields.io/npm/v/dsh-od-quota)](https://www.npmjs.com/package/dsh-od-quota)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/WuWei-Peng/dsh-od-quota)](https://github.com/WuWei-Peng/dsh-od-quota/releases)

> 非官方插件：与 Open Design / Powerformer 无隶属关系，仅按公开接口读取你自己账号的额度。

在 DSH 里查看 **OpenDesign 订阅额度**。三个界面共读同一份读数：

| 界面 | 位置 | 作用 |
| --- | --- | --- |
| 额度页 | 左栏「OpenDesign 额度」图标 → 中央整页 | 5 小时 / 7 天窗口、钱包、登录与批准 |
| 设置摘要 | 设置侧栏「OpenDesign 额度」 | 状态、两条迷你额度条、刷新 / 打开额度页、自动刷新与顶栏开关 |
| 顶栏额度条 | 会话标题栏右侧（「打开应用」箭头左边） | 套餐 + 两条剩余额度条；宽度不够时自动降级；点击打开额度页 |

额度条按剩余百分比着色（绿 = 充足，黄 = 注意，红 = 快用完），数据过期时降透明度并在提示里说明。

## 它读什么

OpenDesign 云有两个平面，额度只在控制面：

| 平面 | Host | Key | 用途 |
| --- | --- | --- | --- |
| 控制面 | `amr-api.open-design.ai` | `vela_ctrl_…` | 套餐、钱包、5h/7d 额度窗口、workspace |
| 模型面 | `amr-link.open-design.ai/v1` | `sk-amr_…` | 推理 |

`sk-amr_…` **读不到额度**（控制面不接受它），所以插件走控制面。`vela_ctrl_…` 不在任何网页上，由 CLI 设备授权（`vela login` 同一套流程）签发——插件就是替你跑这套流程的。

## 安装

```sh
# npm（推荐，也是插件市场走的路径）
dsh plugin --profile web add dsh-od-quota

# 或直接装仓库
dsh plugin --profile web add github:WuWei-Peng/dsh-od-quota

# 或装 GitHub Release 上的预构建包（不经过 npm，适合内网/镜像受限）
dsh plugin --profile web add https://github.com/WuWei-Peng/dsh-od-quota/releases/latest/download/dsh-od-quota.tgz
```

装完重启一次 `dsh web`，左栏出现「OpenDesign 额度」图标，设置页同时提供一个摘要入口。

## 工作方式

1. 进入额度页或设置摘要时若没有 key，插件调用 `POST /api/v1/cli/device-authorizations` 生成批准链接与 6 位码；页面显示码、倒计时和可复制的链接。
2. 你在浏览器登录 OpenDesign 并批准，插件轮询到 `controlKey`，写进 DSH 凭据服务（引用名默认 `OPENDESIGN_CONTROL_KEY`，可改 `keyRef`）。
3. 之后每 60 秒读一次 `billing/preflight` + `billing/summary`，把结果写回本插件配置的 `quotaJson`；额度页、设置摘要和顶栏都只解析这一份文档。
4. 手动刷新写 `refreshNonce`（时间戳 + 递增序号，连点两次也不会重样），宿主观测到变化立即重读；写入被拒绝时页面会明说并让你重试，而不是「点了没反应」。
5. 一个 15 秒的看门狗按**墙钟**核对上次读取时间：漏掉的 tick、卡住不返回的请求、被设置编辑器拒绝的一次写入，都会在下次看门狗时补上。

设备授权是主路径；也可以直接粘贴 `vela_ctrl_…`。粘贴 `sk-amr_…` 会被前端拒绝并说明原因。

## 界面细节

- **额度页**：整页滚动，内容居中 960px。两张大卡（5 小时 / 7 天）显示大号百分比、8px 进度条、剩余 / 上限金额与重置倒计时；钱包单独一张卡；页脚是读取时间与 `powered by dsh` 徽标。倒计时每 30 秒走动。
- **设置摘要**：状态行 + 两条迷你额度条 + 刷新 / 打开额度页；下面两个开关映射已有配置项：`autoRefresh`（每 60 秒自动读）与 `enabled`（读取 + 顶栏显示）。
- **顶栏额度条**：28px 高、无外边框、悬停背景，和头部图标按钮同一套尺寸与 token。宽度由宿主标题栏的实际剩余空间决定，四级降级：完整（套餐 + 两条 44px 条）→ 紧凑（无套餐 + 26px 条）→ 极简（状态点 + 最差百分比）→ 隐藏；点击整块打开额度页。
- **配色与明暗**：只使用 `--dsw-alias-*` / `--dsw-radius-*` / `--dsw-focus-ring-*` 等宿主 token，深色 / 浅色自动跟随。
- **中英双语**：界面文案跟随 DSH 的语言设置（设置 → 通用 → 语言）；文案集中在 `client.js` 的 `COPY` 表，其他语言回退到英文。

## 失败时的行为

- **读失败但有过成功读数**：保留上一次数字，标记 `status: "stale"`，页面显示「数据已过期」+ 原因，额度条降低不透明度；不会把「网络抖了一下」显示成「你没登录」。
- **从没有过读数**：显示未连接与具体失败原因，不显示 0%。
- **`enabled: false`**：不轮询，顶栏额度条不渲染，额度页显示停用提示与「启用」按钮。
- **请求卡住（连接黑洞住，既不返回也不报错）**：每个请求除了 `AbortSignal` 还有一层外部截止时间，一次卡死最多拖住一轮；超过 2 个请求超时仍未返回的读数会被看门狗丢弃重开，后续刷新不会 join 到一个永不 resolve 的 promise。
- **控制面返回 502/503/504/520–524**：同一次调用内部会重试，最多 6 次、累计约 7.5 秒退避，并且总耗时不超过两个单次截止时间——保证重试中的读请求不会活过调度它的那一轮轮询。2026-11-11 实测：源站有 15–25% 的请求返回 `503 database_unavailable`，而同一时刻 `billing/summary` 是 20/20；失败响应带 Cloudflare 头，`curl` 同样能复现，所以是对方源站问题，不是本机网络或代理。**受影响最大的是登录**，因为发起设备授权是一次性 POST、没有第二次机会：加重试前 15/20，加重试后 20/20。
- **520 是实机测出来的，不是看代码想出来的**：一次真实运行直接报出 `发起登录失败（HTTP 520）`，随后 40 次采样得到 29 次成功、10 次 503、1 次 520（返回的是 Cloudflare 错误页而非 JSON）。只照着已见过的失败码写清单会漏掉它，所以 520–524 一并重试。
- **写入被拒不会把读数饿死**：看门狗原先每轮重试未发布的读数并 `return`，于是只要 profile 持续拒绝写入，数字就不再更新——而网络其实是好的。现在连续 3 轮未送达后会转去正常读一次，而不是永远阻塞。
- **批准码过期**：面板按钮变成「重新发起」，通过独立的 `loginNonce` 让 Host 去取一个新的设备码，而不是只刷新额度、把死码和被拒绝的链接留在屏幕上。
- **控制面 401**：自动发起一次重新登录，但每 5 分钟最多一次，避免把 60 秒轮询变成设备授权生成器。
- **退出登录**：清掉凭据后 Host 立刻发布 `unconfigured`，页面回到登录态、顶栏额度条消失，不会继续展示已失效的旧数字。
- **宿主不再更新读数**：超过 3 分钟没有新读数时，页面和设置摘要会提示「宿主可能没有在轮询」，顶栏 tooltip 也会注明。常见原因是运行中改动安装目录/配置让 Host 半被卸载；重启 `dsh web` 恢复。设置写入本身有 8 秒截止时间，一次卡住的写入不会再把轮询永久挂起。

## 结构

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host：设备授权、额度读取、轮询、写回配置 |
| `client.js` | Client：额度页（`main`）、左栏图标（`sidebar.panellist`）、设置摘要（`settings.section`）、顶栏额度条（`conversation.session.header.utilities`） |
| `cordis.patch.yml` | 插入 `od-quota` 行及其默认配置 |
| `locale/*.json` | 插件管理页的标题与描述 |
| `icon.svg` | 插件图标 |

## 配置

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 关闭后不轮询、额度条与页面不渲染 |
| `keyRef` | `OPENDESIGN_CONTROL_KEY` | 控制面 key 的凭据引用名 |
| `workspaceId` | `''` | 留空则用 `/workspaces/current` 自动解析 |
| `autoRefresh` | `true` | 是否每 60 秒自动读 |
| `refreshNonce` | `''` | 页面刷新按钮写入 |
| `quotaJson` / `loginJson` | `''` | 插件写入的缓存，页面只读 |

## 反馈

- GitHub Issues：https://github.com/WuWei-Peng/dsh-od-quota/issues
- 邮箱：18728030920@163.com

## 已知限制

- 控制面接口是私有契约，字段变了只会在页面与日志里显示失败原因（日志只记字段名，不记数值），不会编造数字。
- 顶栏额度条的宽度测量依赖宿主标题栏的布局容器（`container-type` + 标题区 / 工具区两个盒子）；宿主结构变化时会退回完整布局，不会崩溃，但可能不如预期紧凑。
- 金额按 `creditsPerUsd` 折算；接口不给汇率时用 10,000 credits = $1；小于 1 美分显示 `< $0.01`。
- 界面文案集中在 `client.js` 的 `COPY` 表，中英双语跟随宿主语言；尚未注册到 Client locale 命名空间，第三方语言包不会提供额外翻译（回退英文）。
- 只支持单账号；多账号需要把 `keyRef` 改成列表。
- 设置页页脚内联了官方 `dsh-badge.png`（121×20，data URI），离线也能显示。

---

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
