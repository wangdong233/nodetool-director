# zh-CN 术语表

单串改词必先过此表;与 [terminology.json](terminology.json)(机器可读总表,机械锚)
配合使用——冲突时以 terminology.json 的最新裁定为准,并把新裁定回写过去。

| 英文 | 中文 | 弃用 | 边界 |
|---|---|---|---|
| Workflow | 工作流 | 流程 | 完整画布文档 |
| Node | 节点 | — | 画布处理单元 |
| Canvas | 画布 | — | 节点编辑区 |
| Asset | 素材 | 资产 | assets 面板=素材库 |
| Job | 任务 | 作业 | 一次异步执行 |
| Provider | 模型服务商 | 提供商/供应商 | 下拉可简写"服务商",首现全称 |
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
| Run | 运行 | 执行 | 运行历史=运行记录;节点级 execute(一次执行全部节点)仍用"执行" |
| Inspector | 属性面板 | 检查器 | |
| Job logs | 任务日志 | — | |
| Environment | 环境变量 | 环境 | settings 语境 |
| Autosave | 自动保存 | — | |
| Collections | 知识库 | 收藏集/合集 | RAG 文档集(Coze/Dify/FastGPT 同名) |
| Entities | 实体库 | 实体 | rail 三库节奏(素材库/知识库/实体库) |
| Packages | 包管理器 | 扩展/插件 | 运行时+节点包,技术面保守 |
| Version | 版本 | — | 版本历史 |
| agent Task | 计划任务 | 子任务/待办 | 与 Job=任务分立 |

## 补充裁定

| 英文 | 中文 | 边界 |
|---|---|---|
| drag | 拖动 | 弃"拖拽";selectNodesOnDrag=拖动时选中节点 |
| Token(API token) | 令牌 | 与 API 密钥(key)分立 |
| Stable | 稳定版 | 更新渠道 |
| Nightly | Nightly(保留专名) | 渠道专名保留拉丁,与"稳定版"并列表述(Firefox Nightly/VS Code Insiders 惯例) |
| box-select | 框选 | 框选节点/绘制选框框选 |
| system tray | 系统托盘 | 后台运行说明 |
| account(登录关联义) | 账号 | 已连接账号(第三方服务关联);鉴权/账户体系义用"账户"——两语境分立 |
| flow(引导式) | 流程 | guided-flow=引导流程;flow≠workflow |
| Vault | 保险库 | 独立隔离数据存储 |
| chat model | 对话模型 | 代码生成默认模型语境 |
| App / mini app | 小程序 | docsTopics.apps/appBuilder/typeNames.application 一致 |
| image(类型/文档语境) | 图像 | 图像模型/tab 类型 |
| image(素材/文件语境) | 图片 | 素材筛选/MIME 全系 |
| Bar / Beat(音乐) | 小节 / 拍 | 拍号网格选项与读数 |
| registry(包管理) | 注册表 | npm 式惯例 |
| included(包管理) | 内置 | 与技能列表"内置"(Built in)同词 |
| Documentation(页头链接) | 文档 | 管理器页头外部文档按钮 |
| Browse(包管理) | 浏览 | 侧栏分组标题 |
| expand/collapse(disclosure) | 展开 / 折叠 | 与 editing 域 expand=扩展(选区/边框)分立,禁互串 |
| Custom(预设尾项) | 自定义 | 轨道乐器预设下拉 |
| favorite / unfavorite | 收藏 / 取消收藏 | 添加收藏=Add to favorites |
| Attach files | 附加文件 | 与 bug 报告附加文件一致 |
| Play / Pause(媒体) | 播放 / 暂停 | TC(时间码)保留拉丁 |
| Today / Yesterday(分组) | 今天 / 昨天 | N 天前走 relTime.dayAgo 复数系 |

image 双译按语境分立:类型与文档语境用"图像",素材与文件语境用"图片"。
已知上游不一致:en 侧 "Nodetool API"(小写 t)与 "NodeTool" 品牌大小写并存,
zh 忠实镜像,上游修正后跟随。

死键律:词表键上线即须有接线——接线或删除二选一,CI 死键守卫强制;
风格断言样本须用活键。

微件规范:动词不加"请";进行中态带"…"(全角省略号);标点全角;
Duplicate=创建副本(保"复制"给 Copy);Loading=加载中…(大陆用"加载"不用"载入")。

## 译文业务用语纪律(常设)

1. **禁机械直译**:先查该业务域的中文行话,行话优先于字面(例:beat sync=卡点剪辑;
   commercial=广告片;worker=工作节点)。
2. **常用英文的业务词保留英文**:中文业界本身以英文使用的术语不译(F-23 红线清单
   +各域补充,如 a11y 场景的 aria/track;数据格式 JSON/CSV;模型名/厂牌名)。
3. **专门说法用专门说法**:有约定俗成中文的行业词汇必须用约定俗成版(渲染/美术域:
   冷压纸/湿画法/赛璐璐/次表面散射/焦外/色阶;影视域:黑位/边缘光/分镜/场记)。
4. **技术参数原样**:mm/px/f 值/T 值/位深等拍摄与显示参数保留原文数字形态。
5. **中英混排禁断词**:一句译文内禁留未处理的英文单词(技术参数除外)——出现即
   机翻痕迹,退回重写。

## 机器可读总表

全量 (en→zh) 裁定、分级(A/B/C)、分域与 variants_seen 记录在
[terminology.json](terminology.json),由契约测试守护;LQA 修正与新增裁定
一律回写到该文件。分域要点(一词一行,详界见总表条目):

- campaign=定向广告(marketing);launch campaign 泛营销义=发布活动
- campaign hero=主视觉;brief=简报;commercial=广告片;approved claims=可用宣传点
- remix=重混;relight=重打光;lip sync=对口型;upscale=超分(放大 留给缩放动作)
- outpaint=扩图(音频域=音频外扩);inpaint=局部重绘;remove background=去背景
- transcribe=语音转文字(任务)/转写(动词);transcript=转写;caption 按域=字幕/说明/图像描述
- shot=镜头、storyboard=分镜(板)、shot list=分镜表、take=条、speaker=说话人、edit point=剪辑点
- matte=遮罩(时间线)、mask=蒙版(图像域)、clip=片段、trim=修剪(音频)/裁剪(视频)/截断(文本)
- director(noun)=Director 保留/direct(verb)=执导;b-roll=B-roll 保留;worker=工作节点
- extend=延长(时间线)/扩展(选区);render=渲染(时间线/3D)/生成(生成义);dialogue 按域=对话/对白/台词
- Script 文档=剧本;JS Script=脚本;tutorial=教程
