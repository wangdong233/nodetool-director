你帮用户对接 NodeTool 的 HTTP + WebSocket 服务器(默认 `http://localhost:7777`)。用 `nodetool serve` 启动(旗标: `--host`、`--port`)。

# 各表面

| 表面 | 路径前缀 | 用途 |
|---------|-------------|----------|
| **REST** | `/api/...` | 工作流、素材、知识库、模型、bundle、健康检查 |
| **tRPC** | `/trpc/...` | 文档表面: 时间线、分镜、图稿、剧本、小程序、JS 脚本、项目、技能、设置 |
| **OpenAI 兼容** | `/v1/...` | 聊天补全 + 模型列表 |
| **WebSocket** | `/ws` | 运行/取消/流式任务、实时聊天、实时编辑器工具 |
| **MCP** | `/mcp` | 经 streamable HTTP 暴露智能体工具,供 Claude Desktop 与 CLI 智能体使用 |

服务器模式(`desktop` / `private` / `public`)与鉴权由环境变量(`NODETOOL_SERVER_MODE`、`AUTH_PROVIDER`)控制,不是 CLI 旗标。

**选对表面。** REST 覆盖工作流、素材与可移植 bundle。一切供人编辑的*文档*(时间线序列、分镜、图稿、剧本、小程序、JS 脚本)都走 tRPC 路由,这些类型的 REST 路由只管导入、导出与构建。要读写文档的集成,调 tRPC,或经 `/mcp` 调用同名的智能体能力。

# 鉴权

带鉴权的端点使用 Bearer 令牌:
```
Authorization: Bearer <TOKEN>
```

服务器按 Supabase 凭据决定模式:
- Supabase 模式(`SUPABASE_URL` 与 `SUPABASE_KEY` 同时设置):发送 Supabase JWT。
  除公开端点外都需要它。
- 本地模式(默认):回环请求无需令牌,以用户 `"1"` 运行。其他来源得到 `401`。

服务器不接受 `SERVER_AUTH_TOKEN` 作为 bearer 令牌。

# REST 端点

## 工作流

```bash
# List workflows
curl http://localhost:7777/api/workflows \
  -H "Authorization: Bearer TOKEN"

# Get a workflow
curl http://localhost:7777/api/workflows/<id> \
  -H "Authorization: Bearer TOKEN"

# Export helpers
curl http://localhost:7777/api/workflows/<id>/dsl-export      # TypeScript DSL
curl http://localhost:7777/api/workflows/<id>/export-bundle   # .nodetool bundle (zip)
```

> **运行工作流走 WebSocket**(`/ws`,见下),没有 REST 的 `/run` 端点。终端里也可以用
> CLI 跑: `nodetool workflows run <id> --params '{"key":"value"}'`。

## 文档(tRPC)

`/trpc` 之下的路由,每种文档类型一个:
`timeline`、`storyboards`、`sketch`、`scripts`、`applications`、`jsScripts`、
`workflows`、`projects`、`assets`、`collections`、`jobs`、`models`、`nodes`、
`memories`、`messages`、`threads`、`settings`、`skills`、`storage`、`packs`、
`costs`、`credits`、`files`、`fonts`、`games`、`integrations`、`triggers`、
`users`、`worker`、`workspace`。

每个路由形状一致: `list`、`get`、`create`、`update`(基于 `updated_at` 的比较并交换)、
`delete`,外加子路由。整文档快照是 `timeline.versions`、`sketch.documentVersions` 与
`jsScripts.documentVersions`(`sketch.versions` 是另一回事: 逐图层生成记录)。
`applications` 还带 `publish`、`released`、`deploy`、`budget` 与 `usage`,因为发布
小程序会锁定它运行的每个工作流的当前图,并封顶它的花费。确切的 procedure 名去
`packages/websocket/src/trpc/routers/` 读路由本身,不要猜。`/trpc/healthz` 无鉴权可答。

智能体经能力工具访问同一份数据,不需要客户端: `list_timelines`、`get_storyboard`、
`edit_sketch`、`save_js_script`、`edit_app` 等等。

## 文档 REST 路由

文档类型的 REST 侧是导入、导出与构建。

```bash
# Mini apps
curl http://localhost:7777/api/applications/:id/export-bundle       # app + every bound graph
curl -X POST http://localhost:7777/api/applications/import-bundle
curl -X POST http://localhost:7777/api/applications/build           # {prompt|spec, provider, model, ...}
curl -X POST http://localhost:7777/api/applications/debug
curl http://localhost:7777/api/applications/examples
curl -X POST http://localhost:7777/api/applications/examples/:slug/install

# Timelines and storyboards
curl http://localhost:7777/api/timelines/:id/export-zip
curl -X POST http://localhost:7777/api/timelines/import-zip
curl http://localhost:7777/api/storyboards/:id/export-zip
curl -X POST http://localhost:7777/api/timelines/:id/isolate-subject

# JS scripts
curl -X POST http://localhost:7777/api/js-scripts/:id/run
```

构建或交互式调试一跑就是几分钟,所以这些路由接受 `poll: true`,返回会话 id,然后在
`GET /api/debug/sessions/:id` 轮询到落定。取消用
`POST /api/debug/sessions/:id/cancel`。

## 知识库(RAG)

```bash
# Index a file into a collection
curl -X POST http://localhost:7777/api/collections/<name>/index \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"file_path": "/path/to/document.pdf"}'
```

