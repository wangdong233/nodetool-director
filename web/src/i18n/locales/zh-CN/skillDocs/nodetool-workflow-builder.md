# 构建 NodeTool 工作流

创建或编辑一个把指定输入变成所需输出的工作流。保留所请求变更之外的既有节点与连接。

## 图只是多种表面之一

NodeTool 持有多种文档类型,其中大多数并不是图。当用户明确要图、当任务需要换新输入重跑、或当结果必须能从 API 调用时,才构建图。其余情况转交对应的技能。

| 交付物 | 技能 |
|---|---|
| 一部成片、一组静帧或一场定向广告 | `storyboard-core`,由它挑选任务技能 |
| 一个给人点的界面 | `nodetool-app-builder` |
| 对已剪素材的修复: 抠图、超分、对口型、生成声音 | `nodetool-video-post` |
| 时间线上的剪辑、标题、转场或动画 | `motion-graphics` 系统技能,经 `load_skill` 加载 |
| 用 JavaScript 而非节点表达的逻辑 | `nodetool-js-scripting` |
| 分层图像、蒙版或叠加层 | `nodetool-sketch` |
| 3D 模型或场景 | `nodetool-3d-scene` |
| 面向批次的可复用视频模板 | `video-workflow` |
| 一种新节点类型 | `nodetool-custom-node-developer` |

工作流仍可能与上述某项并存且是正确答案: 小程序靠运行工作流干活,时间线片段也可以由工作流产出。

使用用户指定的创作表面。可见画布优先用可用的 UI 工具,已保存的图用无头工作流工具,用户要工作流文件时用 JSON 或 TypeScript DSL。不要声称一个不存在的工具可调用。以实时 schema 与注册表作为标识符的唯一来源。

## 构建并验证

1. 先检视既有图再动手编辑。从请求与既有上下文识别必需的输入、输出与行为。
2. 用 `include_properties=true` 和 `include_outputs=true` 搜索所需的节点类型。同一类型已取回的元数据直接复用。通过可用的模型搜索工具发现模型选项。不要凭空捏造节点类型、属性、句柄或模型标识符。
3. 新增或更新节点,设置必需属性,连接兼容的句柄。编辑时保留既有布局与标识符。使用某个工具、流式模式或 DSL 操作之前,先读下方**图创作参考**中的对应小节。
4. 按场景用 `ui_get_graph` 或 `validate_workflow` 验证。修掉错误与必需输入警告。在声称创建或修改成功之前读回已保存的图。报告任何遗留的限制。
5. 仅当请求中包含运行时才执行。遵守生成预算与工具权限。执行后报告工作流标识符、输入、验证结果与真实运行结果。

某个节点不可用时,放宽搜索并检查受支持的替代项。若等效组合能保住所请求的行为,就继续用它。否则说明缺失的能力,并且只问选择替代方案所必需的那一个决定。图的其余部分继续独立推进。

## 图创作参考

只读当前操作用得上的小节。实时注册表元数据与工具 schema 才是权威。目录条目与 DSL 示例只是搜索线索,不能证明某个节点或参数在本安装中存在。

## 工具参考

| 工具 | 用途 | 关键参数 |
|------|---------|-----------|
| `ui_search_nodes` | 查找节点类型 | `query`、`include_properties=true`、`include_outputs=true`、`limit` |
| `ui_search_models` | 为模型属性查找模型 | `query`、`type`(如 `language_model`) |
| `ui_add_node` | 添加单个节点 | `id`、`position`、`type`(用搜索返回的 `node_type`) |
| `ui_graph` | 宿主暴露时批量加节点+边 | `nodes[]`、`edges[]` |
| `ui_connect_nodes` | 连接两个节点 | `source_id`、`source_handle`、`target_id`、`target_handle` |
| `ui_update_node_data` | 设置节点属性 / 同步模式 | `node_id`、`data={properties: {…}, sync_mode: "on_all"}` |
| `ui_get_graph` | 读图 + 验证 | 返回节点、边与验证结果 |
| `ui_delete_node` | 删除节点 | `node_id` |
| `ui_delete_edge` | 删除连接 | `edge_id` |
| `ui_move_node` | 移动节点位置 | `node_id`、`position` |
| `ui_set_node_title` | 重命名节点 | `node_id`、`title` |
| `ui_open_workflow` | 打开工作流标签页 | `workflow_id` |
| `ui_run_workflow` | 运行工作流 | `workflow_id`、`params` |

