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

## r15 补锚与裁决（2026-09-27）

| 英文 | 中文 | 边界 |
|---|---|---|
| Vault | 保险库 | 独立隔离数据存储（r13-Y3 批）；重命名保险库／切换 |
| chat model | 对话模型 | 代码生成默认模型语境（useChatPlaceholder） |
| App / mini app | 小程序 | docsTopics.apps／appBuilder／typeNames.application 三处一致 |
| image（类型／文档语境） | 图像 | 图像模型（defModels.mImage）／tab 类型 image=图像 |
| image（素材／文件语境） | 图片 | 素材筛选 typeFilters.image=图片／MIME 全系=图片 |

裁决：image 双译按语境分立（r15-Y2）——类型与文档语境用“图像”，素材与文件语境用“图片”；新增键先查本表语境再定译。
已知上游不一致：en 侧 “Nodetool API”（小写 t）与 “NodeTool” 品牌大小写并存（r15-G1，非本分支引入，zh 忠实镜像；上游修正后跟随）。
死键律（r14/r15）：词表键上线即须有接线——接线或删除二选一，CI 死键守卫强制；风格断言样本须用活键。

## 译文业务用语纪律(2026-09-30 用户令,适用于一切后续翻译)

1. **禁机械直译**:先查该业务域的中文行话,行话优先于字面(例:beat sync=卡点剪辑;commercial=广告片;worker=工作节点)。
2. **常用英文的业务词保留英文**:中文业界本身以英文使用的术语不译(F-23 红线清单+各域补充,如 a11y 场景的 aria/track;数据格式 JSON/CSV;模型名/厂牌名)。
3. **专门说法用专门说法**:有约定俗成中文的行业词汇必须用约定俗成版(渲染/美术域:冷压纸/湿画法/赛璐璐/次表面散射/焦外/色阶;影视域:黑位/边缘光/分镜/场记)。
4. **技术参数原样**:mm/px/f 值/T 值/位深等拍摄与显示参数保留原文数字形态。
5. **中英混排禁断词**:一句译文内禁留未处理的英文单词(技术参数除外)——出现即机翻痕迹,退回重写。

## r30a 术语总表与一致性矩阵(2026-10-10,机械层)

全量 (en→zh) 术语矩阵与标准译名总表已固化为机器可读产物 [terminology.json](terminology.json)(121 词条,含 variants_seen/分级/分域裁定;30b 起 LQA 修正以它为准绳)。冲突时后轮裁定赢。新锚要点(一词一行,详见总表条目):

- campaign=定向广告(marketing;弃 战役——残留 4 处待 30b;launch campaign 泛营销义=发布活动待裁)
- campaign hero=主视觉;brief=简报;commercial=广告片;approved claims=可用宣传点
- remix=重混;relight=重打光(弃 重新打光);lip sync=对口型;upscale=超分(放大 留给缩放动作)
- outpaint=扩图(音频域=音频外扩);inpaint=局部重绘;remove background=去背景
- transcribe=语音转文字(任务)/转写(动词);transcript=转写(弃 转录);caption 按域=字幕/说明/图像描述
- shot=镜头、storyboard=分镜(板)、shot list=分镜表、take=条、speaker=说话人、edit point=剪辑点
- matte=遮罩(时间线)、mask=蒙版(图像域)、clip=片段、trim=修剪(媒体)/裁剪(图像)/截断(文本)
- director(noun)=Director 保留/direct(verb)=执导;b-roll=B-roll 保留;worker=工作节点
- extend=延长(时间线)/扩展(选区);render=渲染(时间线/3D)/生成(生成义);dialogue 按域=对话/对白/台词
- provider 违例 提供商(约 21 处)、collections 违例 收藏集(3 处)、asset 违例 资产(4 处)——30b 修正清单见总表 note 字段

## r32 增量锚(2026-10-11,英文动作按钮清查轮)

12 条新锚已录入 [terminology.json](terminology.json)(分域 note 标边界):

| 英文 | 中文 | 边界 |
|---|---|---|
| Bar / Beat(音乐) | 小节 / 拍 | 拍号网格选项与读数;与 editor:ui.bars 同锚 |
| registry(包管理) | 注册表 | npm 式惯例 |
| included(包管理) | 内置 | 与技能列表 内置(Built in)同词 |
| Documentation(页头链接) | 文档 | 管理器页头外部文档按钮 |
| Browse(包管理) | 浏览 | 侧栏分组标题 |
| expand/collapse(展开收起) | 展开 / 折叠 | disclosure 域;与 editing 域 expand=扩展(选区/边框)分立,禁互串 |
| Custom(预设尾项) | 自定义 | 轨道乐器预设下拉 |
| favorite / unfavorite | 收藏 / 取消收藏 | 添加收藏=Add to favorites |
| Attach files | 附加文件 | 与 bug 报告附加文件一致 |
| Play / Pause(媒体) | 播放 / 暂停 | TC(时间码)保留拉丁 |
| Today / Yesterday(分组) | 今天 / 昨天 | N 天前走 relTime.dayAgo 复数系 |