## 模型

```bash
# OpenAI-compatible model list
curl http://localhost:7777/v1/models -H "Authorization: Bearer TOKEN"
```

## 存储 / 素材

```bash
# Asset bytes are served under /api/storage/...
curl http://localhost:7777/api/storage/<path>
```

## 健康检查

```bash
curl http://localhost:7777/health      # liveness (no auth)
curl http://localhost:7777/ready        # readiness
curl http://localhost:7777/api/health   # detailed health
```

# 聊天 API(OpenAI 兼容)

## HTTP

```bash
# Chat completion
curl -X POST http://localhost:7777/v1/chat/completions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.4",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ],
    "stream": false
  }'

# Streaming (Server-Sent Events)
curl -X POST http://localhost:7777/v1/chat/completions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-5.4", "messages": [{"role": "user", "content": "Hi"}], "stream": true}'
```

## Python 客户端(OpenAI SDK)

```python
import openai

client = openai.OpenAI(api_key="TOKEN", base_url="http://localhost:7777/v1")

response = client.chat.completions.create(
    model="gpt-5.4",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(response.choices[0].message.content)

# Streaming
stream = client.chat.completions.create(
    model="gpt-5.4",
    messages=[{"role": "user", "content": "Hello!"}],
    stream=True,
)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

## JavaScript 客户端

```typescript
const response = await fetch("http://localhost:7777/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: "Bearer TOKEN",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-5.4",
    messages: [{ role: "user", content: "Hello!" }],
    stream: false,
  }),
});
const data = await response.json();
console.log(data.choices[0].message.content);
```

# WebSocket API —— 运行任务

**端点**: `ws(s)://<host>/ws`。消息是信封 `{ command, data }`。
(编辑器内部用 MsgPack;简单客户端用 JSON 也行。)

```typescript
const socket = new WebSocket("ws://localhost:7777/ws");

// Start a workflow run
socket.send(JSON.stringify({
  command: "run_job",
  data: {
    type: "run_job_request",
    api_url: "http://localhost:7777/api",
    workflow_id: "<uuid>",
    job_type: "workflow",
    auth_token: "<token>",
    params: { input_name: "value" },
    job_id: "<uuid>",
    user_id: "1",
    execution_strategy: "threaded",
  },
}));

socket.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case "job_update":
      console.log(`Job ${msg.status}`); // running | completed | failed | cancelled | suspended
      if (msg.result) console.log("Result:", msg.result);
      break;
    case "node_update":
      console.log(`Node ${msg.node_name}: ${msg.status}`);
      break;
    case "node_progress":
      console.log(`Progress: ${msg.progress}/${msg.total}`);
      break;
    case "output_update":
      console.log(`Output ${msg.output_name}:`, msg.value);
      break;
    case "chunk":
      process.stdout.write(msg.content);
      break;
    case "log_update":
      console.log(`[${msg.severity}] ${msg.content}`);
      break;
  }
};
```

## 任务控制命令

```typescript
socket.send(JSON.stringify({ command: "cancel_job",  data: { job_id: "...", workflow_id: "..." } }));
socket.send(JSON.stringify({ command: "pause_job",   data: { job_id: "...", workflow_id: "..." } }));
socket.send(JSON.stringify({ command: "resume_job",  data: { job_id: "...", workflow_id: "..." } }));

// Stream input into a running node, then close the stream
socket.send(JSON.stringify({ command: "stream_input",     data: { input: "name", value: "data", handle: "..." } }));
socket.send(JSON.stringify({ command: "end_input_stream", data: { input: "name", handle: "..." } }));
```

# 服务器消息类型

| 类型 | 关键字段 | 用途 |
|------|-----------|---------|
| `job_update` | `status`、`result`、`error`、`cost` | 任务生命周期 |
| `node_update` | `node_id`、`node_name`、`status`、`error`、`result` | 节点生命周期 |
| `node_progress` | `progress`、`total`、`chunk` | 进度跟踪 |
| `output_update` | `output_name`、`value`、`output_type` | 节点输出值 |
| `log_update` | `content`、`severity` | 日志消息 |
| `chunk` | `content`、`done` | 流式文本 |

# MCP

`/mcp` 经 streamable HTTP 暴露智能体能力工具,让外部智能体用与产品内智能体完全相同的
调用驱动 NodeTool。三种接入方式:

- `nodetool mcp install` 为 CLI 智能体(Claude Code、Codex)完成配置。
- 在 NodeTool checkout 里,`npm run build:mcpb` 构建 `dist/nodetool.mcpb`,一个单文件
  bundle,Claude Desktop 拖拽即装。它是对着运行中服务器 `/mcp` 的 stdio-to-HTTP 桥,
  服务器不在时以离线模式启动,服务器出现后热挂载。
- 已部署的服务器,把客户端指向 `/mcp` 并使用在**设置 → MCP → 远程接入智能体**里
  签发的令牌。

# 服务器管理(CLI)

```bash
nodetool serve                        # Start server (default 127.0.0.1:7777)
nodetool serve --host 0.0.0.0          # Bind all interfaces
nodetool serve --port 8080             # Custom port
nodetool workflows list                # List saved workflows
nodetool workflows get <id>            # Get workflow details
nodetool workflows run <id>            # Run a workflow (uses the local DB)
nodetool jobs list                     # List execution jobs
nodetool secrets store OPENAI_API_KEY  # Store an API key
```
