# 编写 NodeTool 沙箱 JavaScript

三处运行同一种客座 JavaScript: 相同的全局、相同的 import、相同的限制。

| 场所 | 是什么 | 用什么触达 |
|---|---|---|
| **Code 节点** | 工作流图里的一个函数体 | `validate_code`、`run_code`、`test_code` |
| **JS 脚本文档** | 有名字、有版本、声明了端口/密钥/超时并保存了测试的脚本 | `list_js_scripts`、`get_js_script`、`save_js_script`、`edit_js_script`、`validate_js_script`、`run_js_script`、`test_js_script` |
| **原生流** | 客座代码把节点当异步函数调用,不建图 | `import "@nodetool-ai/sandbox-nodetool/flow"` |

逻辑属于某一张图时选 Code 节点。同一段逻辑要多处调用、要自带测试、要版本历史时选脚本文档。控制流写起来比接线更顺手时,选原生流。

## 函数体契约

```js
// inputs: { rows: [...], threshold: 10 }
const kept = inputs.rows.filter((r) => r.score > inputs.threshold);
progress(50, `kept ${kept.length}`);
for (const row of kept) await emit("row", row);   // streams as it goes
await output("count", kept.length);               // final, posted at the end
```

- **输入从 `inputs` 对象进来**,绝不是各自同名的全局变量。值进入客座端之前先经 JSON
  深拷贝。
- **输出只经 `await output(name, value)` 与 `await emit(name, value)` 离开,别无他途。**
  `name` 必须是已声明的输出句柄。同一句柄上第二次 `output` 会抛错。`return` 只是普通
  控制流,其返回值被忽略。对脚本文档这是强制项: 声明了输出却用 return 返回而不是 emit
  的函数体是**错误**,因为脚本没有遗留 return 契约。Code 节点还能再吃一个版本的旧
  return/yield 契约,带弃用警告。
- **媒体输入以引用形式进来。** 用 `media.bytes` / `media.text` / `media.info` 读,
  用 `media.toDocument` / `toImage` / `toAudio` / `toVideo` 构造。传整个输入对象而不是
  它的 `uri`,让引用自带的类型随行。每个 `media.*` 调用都是异步。
- **`stream` 是 `emit` 的输入侧。** 函数体里提到 `stream` 就对整条流**只跑一次**、自己
  拉取条目;一次也没提到,就对每个到来的条目各跑一次。无需任何配置: 删掉最后一个
  `stream` 调用,节点就切回逐条模式。

```js
for await (const item of stream(name))            // one handle, in order, until EOS
for await (const [handle, item] of stream.any())  // every handle, arrival order
const item = await stream.first(name)             // next value, undefined at EOS
stream.open(name)                                 // could more still arrive?
```

- **`state`** 在流式调用之间存活,每次运行时重置。
- **`progress(percent, message)`** 驱动节点的进度条。

## 能力是全局,库靠 import

全局无需声明: `console`、`fetch`、`workspace`、`getSecret`、`nodetool.secrets.*`、
`sleep`、`crypto`、`format`、`image`、`audio`、`video`、`media`、`canvas`、
`assetToSandbox` / `sandboxToAsset`、`progress`、`emit` / `output`,以及纯工具
`toBase64` / `fromBase64` / `toHex` / `fromHex` / `parallelMap`。`media.*` 与
`workspace.*` 需要 `ProcessingContext`,所以在没有运行托底的裸沙箱调用里会抛错。

其余一切都是函数体 import 进来的**沙箱包**:

```js
import yaml from "@nodetool-ai/sandbox-yaml";
```

用 `list_sandbox_packages` 发现它们,用 `get_sandbox_package_docs` 读某一个的 API。
不要猜描述符: 本宿主没携带的包会在验证时报 "Install `<pack>`"。`nodetool packs
compile` 可以为未随产品发布的依赖构建一个包。

`image.*`、`audio.*` 与 `video.*` 变换返回 `sandbox://media/<id>` 句柄,不是字节。
链式调用,然后在运行结束前 `<type>.toAsset(handle)`。句柄活不到下一次运行。

## 从代码跑一个智能体

当工作不止一次模型调用——先查、再动手、读结果、再纠正——用 `run_agent`:

```js
import { run_agent } from "@nodetool-ai/sandbox-nodetool/agents";

const answer = await run_agent({
  prompt: "Read storyboard " + inputs.storyboardId + " and list its shot titles.",
  model: inputs.model,                // {provider, id} from a model selector
  tools: ["get_storyboard"],          // capability wire names, nothing else
  output_schema: { type: "object", properties: { titles: { type: "array", items: { type: "string" } } } }
});
await output("titles", answer.result.titles);
```

不传 `output_schema` 时,`answer.text` 是智能体的最终消息。智能体运行时会持续
上报它的文字与工具调用。小程序把它们显示在绑定 `op:<id>/exec#transcript` 的
Agent Activity 控件里。单次提示、不用工具的场景,`generate_text` 仍是正确的
调用。

## 从代码调用节点

```js
import "@nodetool-ai/sandbox-nodetool/flow";   // mounts the bridge, required
import { concat } from "@nodetool-ai/sandbox-flow/nodetool.text";

const r = await concat({ a: inputs.left, b: inputs.right });
await output("joined", r.output);
```

