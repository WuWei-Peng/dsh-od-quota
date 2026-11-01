# dsh-od-quota

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/WuWei-Peng/dsh-od-quota)](https://github.com/WuWei-Peng/dsh-od-quota/releases)

> 非官方插件：与 Open Design / Powerformer 无隶属关系，仅按公开接口读取你自己账号的额度。

在 DSH 里查看 **OpenDesign 订阅额度**：设置页完成浏览器登录并展示 5 小时 / 7 天窗口与钱包，会话标题栏右侧（「打开应用」箭头左边）常驻套餐标识与两条剩余额度进度条（绿 = 充足，黄 = 注意，红 = 快用完）。

## 它读什么

OpenDesign 云有两个平面，额度只在控制面：

| 平面 | Host | Key | 用途 |
| --- | --- | --- | --- |
| 控制面 | `amr-api.open-design.ai` | `vela_ctrl_…` | 套餐、钱包、5h/7d 额度窗口、workspace |
| 模型面 | `amr-link.open-design.ai/v1` | `sk-amr_…` | 推理 |

`sk-amr_…` **读不到额度**（控制面不接受它），所以插件走控制面。`vela_ctrl_…` 不在任何网页上，由 CLI 设备授权（`vela login` 同一套流程）签发——插件就是替你跑这套流程的。

## 安装

```sh
# 直接装仓库（无需发版）
dsh plugin --profile web add github:WuWei-Peng/dsh-od-quota

# 或装 GitHub Release 上的预构建包（更快，不需要构建环境）
dsh plugin --profile web add https://github.com/WuWei-Peng/dsh-od-quota/releases/latest/download/dsh-od-quota.tgz
```

装完重启一次 `dsh web`，设置侧栏出现「OpenDesign 额度」。

## 工作方式

1. 进入设置页时若没有 key，插件调用 `POST /api/v1/cli/device-authorizations` 生成批准链接与 6 位码；页面显示码、倒计时和可复制的链接。
2. 你在浏览器登录 OpenDesign 并批准，插件轮询到 `controlKey`，写进 DSH 凭据服务（引用名默认 `OPENDESIGN_CONTROL_KEY`，可改 `keyRef`）。
3. 之后每 60 秒读一次 `billing/preflight` + `billing/summary`，把结果写回本插件配置的 `quotaJson`；页面和标题栏都只解析这一份文档。
4. 手动刷新写 `refreshNonce`（时间戳 + 递增序号，连点两次也不会重样），宿主观测到变化立即重读；写入被拒绝时页面会明说并让你重试，而不是「点了没反应」。
5. 一个 15 秒的看门狗按**墙钟**核对上次读取时间：漏掉的 tick、卡住不返回的请求、被设置编辑器拒绝的一次写入，都会在下次看门狗时补上。

设备授权是主路径；也可以直接粘贴 `vela_ctrl_…`。粘贴 `sk-amr_…` 会被前端拒绝并说明原因。

## 失败时的行为

- **读失败但有过成功读数**：保留上一次数字，标记 `status: "stale"`，页面显示「数据已过期」+ 原因，胶囊降低不透明度；不会把「网络抖了一下」显示成「你没登录」。
- **从没有过读数**：显示未连接与具体失败原因，不显示 0%。
- **`enabled: false`**：不轮询，标题栏胶囊不渲染。
- **控制面 401**：自动发起一次重新登录，但每 5 分钟最多一次，避免把 60 秒轮询变成设备授权生成器。
- **退出登录**：清掉凭据后 Host 立刻发布 `unconfigured`，页面回到登录态、顶栏额度条消失，不会继续展示已失效的旧数字。

## 结构

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host：设备授权、额度读取、轮询、写回配置 |
| `client.js` | Client：设置页（`settings.section`）与标题栏胶囊（`conversation.session.header.utilities`） |
| `cordis.patch.yml` | 插入 `od-quota` 行及其默认配置 |
| `locale/*.json` | 插件管理页的标题与描述 |
| `icon.svg` | 插件图标 |

## 配置

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `enabled` | `true` | 关闭后不轮询、胶囊不渲染 |
| `keyRef` | `OPENDESIGN_CONTROL_KEY` | 控制面 key 的凭据引用名 |
| `workspaceId` | `''` | 留空则用 `/workspaces/current` 自动解析 |
| `autoRefresh` | `true` | 是否每 60 秒自动读 |
| `refreshNonce` | `''` | 页面刷新按钮写入 |
| `quotaJson` / `loginJson` | `''` | 插件写入的缓存，页面只读 |

## 已知限制

- 控制面接口是私有契约，字段变了只会在页面与日志里显示失败原因（日志只记字段名，不记数值），不会编造数字。
- 顶栏显示套餐标识（`Go` / `Plus` / `Pro` / `Max`）+ 两条 96×6 进度条，按剩余百分比着色：>50% 绿、20–50% 黄、≤20% 红；数据过期整块降不透明度，退出登录后整块消失。
- 金额按 `creditsPerUsd` 折算；接口不给汇率时用 10,000 credits = $1；小于 1 美分显示 `< $0.01`。
- 界面文案暂为中文硬编码（接入 client locale 服务是后续项）。
- 只支持单账号；多账号需要把 `keyRef` 改成列表。
- 设置页页脚内联了官方 `dsh-badge.png`（121×20，data URI），离线也能显示。

---

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
