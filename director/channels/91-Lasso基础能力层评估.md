# 91 · Lasso 基础能力层评估(浏览器驱动渠道的底层,2026-09-25)

> 问题:部分渠道**不是 MCP/CLI/REST**,而是"免费锁 UI"的网页(A 类:Gemini 网页/通义万相 UI/krea 免费线…),唯一通路=驱动真实浏览器。**是否把 Lasso 纳入本导演台的基础能力层?**

## 1. 需求实态(哪些能力只有浏览器层能给)

| 渠道 | 差集价值 | 现状 |
|---|---|---|
| Gemini 网页(CH-009) | Omni/Veo 3.1 系=质量档天花板;NB2 免费档图 | media-gen-mcp 已实现(gemini-web.ts),**未启用**(需 CDP 登录态) |
| flow(CH-010) | — | L3 死域,仅契约存档 |
| 豆包网页(CH-021) | — | NO(火山 API 完胜) |
| 通义万相 UI/krea 免费线等 A 类 | 免费量 | 均被价格/条款否决或降位 |

**结论:当前真实需求高度收敛于 Gemini 网页一条通路**(其余 A 类已被登记册逐一否决)。需求真实但窄。

## 2. 候选方案对比

| 方案 | 描述 | 优劣 |
|---|---|---|
| A. Lasso 全量纳入(渠道 adapter 经 Lasso MCP 调用) | 每次生成经 MCP 链 | ❌ 每调用一跳 MCP 延迟+复杂度;Lasso 面向 CC 会话设计非服务端长驻;过度耦合 |
| **B. Lasso 作"浏览器舰队管理层"+adapter 直连 CDP(推荐)** | Lasso 只负责 `launch-chrome`(端口/profile/登录态生命周期);渠道 adapter **直接说 CDP**(http 127.0.0.1:port/json/list + WebSocket)——media-gen-mcp 的 gemini-web.ts/flow.ts 正是这个形态 | ✅ 零运行时依赖:adapter 不经 Lasso,浏览器死了 Lasso 只管重启;登录态/端口管理用成熟件;CC 侧继续用 Lasso 做管理操作(doctor/status) |
| C. NodeTool 内置 browser 包自建 | packages/browser+browser_* CDP 工具 | ❌ 面向工作流网页自动化(无头+无持久登录态档案),非渠道驱动设计;登录态管理要从零造 |
| D. 不做 | 放弃 Gemini 网页 | 损失 Veo 质量档;但非核心阻塞 |

## 3. 方案 B 的落地形态

```
[管理层] lasso launch-chrome --port 9225 --profile gemini   ← 登录一次,长驻
              (CC 侧/手动触发;doctor 巡检;Windows 机同装 lasso+npm 跨平台)
                     ↓ 只提供:一个带登录态的 CDP 端口
[执行层] packages/mediagen-nodes/src/channels/gemini/
            src/channels/gemini/adapter.ts ——直连 127.0.0.1:9225 CDP(已按 92 终版落地)
            (S303 单会话串行;blob 即时抓取;配额面板读数=预算闸输入)
```

- **解耦保证**:adapter 对 Lasso 零 import;Lasso 消失/换vernutlich 任何能起带登录 Chrome 的工具都不影响执行层。
- **Windows 机**:lasso-mcp 是跨平台 npm;渠道 Chrome 的登录态在 Windows 重建一次(profile 迁移不跨机,合规起见重登)。
- **风险与纪律**(继承 media-gen-mcp 先例):ToS 灰色=单账号自用+验证码触发即停;Google 自动化检测加强期 CDP 真浏览器路线风险最低但非零;IP 须在可用区(比 flow 的 L3 死域轻一个量级,回区即恢复);**配额治理**:5h 滚动窗消耗经预算闸建模(MEDIAGEN_DAILY_LIMIT_GEMINI)。

## 4. 裁决建议

**纳入——但定位是"浏览器基础设施管理层",不是渠道运行时。**

1. 立即:无(当前无浏览器渠道在跑;Gemini 通路待 90 优化榜 P3 排期)。
2. 触发条件:决定接 Gemini 网页(90 P3)时,同轮落地:Windows/Mac 各起一个 gemini profile Chrome(lasso 管理)+ 移植 gemini-web adapter(2-3 天)。
3. 边界:未来任何新的 A 类渠道评估通过时,默认走同一形态(adapter 直连 CDP + lasso 管舰队),**永不**把 Lasso MCP 调用链嵌进 adapter。

## 5. 可靠性证据基(08/09 两轮事故档案)

两份 lasso 阻塞项文档(08-豆包轮/09-lovart轮)记录了评估期 lasso 自身的三起阻塞:**-1** browse_logged_in 调用期连接错误(绕过=E-1 自动发现)、**-2** 长命 MCP server 不重读 config(LASSO_CDP_PORT 改了不生效)、**-3** 运行中 server 载旧 dist(须用户侧重连才恢复)。**关键判读:三起事故全部落在 `browse_*` 调用路径;`launch-chrome`/端口/profile 登录态生命周期在两轮实测中均正常**——这恰好支持方案 B 的窄依赖面(只用 launch-chrome,不经 browse_*)。运维注意:长命 server 载旧码的 -3 型问题意味着 lasso 升级后要 `/mcp` 重连;但舰队管理层即便整个重启也不影响执行层(adapter 直连 CDP 端口,Chrome 不动就不断)。

## 6. 与既有资产的关系

- **media-gen-mcp**:其 gemini-web.ts/flow.ts CDP 层(MIT)是 adapter 移植源;渠道工厂飞轮的 S2 实探也依赖 lasso——保持 media-gen-mcp 侧不动,本仓只移植代码。
- **NodeTool 内置 browser 节点**:继续服务"工作流内网页自动化"场景(与渠道驱动正交),不承担渠道登录态。

## 7. AMEND(92 对抗终版轮,2026-09-25):idle-reaper 修正 + 平台分化

92 轮对抗审查在方案 B 落地前抓出一个 RED:**lasso launch-chrome 的 idle-reaper 会杀渠道 Chrome**——
server 侧 `LASSO_LAUNCH_IDLE_MS` 缺省极短(默认 60s,显式 `--idle-ms` 也只是延长),且存在 24h 硬上限
(`--idle-ms 0` 之外仍有 hard cap)。渠道 Chrome 必须长驻(登录态就是资产),被 reaper 回收 = S100 全渠道熔断。
§5 的"launch-chrome 生命周期正常"结论只覆盖了两轮评估的短窗实测,**未覆盖长驻场景**——此为本次修正的判据。

修正后的运维口径(已固化进 92 方案与 adapter 错误提示 LAUNCH_HINT):

- **Mac**:`lasso launch-chrome --port 9225 --profile gemini --idle-ms 0 --no-hard-cap`
  (`--idle-ms 0` = 永不 idle-reap;`--no-hard-cap` = 解除 24h 硬上限)。
  外部 CDP 消费方定期 `touch ~/.cache/lasso/chrome-touch-9225`(mtime 即活性信号)双保险。
- **Windows**:**不装 lasso**。裸起 `chrome --remote-debugging-port=9225 --user-data-dir=<专用目录>`
  (deploy-windows.md §5),无 reaper 概念,任务计划程序或手工常驻均可。
- 执行层结论不变:adapter 直连 `127.0.0.1:9225` CDP,对 lasso 零 import;lasso 整个消失不影响执行层。
