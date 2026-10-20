你创建或编辑 NodeTool 工作流图、连接与属性,用 UI、无头工具或用户要的工作流文件。

# 搭建 NodeTool 工作流

创建或编辑一个从指定输入产出所求输出的工作流。保留所求改动之外的既有节点与连接。

## 图是多种表面之一

NodeTool 有好几种文档,大多数不是图。用户点名要图、任务要换着输入反复跑、或结果要能经 API 调用时,才搭图;否则转给对应的技能。

| 交付物 | 技能 |
|---|---|
| 一条成片、一组静帧或一场投放 | `storyboard-core`,由它挑工种技能 |
| 一个给人点的界面 | `nodetool-app-builder` |
| 对已剪素材的修补:抠像、超分、口型同步、生成音效 | `nodetool-video-post` |
| 时间线上的剪辑、字幕、转场或动画 | `motion-graphics` 系统技能,经 `load_skill` |
| 用 JavaScript 而不是节点写的逻辑 | `nodetool-js-scripting` |
| 分层图像、遮罩或叠加 | `nodetool-sketch` |
| 3D 模型或场景 | `nodetool-3d-scene` |
| 可玩的 2D/3D 游戏 | `native-game` |
| Python 的数学或讲解动画 | `manimgx` |
| 文档索引、向量检索、RAG | `nodetool-rag-indexing` |
| 网页的导航、读取或填写 | `nodetool-browser-agent` |
| 批量用的可复用视频模板 | `video-workflow` |
| 一种新节点类型 | `nodetool-custom-node-developer` |

工作流仍可能与其中之一并存:小程序跑工作流,时间线上的一条片段也可以由工作流产出。

用用户点名的创作面:已保存或已打开的工作流用图形工具,要工作流文件时用 JSON 或 TypeScript DSL。不要声称一个不存在的工具可调用。标识符以实时的 schema 与注册表为准。

## 构建与验证

1. 编辑前先看现有图(`ui_get_graph` 或 `get_workflow`)。从请求里确定必需的输入、输出与行为。
2. 找节点类型。画布上,`ui_search_nodes` 加 `include_properties: true` 和 `include_outputs: true` 返回属性名与输出名。无头环境里,`search_nodes {query: [...]}` 找类型,`get_node_info {node_type}` 返回其输入、输出、类型与默认值。模型用 `find_model`(无头)或 `ui_search_models`(画布)挑。不要发明节点类型、属性、手柄或模型标识。
3. 增改节点,设必需属性,连接相容的手柄。编辑时保留既有布局与标识。
4. 用 `ui_get_graph`(其 `validation` 字段)或 `validate_workflow` 校验。修掉错误与必需输入警告。宣称创建或修改之前,先读回已保存的图。报告任何残留限制。
5. 仅当请求包含运行时才执行。跑生成节点花服务商的钱,先与用户确认范围。报告工作流 id、输入、校验结果与实际运行结果。

某节点不可用时,放宽搜索并查看可用的替代。等价组合能保住所求行为就照做;否则说明缺什么能力,只请用户做选择替代所需的那个决定。图里其余不受影响的部分继续做。

## 图形工具

这些编辑一个工作流。工作流在编辑器里打开时作用于实时画布;没有编辑器时,八个图形工具(`ui_get_graph`、`ui_add_node`、`ui_connect_nodes`、`ui_update_node_data`、`ui_delete_node`、`ui_delete_edge`、`ui_move_node`、`ui_set_node_title`)读写 `workflow_id` 指定的已保存工作流。每个变更都接受 `based_on_revision`(来自 `ui_get_graph`),图有变动就拒绝本次编辑。

| 工具 | 用途 | 关键参数 |
|------|---------|-----------|
| `ui_search_nodes` | 找节点类型 | `query`、`input_type`、`output_type`、`include_properties`、`include_outputs`、`limit` |
| `ui_search_models` | 通用 AI 节点的模型 | `kind`(`text_to_image`、`image_to_image`、`text_to_video`、`image_to_video`、`reference_to_video`、`text_to_speech`、`text_to_music`、`audio_to_audio`、`speech_to_text`、`text_generation`、`embedding`)、`limit` |
| `ui_add_node` | 加一个节点 | `id`、`type`、`position {x, y}`、`properties` |
| `ui_connect_nodes` | 连接两个节点 | `source_node_id`、`source_handle`、`target_node_id`、`target_handle` |
| `ui_update_node_data` | 并进节点的 `data` | `node_id`、`data`(如 `{properties: {…}}`、`{dynamic_outputs: {…}}`、`{title}`) |
| `ui_get_graph` | 读图、revision 与校验 | `workflow_id` |
| `ui_delete_node` / `ui_delete_edge` | 删除 | `node_id` / `edge_id` |
| `ui_move_node` | 移动位置 | `node_id`、`position {x, y}` |
| `ui_set_node_title` | 改名 | `node_id`、`title` |
| `ui_open_workflow` | 打开工作流标签页 | `workflow_id` |
| `ui_run_workflow` | 执行 | `workflow_id`、`params` |