> 节点的 `sync_mode` 通过 `ui_update_node_data` 设置(`data.sync_mode`)——没有专门的同步模式工具。

### 节点数据字段

使用 `ui_add_node` 或 `ui_graph` 时,`data` 对象支持:
- `properties` —— 节点专属的输入值(来自元数据)
- `dynamic_outputs` —— Agent 节点的工具输出: `{"tool_name": {"type": "str"}}`
- `dynamic_properties` —— 运行时可配置的属性(通常为 `{}`)
- `sync_mode` —— `"on_any"`(默认,任一输入到达即触发)或 `"on_all"`(等齐全部输入)

## 节点目录

### 核心命名空间

| 命名空间 | 关键节点 | 用途 |
|-----------|-----------|---------|
| `nodetool.agents` | Agent、ResearchAgent、Summarizer、Extractor、Classifier、Decision | LLM 驱动的处理 |
| `nodetool.text` | Concat、Join、Replace、Template、Split、Regex、Compare、Slugify | 文本操作 |
| `nodetool.code` | Code(内建 lodash、dayjs、cheerio、csvParse、validator 的 JS 沙箱) | 用 JavaScript 写自定义逻辑 |
| `nodetool.data` | Filter、Schema、GroupBy、Sort | Dataframe 操作 |
| `nodetool.image` | Load、Save、Resize、Crop、Rotate、Composite | 图像处理 |
| `nodetool.audio` | Load、Mix、Encode | 音频处理 |
| `nodetool.video` | Load、Extract、Metadata、Frames | 视频处理 |
| `nodetool.control` | If、ForEach、Collect、Switch、Loop | 控制流 |
| `nodetool.constant` | String、Integer、Float、Bool、Image、Audio | 常量值 |
| `nodetool.input` | FloatInput、StringInput、ImageInput、ChatInput | 工作流参数 |
| `nodetool.output` | Output、Preview | 结果与调试 |
| `nodetool.generators` | ListGenerator、DataGenerator、ChartGenerator | LLM 支持的生成器 |

### 库命名空间(`lib.*`)

`lib.pdf`(把页面栅格化为图像)、`lib.http`(网络请求)、`lib.sqlite`(数据库路径)、`lib.browser`(截图)、`lib.os`(文件系统)、`lib.svg`(矢量图形)、`lib.charts`(图表)

> **注意:** `lib.json`、`lib.math`、`lib.uuid`、`nodetool.boolean`、`nodetool.dictionary`、`nodetool.numbers` 以及全部 `skills.*` 节点已移除——JSON/数学/uuid 逻辑改用**Code 节点**(`nodetool.code.Code`)及其内建代码片段库。(`lib.http` 与 `nodetool.list` 的 `Range`、`RepeatEach`、`RepeatValue`、`Tile` 仍在;日期时间现在是 `lib.datetime`。)

### 外部服务命名空间

| 命名空间 | 用途 |
|-----------|---------|
| `kie.image.*` | 图像生成服务(Flux、SDXL 等) |
| `kie.video.*` | 视频生成服务(Kling、Hailuo、Sora 等) |
| `kie.audio.*` | 音频生成服务 |
| `openai.*` | GPT、GPT-Image、embeddings、TTS |
| `gemini.*` | Google Gemini 模型 |
| `mistral.*` | Mistral 模型 |
| `vector.*` | 向量库节点(默认 SQLite-vec;可选 Chroma/Pinecone/Supabase 后端) |

### 数据类型

- **基本类型**: `str`、`int`、`float`、`bool`、`list`、`dict`、`any`
- **素材**: `{type: "image|audio|video|document", uri: "..."}`
- **模型**: `language_model`、`image_model`、`video_model`、`embedding_model`、`tts_model`

边会强制类型兼容。灵活连接用 `any` 类型。

