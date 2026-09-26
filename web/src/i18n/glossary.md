# zh-CN 术语表(单串改词必先过此表;润色飞轮的锚)

来源:director/93 §3(v2 + 润色 R1 定稿;用户授权按对抗推荐自主定夺)。

| 英文 | 中文 | 弃用 | 边界 |
|---|---|---|---|
| Workflow | 工作流 | 流程 | 完整画布文档 |
| Node | 节点 | — | 画布处理单元 |
| Canvas | 画布 | — | 节点编辑区 |
| Asset | 素材 | 资产 | assets 面板=素材库 |
| Job | 任务 | 作业 | 一次异步执行 |
| Provider | 模型服务商 | 服务商 | 下拉可简写"服务商",首现全称 |
| API Key | API 密钥 | — | provider 凭据字段 |
| Secret | 密钥 | — | secrets 存储(与 API 密钥分立) |
| Generation(动作) | 生成 | — | 按钮动词 |
| Generation(记录) | 生成记录 | — | 列表名词 |
| Credits(Studio) | 额度 | 积分 | 月度授予;BYOK 成本=按提供商价格 |
| Credits(提供商侧) | 随提供商官方(可灵=积分) | — | |
| Timeline | 时间线 | 时间轴 | |
| Storyboard | 分镜 | 故事板 | |
| Sketch | 图稿 | 草图/画板 | 图像文档 |
| Prompt | 提示词 | 指令 | |
| Run | 运行 | 执行 | 运行历史=运行记录 |
| Inspector | 属性面板 | 检查器 | |
| Job logs | 任务日志 | — | |
| Environment | 环境变量 | 环境 | settings 语境 |
| Autosave | 自动保存 | — | |
| Collections | 知识库 | 收藏集/合集 | RAG 文档集(Coze/Dify/FastGPT 同名);润色 R1 定 |
| Entities | 实体库 | 实体 | rail 三库节奏(素材库/知识库/实体库);组件 EntityLibrary;R7 裁定 |
| Packages | 包管理器 | 扩展/插件 | 运行时+节点包;技术面保守(润色 R1 定夺)|
| Version | 版本 | — | 版本历史 |
| agent Task | 计划任务 | 子任务/待办 | 与 Job=任务分立 |

微件规范:动词不加"请";进行中态带"…"(全角省略号);标点全角;Duplicate=创建副本(保"复制"给 Copy);Loading=加载中…(大陆用"加载"不用"载入")。

## 覆盖扩展批术语定夺（r12 审查回填，2026-09-26；r13 校正）

| 英文 | 中文 | 边界 |
|---|---|---|
| drag | 拖动 | 统一旧译“拖拽”→“拖动”（r12-B3 多数裁定；r13 抓回 descSnapToGrid 漏网）；selectNodesOnDrag=拖动时选中节点 |
| Run（execute 工作流义） | 运行 | glossary 原锚重申：工作流级 execute 译“运行”；节点级 execute（一次执行全部节点）仍用“执行” |
| Token（API token） | 令牌 | 与 API 密钥（key）分立；复制令牌／妥善保管 |
| Stable | 稳定版 | 更新渠道 |
| Nightly | Nightly（保留专名） | 渠道专名保留拉丁，与“稳定版”并列表述（业界惯例：Firefox Nightly／VS Code Insiders）；每夜构建=nightly build 的指称词 |
| box-select | 框选 | 框选节点／绘制选框框选 |
| system tray | 系统托盘 | 后台运行说明 |
| account（登录关联义） | 账号 | connected accounts=已连接账号（第三方服务关联）；鉴权／账户体系义用“账户”（API token 验证你的账户）——两语境分立非双译（r13-G2） |
| flow（引导式） | 流程 | guided-flow=引导流程；flow≠workflow，不与“工作流”互撞（r13-G3） |
| 标点 | 全角 | zh 一切用户可见串的 ，：；（） 用全角（微件规范重申；r12-B1 修 12 串含 nav.openDocument，r13 校正计数） |