`ui_add_node` 只收 `properties`。节点 `data` 上的其他内容,如 `dynamic_outputs`,事后用 `ui_update_node_data` 设。

## 工作流工具

这些不需要编辑器。

| 工具 | 用途 |
|---|---|
| `list_workflows`、`get_workflow` | 查找并读取工作流 |
| `search_nodes`、`get_node_info`、`list_nodes` | 节点发现。`search_nodes` 黐藏服务商节点(`openai.*`、`kie.*` 等),除非 `include_provider_nodes: true`——那是用户点名了某家服务商时用的 |
| `find_model` | 给通用 AI 节点 `model` 属性的 `{provider, model}` 引用 |
| `create_workflow {name, graph}` | 保存新图。节点是 `{id, type, properties}`,边是 `{source, sourceHandle, target, targetHandle}` |
| `validate_workflow {workflow_id \| graph}` | 静态检查:未知类型、缺属性、未选模型、坏边 |
| `run_workflow`、`start_background_job`、`debug_workflow` | 执行、不等待地执行、或带完整调试报告地执行 |
| `run_node {node_type, inputs}` | 跑一个节点探它做什么(仅聊天) |

给的是简报而不是图时,规划器来搭:`plan_workflow {workflow_id}` 存一个步骤映射到注册表节点类型的计划,`update_workflow_plan_step` 修注册表缺的步骤,`build_workflow_from_plan {workflow_id}` 放置并校验节点。画布上同一流程是 `ui_workflow_plan`、`ui_workflow_update_plan_step` 和 `ui_workflow_build_from_plan`。

## 节点目录

目录条目是搜索线索。用之前用 `get_node_info` 或 `ui_search_nodes` 确认每个类型。CLI 里用 `nodetool node list` 和 `nodetool node info <type>` 查已安装类型。

`nodetool.output.Output` 由 audio 包提供。需要但未安装时,跑 `nodetool packs add audio --yes`。CLI 工作流运行也会返回终端变换输出:只有核心的确定性文本图可以止于 `nodetool.text.Template` 而不用专门的收纳节点。例如 `StringInput` → `Template` 在 `outputs.Template` 下返回模板的值。

| 命名空间 | 常用节点 |
|---|---|
| `nodetool.input` | `StringInput`、`IntegerInput`、`FloatInput`、`BooleanInput`、`ImageInput`、`AudioInput`、`VideoInput`、`DocumentInput`、`MessageInput`、`LanguageModelInput` |
| `nodetool.output` | `Output`。`nodetool.workflows.base_node.Preview` 展示中间值 |
| `nodetool.constant` | `String`、`Integer`、`Float`、`Bool`、`List`、`Dict`、`Image`、`Audio`、`Video`、`JSON` |
| `nodetool.agents` | `Agent`、`Summarizer`、`Extractor`、`Classifier`、`Decision`、`EnhancePrompt`、`CreateThread` |
| `nodetool.generators` | `ListGenerator`、`DataGenerator`、`StructuredOutputGenerator`、`ChartGenerator`、`SVGGenerator` |
| `nodetool.text` | `Template`、`Concat`、`Prompt`、`FilterString`、`FilterRegexString`、`Embedding`、`AutomaticSpeechRecognition`、`SaveText` |
| `nodetool.code` | `Code`:一段 JavaScript 体。见 `nodetool-js-scripting` |
| `nodetool.control` | `If`、`Switch`、`ForEach`、`Collect`、`Loop`、`Chunk`、`Take`、`Zip`、`RepeatCount`、`RepeatValue`、`TryCatch` |
| `nodetool.data` | `ForEachRow`、`LoadCSVAssets` |
| `nodetool.document` | `LoadDocumentFile`、`SaveDocumentFile`、`ListDocuments` |
| `nodetool.image` | `TextToImage`、`ImageToImage`、`LoadImageFile`、`SaveImage`、`Resize`、`Crop`、`RotateAndFlip`、`Compositor`、`Upscale`、`RemoveBackground` |
| `nodetool.audio` | `TextToSpeech`、`TextToMusic`、`LoadAudioFile`、`SaveAudio`、`AudioMixer`、`Concat`、`Trim`、`Normalize` |
| `nodetool.video` | `TextToVideo`、`ImageToVideo`、`ReferenceToVideo`、`LoadVideoFile`、`SaveVideo`、`Concat`、`Trim`、`ExtractFrame`、`ExtractAudio`、`AddAudio`、`GetVideoInfo` |
| `vector` | `Collection`、`IndexTextChunk`、`QueryText`、`HybridSearch`。见 `nodetool-rag-indexing` |
| `lib.*` | `lib.pdf`(文本、表格、页图)、`lib.image.*`(滤镜、颜色、绘制)、`lib.audio.*`(效果)、`lib.svg`、`lib.charts.ChartRenderer`、`lib.browser.Screenshot`、`lib.sqlite.GetDatabasePath` |