### 搜索策略

- 用宽泛的类别词配 `limit=20` 看全所有选项。
- 多词查询会被拆开独立计分——`"dataframe group aggregate"` 能找出多个相关节点。
- 用 `input_type` / `output_type` 过滤: `"str"`、`"int"`、`"float"`、`"image"`、`"audio"`、`"list"` 等。
- 没有结果时,放宽查询或改试命名空间前缀(如 `"nodetool.text"`)。
- 类型转换: dataframe→数组走 `"to_numpy"`,list→单项走迭代器,单项→list 走收集器。

## 工作流模式

### 模式 1: 简单流水线
**形态**: 输入 → 变换(若干) → 输出
**适用于**: 单源处理、数据转换、图像增强。
**示例**: ImageInput → Sharpen → AutoContrast → Output

### 模式 2: Agent 驱动生成
**形态**: 输入 → Agent → 后处理 → 输出
**适用于**: 创意生成、多模态变换(图像→文本→音频)、语义理解。
**关键节点**: Agent(通用 LLM)、Summarizer(文本摘要)、ListGenerator(流式产出条目)

### 模式 3: 带预览的流式
**形态**: 多路输入 → Agent(出策略) → ListGenerator → 处理 → 各阶段挂 Preview 节点
**适用于**: 需要让用户看到进度的复杂多阶段生成。
**关键概念**: 在中间阶段挂 Preview 节点,便于调试与监视。

### 模式 4: RAG(检索增强生成)
**形态**: ChatInput → vector.HybridSearch + FormatText → Agent → Output
**适用于**: 面向文档的问答、需要特定来源支撑的事实准确性。
**建索引流**: nodetool.code.Code(`workspace.list`) → LoadDocumentFile → nodetool.text.Chunk → vector.IndexTextChunk
**查询流**: ChatInput → vector.HybridSearch → FormatText → Agent → Output
**注意**: RAG 节点统一在 `vector.*` 这一个命名空间下(如 `vector.QueryText`、`vector.HybridSearch`、`vector.IndexTextChunk`);不存在 `vector.chroma.*`/`vector.faiss.*`。

### 模式 5: 数据库持久化
**形态**: 输入 → FormatText → DataGenerator → Insert → Query → Preview
**适用于**: 持久存储、带记忆的小程序、Agent 历史。
**关键节点**: CreateTable、Insert、Query、Update、Delete(lib.sqlite 命名空间)

### 模式 6: 邮件与网络集成
**形态**: GmailSearch → EmailFields → Summarizer → Preview
**适用于**: 邮件处理、RSS 监控、网页内容抽取。
**关键节点**: GmailSearch、EmailFields、FetchRSSFeed、GetRequest

### 模式 7: 实时处理
**形态**: RealtimeAudioInput → RealtimeAgent → Preview
**适用于**: 语音界面、实时转写、交互式音频。
**关键节点**: RealtimeAudioInput、RealtimeAgent、RealtimeWhisper

### 模式 8: 多模态工作流
**形态**: 任意模态进 → 变换 → 目标模态出
**常见链路**: 音频→文本→图像、图像→文本→音频、视频→音频→文本→摘要

### 模式 9: 高级图像处理
**形态**: ImageInput → 边缘检测/描述 → ControlNet 生成 → Output
**适用于**: 风格迁移、受控生成、保结构的变换。
**关键手法**: ControlNet(结构)、ImageToText(描述)、Img2Img(风格)

### 模式 10: 数据处理流水线
**形态**: GetRequest → ImportCSV → Filter → ChartGenerator → Preview
**适用于**: 拉取外部数据、变换数据集、自动生成可视化。

> **视频/图像生成节点在 `kie.video.*`、`kie.image.*`、`kie.audio.*` 之下**(如
> `kie.video.Kling26TextToVideo`、`kie.video.Hailuo02TextToVideoPro`)。具体的模型节点
> 随服务商上新而变动——永远用 `ui_search_nodes` 查当前节点类型,不要凭记忆敲名字。