`await` 就是边,变量就是连线,`Promise.all` 就是扇出。两个 import 缺一不可: 没有能力
模块,门面挂载不起来。流式输出的节点带 `.stream(inputs)`,是异步可迭代对象,提前
`break` 会关闭流并执行节点清理。每次调用都过逐调用权限门,费用记在发起运行的账上,
受递归深度上限 4 与每次运行最多 16 条并发打开的流约束。流式*输入*在 v1 只接受数组。

要在编辑器里打开、要验证、要在服务器上运行的程序,仍然要建图。那件事用
`nodetool-workflow-builder`。

## 从代码搭时间线

```js
import { video } from "@nodetool-ai/sandbox-timeline";

const v = video({ width: 1920, height: 1080, fps: 30 });
const title = v.scene("title", 3, (s) => {
  const t = s.text("Hello", { size: 120, weight: 600, color: "#ffffff" });
  t.enter({ from: { opacity: 0 }, at: 0, dur: 0.5 });
});
v.series([title]);
const saved = await v.save(nodetool.timelines, { name: "Hello" });
await output("timeline_id", saved.timeline_id);
```

这个包在几秒内写完整条动效剪辑,各场景局部声明,最后用一次
`set_timeline_document` 保存,而不是每个片段一条 `edit_timeline` op。把
函数体里的 `nodetool.timelines` 传给 `v.save`:模块看不到传送带。对描述符
调 `get_sandbox_package_docs` 可得完整的创作 API。

把搭建脚本本身存成 JS 脚本文档,它会自动关联它产出的时间线:第一次
`v.save(nodetool.timelines, {name})` 不带 `timeline_id` 会创建时间线并把
脚本关联到它;之后每次运行同一脚本都是原地更新那条时间线,而不是再建
一条。修改用 `edit_js_script` 的字符串替换 op(见下),不要重发整个函数体。

## 主循环

1. **写或读函数体。** 已保存的脚本用 `get_js_script`。
2. **每次编辑后 `validate_code` / `validate_js_script`。** 它抓语法、对照已安装目录
   查 import、未定义名字、未声明的 `inputs.*` 读取、没有任何 `emit`/`output` 触达的
   输出、重复或非标识符的端口名、以及点名脚本未声明端口的测试。它比运行便宜得多。
3. **`run_code` / `run_js_script`** 配真实输入。`output` 的值以 `outputs` 返回,
   `emit` 的值以 `streamed` 返回——按序排列的 `{name, value}` 列表。流式输入用
   `input_streams` 按句柄键暂存。
4. **`test_code` / `test_js_script`** 作为回归检查。一个用例给 `inputs`(或
   `input_streams`),可选 `expect` —— 按句柄的最终值,做结构化比较,未命名输出忽略
   —— 以及 `expected_streamed`,完整的按序 emit 列表。两者都不带的用例,函数体无错
   跑完即通过。
5. **保存。** `save_js_script` 先验证,更新走 CAS。小修改用
   `edit_js_script(js_script_id, ops)` 更省:每个 op 是 `{old, new}`,
   `old` 必须在当前代码里恰好匹配一次——像代码编辑器的查找/替换,
   零匹配或歧义匹配都会被点名拒绝。它对结果做与 `save_js_script`
   相同的验证。

脚本文档与其他文档共用同一套版本家族:
`list_js_script_versions`、`get_js_script_version`、`create_js_script_version`、
`restore_js_script_version`、`delete_js_script_version`。

## 密钥与限制

凭据用 `nodetool.secrets.get(name)` 读取——绝不内联,绝不写进函数体或测试用例。脚本
声明的密钥与发起上下文携带的授权取交集。没有 `set_secret`: `request_secret` 向用户
自己的客户端索要,值永不进入客座端、对话记录或模型上下文。无头运行不带密钥提示,所以
这类调用按名字拒绝,而不是悄悄写入一个没人批准过的东西。

脚本组合像子智能体一样受限: 深度上限 4 并携带脚本 id 链,环会让调用失败并点名它。
执行时长默认 30s,每个限制都可按次覆盖且封顶。

## 从 shell 验证

这些是 `nodetool` CLI。在 NodeTool checkout 里,同样的命令以 `npm run dev:nodetool --
<command>` 运行。

```bash
nodetool jsscript validate <id|file.json> --json
nodetool jsscript run <id|file.json> --inputs '{"numbers":[1,2,3]}'
nodetool jsscript run <id|file.json> --input-streams '{"numbers":[1,2,3]}'
nodetool jsscript test <id|file.json> --json
nodetool jsscript versions list|show|create|restore|delete <id>
```

磁盘上真实存在的路径优于 id,文件目标不需要数据库。`jsscript test` 任一失败即非零
退出,是 harness gate 跑的无密钥自检。

## 参考

在 NodeTool checkout 里,这些仓库源码走得更远:

- `docs/javascript-sandbox.md` —— 客座面、编组、限制、并发与安全模型。
- `docs/js-script-document-design.md` —— 文档形状、存储、从智能体/Code 节点/小程序
  被调用。
- `docs/harnesses.md` § nodetool jsscript
- `packages/sandbox-packs/README.md`