`lib.http`、`lib.os`、`lib.datetime`、`lib.json`、`lib.math`、`lib.uuid`、`nodetool.boolean`、`nodetool.dictionary`、`nodetool.list`、`nodetool.numbers`、`Slugify` 和 `Chunk` 这类旧 `nodetool.text` 助手,以及全部 `skills.*` 节点都已移除。改用 Code 节点(`nodetool.code.Code`)和它的代码片段库。它的体是纯 JavaScript,带 `fetch`、`workspace.*` 和 `nodetool-js-scripting` 列的其他全局。`@nodetool-ai/sandbox-dates` 这类库是导入的沙箱包,不是全局。

### 生成节点

用带 `model` 属性的通用节点:`nodetool.image.TextToImage`、`ImageToImage`、`nodetool.video.TextToVideo`、`ImageToVideo`、`ReferenceToVideo`、`nodetool.audio.TextToSpeech`、`TextToMusic`。`model` 从 `find_model` 或 `ui_search_models` 取。服务商自有节点(`kie.video.*`、`openai.*`、`gemini.*` 等)暴露该模型的额外设置。仅当用户点名服务商、或需要通用节点没有的设置时才搜它们,`search_nodes` 加 `include_provider_nodes: true`。

### 数据类型

- **原语**:`str`、`int`、`float`、`bool`、`list`、`dict`、`any`
- **资产**:`{type: "image|audio|video|document", uri: "..."}`
- **模型**:`language_model`、`image_model`、`video_model`、`embedding_model`、`tts_model`

边强制类型相容。灵活连接用 `any`。按 `input_type` / `output_type`(`"str"`、`"image"`、`"list"` 等)搜索,找适配某个手柄的节点。

## 工作流模式

- **流水线。** 输入 → 变换 → 输出。例如 `ImageInput` → `lib.image.enhance.AutoContrast` → `SaveImage` → `Output`。
- **Agent 生成。** 输入 → `Agent` 或 `Summarizer` → 后处理 → 输出。`ListGenerator` 每行流式产一项,供扇出。
- **预览。** 多阶段生成的中间阶段后面放 `Preview` 节点,进度才看得见。
- **RAG。** 索引:Code 节点(`workspace.list`)→ `LoadDocumentFile` → Code 节点("Chunk Text" 片段)→ `vector.IndexTextChunk`。查询:`StringInput` → `vector.HybridSearch` → `Template` → `Agent` → `Output`。见 `nodetool-rag-indexing`。
- **实时。** `RealtimeAudioInput` → `openai.agents.RealtimeAgent` 或 `openai.agents.LiveAgent` → `Preview`。`LiveAgent` 跑全双工语音;喂 24 kHz PCM16 麦克风块。
- **多模态。** 链式组合模态:`AutomaticSpeechRecognition` → `Agent` → `TextToImage`,或 `ExtractAudio` → `AutomaticSpeechRecognition` → `Summarizer`。
- **生成媒体。** `StringInput`(提示词)→ `TextToVideo` → `Output`,或 `ImageInput` + `StringInput` → `ImageToVideo` → `Output`。口型同步、超分或数字人,搜 `"lip sync"`、`"upscale"`、`"avatar"`。

### Agent 输出与工具