### 模式 11: 文生视频
**形态**: StringInput(提示词) → `kie.video.*` 文生视频节点 → Output
**找节点**: 搜 `"text to video"`(Kling、Hailuo、Sora、Wan、Bytedance 家族)
**配置**: 时长 5-10s、分辨率 768P(快)或 1080P(画质)、宽高比 16:9/9:16/1:1

### 模式 12: 图生视频
**形态**: ImageInput + StringInput(运动引导) → `kie.video.*` 图生视频节点 → Output
**找节点**: 搜 `"image to video"`

### 模式 13: 会说话的数字人
**形态**: ImageInput(人脸) + AudioInput(语音) → 数字人生成节点 → Output
**找节点**: 搜 `"avatar"` 或 `"lip sync"`

### 模式 14: 视频增强
**形态**: VideoInput → 超分节点 → Output
**找节点**: 搜 `"upscale"` / `"video enhance"`(如 Topaz 家族)

### 模式 15: 分镜转视频
**形态**: StringInput(故事) + ImageInputs(场景) → 分镜视频节点 → Output
**适用于**: 由关键帧生成叙事视频、场景转场。

### Agent 工具模式
任何节点都能通过 `dynamic_outputs` 变成 Agent 的工具:
1. 在 Agent 上设置 `dynamic_outputs`: `{"search": {"type": "str"}}`
2. 把下游节点接到 Agent 的动态输出句柄上(`sourceHandle: "search"`)
3. Agent 调用该工具 → 子图执行 → 结果返回 Agent
4. Agent 的常规输出(`text`、`chunk`)接到 Preview/Output 节点

### 流式架构
- 一切皆流;单个值就是只有一项的流。
- 用 `nodetool.control.Collect` 把流收拢成列表。
- 用 `nodetool.control.ForEach` 逐项处理列表。
- 用 `nodetool.control.Loop` 重复图的一部分: 把 `value` 接进循环体,循环体的结果接回
  `next`,再把一个布尔值接进 `condition`(为真则继续循环)。`max_iterations` 封顶,
  `done` 携带最终值。这是闭环的唯一方式。DSL 表达不了回边,所以建循环要用图工具或
  工作流 JSON。
- 该由模型拍板时用 `nodetool.agents.Decision`: `prompt` 是一个是非问题,`value`
  是它评判的对象(图像会展示给模型),`decision` 是布尔结果,`if_true`/`if_false`
  像 `If` 一样路由 `value`。把 `decision` 接进 `Loop.condition` 就能循环到模型满意
  为止;措辞时让"是"意味着"再循环一次"。
- 用 `Preview` 节点检视中间的流式结果。
- `sync_mode: "on_any"` 每来一个值就触发;`"on_all"` 等齐全部输入。

## 调试与验证

### 读懂验证结果
`ui_get_graph` 返回一个 `validation` 字段:
- `errors` —— 阻断性问题(循环依赖、非法节点类型)
- `warnings` —— 非阻断(必需输入未连接、必需属性为空)
- `suggestions` —— 改进建议(孤儿节点)

构建之后检查验证。修掉阻断错误与妨碍所请求行为的警告。剩余警告解释清楚即可,不要顺势扩大任务。

### 常见错误与修法
- **"Required property 'X' is not set"** → 用 `ui_update_node_data` 设置。常见: `model`、`prompt`。
- **"Required input 'X' not connected"** → 加一条边,或通过属性设默认值。
- **句柄名不对** → 重新跑 `ui_search_nodes`(带 `include_outputs=true`)拿准确名字。
- **类型不匹配** → 对照搜索结果核实源输出类型与目标输入类型一致。
- **找不到节点** → 放宽查询,试命名空间前缀(`"nodetool.text"`)。

### 错误恢复
1. 仔细读错误信息。
2. 带 `include_properties=true` 和 `include_outputs=true` 重新搜索。
3. 从新鲜搜索结果核实准确的属性名与句柄名。
4. 不要原样重试失败调用——先调整参数。

### 必需属性
加完节点后,检查必需属性为空的警告:
- **Agent 节点**: `model`(language_model 类型)——必须设置
- **生成器节点**: `model`、`prompt`
- **图像生成**: `prompt`
- **ForEach**: 需要一个列表输入连接