- Agent 上的 `dynamic_outputs`(`{"title": {"type": "str"}}`)声明结构化结果字段。模型通过 submit 工具填它们,每个字段成为一个输出手柄。
- 要让 Agent 把另一个节点当工具调用,用控制边连接(`edge_type: "control"`,两端手柄都是 `__control__`)。Agent 的常规输出(`text`、`chunk`)照常接 `Preview` 或 `Output`。

### 流与控制流

- 一切都是流。单个值就是一项的流。
- `nodetool.control.Collect` 把流收成列表。`nodetool.control.ForEach` 把列表逐项发出。
- `nodetool.control.Loop` 重复图的一部分:把 `initial` 接进循环体,体的结果回接 `next`,布尔接 `condition`(为真继续循环)。`max_iterations` 封顶,`done` 带出最终值。这是闭环的唯一办法。DSL 表达不了回边,循环要用图形工具或 workflow JSON 搭。
- `nodetool.agents.Decision` 让模型做判断:`prompt` 是是非题,`value` 是被判断的对象(图像会展示给模型),`decision` 是布尔,`if_true`/`if_false` 像 `If` 一样路由 `value`。把 `decision` 接进 `Loop.condition` 就能循环到模型满意为止;问题的措辞要让"是"表示"继续循环"。

## 调试与校验

`ui_get_graph` 返回 `validation` 字段:

- `errors`:阻断性问题,如无效节点类型或解析不过的 Code 体。
- `warnings`:未连接的必需输入与空的必需属性。
- `suggestions`:孤立节点。

`validate_workflow` 是无头等价物,还查出未选模型和服务商不提供的模型 id。修阻断错误和影响所求行为的警告。其余警告说明原因即可,不扩散任务。

- **"Required property 'X' is not set"**:用 `ui_update_node_data` 或图的 `properties` 设置。常见的是 `model` 和 `prompt`。
- **"Required input 'X' not connected"**:加边或设值。
- **手柄名错了**:用 `get_node_info` 或 `ui_search_nodes {include_outputs: true}` 重读类型。
- **类型不匹配**:对比源输出类型与目标输入类型。
- **节点搜不到**:放宽查询或按命名空间前缀(`"nodetool.text"`)搜。

失败的调用不要原样重试。Agent 和生成器节点要 `model`,生成节点要 `prompt`,`ForEach` 要列表输入——要么设上,要么问用户用哪个值。

## 从 shell 运行工作流

本节面向有 shell 的人或 agent。产品内 agent 用 `run_workflow`。

```bash
nodetool workflows run ./workflow.json --params '{"input": "hello"}' --json
nodetool workflows run ./workflow.ts --json    # DSL 文件,先构建再运行
nodetool workflows run <workflow_id>
nodetool workflows list
nodetool workflows get <id>
nodetool jobs list
nodetool serve --port 7777

# 从 NodeTool checkout
npm run workflow -- ./workflow.json --input text='hello' --show-messages
```

## TypeScript DSL

用 `@nodetool-ai/dsl` 以 TypeScript 写工作流。命名空间镜像节点命名空间:`nodetool.text` 即 `text`,`nodetool.control` 即 `control`,`lib.pdf` 即 `libPdf`,`vector` 即 `vector`。

```typescript
import { workflow, input, text, agents, output } from "@nodetool-ai/dsl";

const topic = input.stringInput({ name: "topic", value: "tides" });
const brief = text.template({
  string: "Explain {{ topic }} to a ten-year-old.",
  topic: topic.output()
});
const answer = agents.summarizer({ text: brief.output() });
const result = output.output({ name: "answer", value: answer.output("text") });

const wf = workflow(result);
console.log(JSON.stringify(wf));
```

- **`node.output()`** 是函数,返回默认输出手柄,只在单输出节点上可用。多输出节点写槽名:`answer.output("text")`、`branch.output("if_true")`。
- **可连接**:每个输入都收字面量或输出手柄。
- **`workflow(...terminals)`** 从终端节点回溯,返回可序列化的 `{nodes, edges}`。两个分支共享的节点只出现一次。
- **`run(wf, opts?)`** 进程内执行。**`runGraph(...terminals)`** 即 `run(workflow(...terminals))`。
- 动态输入是多余键,如上面 `text.template` 的 `topic`。
- 没有 `libMath`、`libHttp` 或 `list` 命名空间。算术、JSON、列表与 HTTP 逻辑用 `code.code`。