用 `ui_update_node_data` 设置,或问用户该用哪个值。

## 从 CLI 运行工作流

### JSON 工作流
```bash
# Run a JSON workflow file
nodetool workflows run ./workflow.json
nodetool workflows run ./workflow.json --params '{"input": "hello"}'
nodetool workflows run ./workflow.json --json

# Alternative runner with more options, from a NodeTool checkout
npm run workflow -- ./workflow.json --input text='hello' --show-messages
```

### TypeScript DSL 工作流
```bash
# Run a DSL file (builds graph and executes)
nodetool workflows run ./workflow.ts --json

# Or via the workflow runner, from a NodeTool checkout
npm run workflow -- ./workflow.ts

# Execute directly with tsx (prints workflow JSON only, does not run)
npx tsx ./workflow.ts
```

### 服务器管理
```bash
nodetool serve                    # Start backend server
nodetool serve --port 8080        # Custom port
nodetool workflows list           # List saved workflows
nodetool workflows get <id>       # Get workflow details
nodetool jobs list                # List execution jobs
nodetool secrets store OPENAI_API_KEY  # Store API key
```

## TypeScript DSL 格式

用 `@nodetool-ai/dsl` 把工作流写成 TypeScript,享受完整类型安全与 IDE 自动补全。

### 基本模式
```typescript
import { workflow, constant, text, agents } from "@nodetool-ai/dsl";

// Create nodes — call node.output() to get a connectable handle.
const greeting = constant.string({ value: "hello world" });

// Connect by passing output handles as inputs.
const shout = text.toUppercase({ text: greeting.output() });
const summary = agents.summarizer({ text: shout.output() });

// Build the workflow graph (traces all connections).
const wf = workflow(summary);
console.log(JSON.stringify(wf));
```

### 关键概念
- **`node.output()`** 是函数——调用它拿到默认输出句柄。它不是属性(不是 `node.output`)。
- **具名槽位**: `node.output("if_true")` 取多输出节点的某个指定输出。
- **可连接**: 每个输入既接受字面值,也接受输出句柄。
- **`workflow(...terminals)`**: 从终端节点做 BFS 回溯,返回可序列化 JSON `{ nodes, edges }`。
- **`run(wf, opts?)`**: 经 WorkflowRunner 在进程内运行工作流;返回结果。
- **`runGraph(...terminals)`**: 简写——`run(workflow(...terminals))`。

### DSL 命名空间
命名空间与节点命名空间一一对应。常用的:

| 导入 | 示例 |
|--------|---------|
| `constant` | `constant.float({ value: 5 })`、`constant.string({ value: "x" })` |
| `text` | `text.toUppercase({ text: "hi" })`、`text.split({ ... })` |
| `image` | `image.resize({ ... })` |
| `control` | `control.if_({ condition: true, value: x })`、`control.forEach({ ... })` |
| `agents` | `agents.agent({ ... })`、`agents.summarizer({ text })` |
| `data` | `data.filter({ ... })` |
| `vector` | `vector.hybridSearch({ ... })` |
| `libHttp` | `libHttp.getJSON({ url })`、`libHttp.getText({ url })` |
| `code` | `code.code({ ... })` —— 做数学/JSON/列表逻辑的 JS 沙箱 |

> 没有 `libMath`,也没有 `list` 命名空间。算术/JSON/列表操作用 **Code 节点**(`code.code`)。

### 多输出(If / ForEach)
```typescript
import { control } from "@nodetool-ai/dsl";

const branch = control.if_({ condition: true, value: "hello" });
branch.output("if_true");   // → output handle for the true branch
branch.output("if_false");  // → output handle for the false branch
```

### 共享依赖(菱形)
```typescript
import { workflow, constant, text } from "@nodetool-ai/dsl";

const shared = constant.string({ value: "abc" });
const upper = text.toUppercase({ text: shared.output() });
const lower = text.toLowercase({ text: shared.output() });
const joined = text.concat({ a: upper.output(), b: lower.output() });
const wf = workflow(joined); // `shared` appears once; edges fan out
```
