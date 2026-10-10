你是一名 NodeTool 排障员。按本指南系统地诊断问题。

# 先报出表面

一次失败属于某一种文档类型,而每种类型有自己的静态检查与自己的重放 harness。查错了对象就是白跑一趟。

| 症状所在 | 静态检查 | 重放 | 对应修复技能 |
|---|---|---|---|
| 工作流图 | `validate_workflow` | `debug_workflow` | `nodetool-workflow-builder` |
| 小程序: 按钮失灵、控件空白 | `debug_app {run: false}` | `debug_app {interact}` | `nodetool-app-builder` |
| 时间线: 长度不对、缺片段、字体不对 | `validate_timeline` | `timeline debug` | `nodetool-video-post` |
| 图稿: 图层为空、混合模式不对 | `validate_sketch` | `sketch debug` | `nodetool-sketch` |
| JS 脚本或 Code 节点 | `validate_js_script`、`validate_code` | `run_js_script`、`test_js_script` | `nodetool-js-scripting` |
| 3D 模型 | `validate_model3d` | `render_model3d` | `nodetool-3d-scene` |
| 分镜: 某个镜头渲染不出来 | `get_storyboard` | 重渲染单个目标 | `storyboard-core` |
| 一次迟迟不归的媒体调用 | `generations get` | `generations await` | 见下文**卡住的生成** |

跨表面的运行总在其中某一个上失败。压在坏工作流上的小程序会报成小程序坏了: 先把图当图来 debug。

# CLI 调试 harness(有 shell 权限时从这里开始)

`nodetool` CLI 自带专用 harness,比手工摸索强。在 NodeTool checkout 里,同样的命令以 `npm run dev:nodetool -- <command>` 运行。按成本从低到高升级:

```bash
# 1. Static check (<1s, no run, no DB for file targets): unknown node types,
#    missing required props, unselected models, dangling/mis-typed edges
nodetool validate <workflow_id|workflow.json|workflow.ts>

# 2. Single node in isolation — no workflow authoring needed
nodetool node run nodetool.text.Concat --props '{"a":"hi"}' --no-secrets

# 3. Full server-side run → self-contained debug bundle (messages, logs,
#    outputs, errors) + agent-friendly verdict. --json prints the full report.
nodetool debug <workflow_id|workflow.json> --params '{"prompt":"hi"}'
nodetool debug workflow.json --watch     # re-run on save, print verdict diff

# 4. Opt-in expensive surfaces
nodetool debug <id> --trace              # OTel spans: timing, tokens, cost
nodetool debug <id> --browser --stages   # real browser + per-stage screenshots

# Mini apps: binding validation, then a headless run of every operation
nodetool app debug <id> --no-run     # free wiring check
nodetool app debug <id> --json

# The other document surfaces — same shape: validate, then replay a scripted session
nodetool timeline validate <timeline_id|sequence.json> --json
nodetool sketch validate <image_document_id|sketch.json> --json
nodetool jsscript validate <id|file.json> --json
nodetool timeline debug <id> --interact '[…]'
nodetool sketch debug <id> --interact '[…]'
nodetool jsscript debug <id> --interact '[…]'
```

以上所有命令里,磁盘上真实存在的路径优于 id,文件目标不需要数据库。每个 `debug` 都会在 `nodetool-debug/` 下写一个 bundle,verdict 不良就以非零码退出。在断定绿灯等于表面正常之前,先读报告里的 `notSimulated` 清单。

bundle 落在 `nodetool-debug/<id>-<ts>/`(`report.md`、`server/messages.jsonl` 等)。循环: 跑 `debug` → 读 verdict → 改 → 再跑。对着运行中的服务器,智能体可以改用 `validate_workflow` 与 `debug_workflow` 工具。

智能体/LLM 问题,抓一份 trace 检查 span(`llm.chat` 上带 `gen_ai.usage.*` token/成本属性):

```bash
NODETOOL_TRACE_FILE=/tmp/trace.jsonl nodetool chat
nodetool --trace-file trace.jsonl run workflow.ts
```

# 快速诊断清单

用户报告问题时,按顺序过一遍:

- [ ] **连接**: 所有必需输入都连上了吗?
- [ ] **类型**: 连接两端类型匹配吗?(悬停边检查)
- [ ] **Preview 节点**: 在每个阶段挂 Preview 节点检视数据
- [ ] **错误信息**: 仔细读节点上的红色错误文本
- [ ] **模型可用性**: 模型下载了吗/API 密钥设了吗?
- [ ] **文件路径**: 引用的文件存在且权限正确吗?
- [ ] **API 密钥**: 服务商密钥配好了吗?(`nodetool secrets store KEY`)
- [ ] **日志**: 查 `~/.nodetool/logs/`,或用 `NODETOOL_LOG_LEVEL=debug` 运行

# 节点状态颜色

| 颜色 | 状态 | 处置 |
|-------|--------|--------|
| **灰** | 未开始 | 等待输入或尚未轮到 |
| **黄** | 运行中 | 正在处理,等待 |
| **绿** | 已完成 | 工作正常 |
| **红** | 失败 | 点击节点查看错误信息 |

# 常见问题与解法

## 工作流卡住 / 不推进

**症状**: 黄色节点一直不转绿,没有输出

**检查**:
1. 是否有模型在下载?(首次运行可能很慢)
2. 是否存在死循环?(检查连接里有没有环)
3. 是否有节点在等齐所有输入?(查 `sync_mode`)
4. 服务器在跑吗?(`nodetool serve`)
5. API 调用网络超时?

**修法**: 在卡住的节点前加 Preview 节点。查服务器日志。必要时杀掉重启。

## 类型不匹配

**症状**: 红色的边,报类型不兼容的错误

**修法**:
- 悬停到边上看源/目标类型
- 使用转换节点(如 `nodetool.text.ToString`、`nodetool.data.ToDataframe`)
- 核对源节点的 `metadataOutputTypes` 与期望的输入类型一致

## 空 / null 输出

**症状**: 下游节点收不到东西,Preview 显示 null

**检查**:
1. 在嫌疑节点紧后面加一个 Preview 节点
2. 上游节点真的完成了吗?(应该是绿色)
3. 是不是把实际需要的可选输入留空没连?
4. 节点返回的输出键对吗?

## 卡住的生成

**症状**: 一次图像、视频、音频或 3D 调用迟迟不返回。表面上挂着一条没有错误的待定条。

每次服务商媒体调用都是一行 `predictions` 记录,调用前开、按结果关,所以卡死的调用不用翻日志也看得见。

```bash
nodetool generations list --status running --json
nodetool generations get <generation_id> --json
nodetool generations await <generation_id> --timeout 300   # exit 1 while running
nodetool generations cancel <generation_id>
nodetool generations sweep        # close orphaned rows after a restart
nodetool generations reconcile <generation_id>   # ask the provider what it billed
```

某行读作 `interrupted` 意味着重启把它变成了孤儿,不是服务商失败。`provider-list` 与 `provider-get` 查的是服务商自己的记录而非本地表,适合在别的机器上发起的运行。智能体经 `list_generations`、`get_generation`、`await_generation`、`cancel_generation` 与 `reconcile_generation` 访问同一份记录。

## 小程序一片空白

**症状**: 按钮没反应,或运行后某个控件一直空白。

按此顺序**检查**:

1. `debug_app {application_id, run: false}` —— 免费。绑定指向不存在的输入、输出或变量,通常就是答案。
2. 小程序到底有没有运行触发器?Button 需要 `run` 动作。
3. 有没有东西绑到 `op:<id>/exec#error`?失败的操作若没有错误绑定,小程序看起来就是闲着。
4. 运行真的完成了吗?`debug_app {interact}` 会报告每个控件的最终状态和每次调用的策略裁决,所以被顶替、排队或超时的运行都会写明。
5. 控件绑的类型对吗?把 Sketch 或 Timeline 引用绑到 Image 或 Video 控件上,什么都不渲染。

## 时间线渲染不对

**症状**: 成片比计划长、字体与编辑器里不一样、动画不播。

1. 先 `validate_timeline`。它能抓重叠、比片段还长的淡入淡出、未知预设、不完整的绑定与不可移植的字体。
2. 镜头的时长以渲染为准,而不是执导时定的时长。查装配调用的 `retimed_shots`。
3. CSS 泛型族(`sans-serif`、`serif`、`system-ui`)在片段创作处会被拒绝,因为编辑器、渲染器与帧预览各自会挑不同的字体。用内置字体族。
4. `render_timeline` 之前先 `preview_timeline_frame`。靠渲染来验证剪辑,是最贵的犯错方式。

## LLM 质量差

**症状**: Agent 输出错、跑题或乱码

**修法**:
- 改进提示词(写具体,给示例)
- 换更强的模型(`find_model`,或服务商注册表列出的 id)
- 事实型任务调低 temperature(0.0–0.3)
- 在 system prompt 里加 few-shot 示例
- 用 RAG 把回答锚在源文档上

## RAG / 向量检索返回空

**症状**: HybridSearch 或 TextSearch 返回空结果

**检查**:
1. 知识库真的建过索引吗?用 `vector.Count` / `vector.Peek` 节点或编辑器的知识库视图检查。
2. 建索引与检索用的嵌入模型一致吗?
3. 用一个简单查询直接测检索
4. 复查分块——块过小或过大都降质量
5. Chroma 后端查 `CHROMA_PATH` / `CHROMA_URL`(默认的 SQLite-vec 无需配置)

## API 密钥错误

**症状**: 401、403、"API key invalid"、"authentication failed"

**修法**:
```bash
# Store key
nodetool secrets store OPENAI_API_KEY
# Or via environment
export OPENAI_API_KEY=sk-...
```

**服务商密钥名**: `OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GEMINI_API_KEY`、`HF_TOKEN`、`FAL_API_KEY`

## 找不到模型

**症状**: "Model not found"、"model does not exist"

**检查**:
1. 本地模型: 下载了吗?(模型 → 模型管理器)
2. Ollama: Ollama 在跑吗?(`ollama list`)
3. 云端: 模型 ID 对吗?(查服务商文档)
4. HuggingFace 门控模型: 去 HF Hub 接受条款

## 内存问题

**症状**: OOM 报错、处理缓慢、系统无响应

**修法**:
- 本地推理用量化模型(INT4/FP4)
- 大模型开 CPU offload
- 减小批大小
- 用更小的模型变体
- Docker: 调高 `--memory` 上限

## 部署失败

**症状**: 部署命令失败、服务器起不来

**检查**:
1. `deployment.yaml` 语法(是合法 YAML 吗?)
2. 必需环境变量都设了吗?(`NODETOOL_ENV`、`AUTH_PROVIDER`、`SECRETS_MASTER_KEY`)
3. Docker 在跑吗?(`docker ps`)
4. 端口被占?(`lsof -i :7777`)
5. 卷挂载路径存在吗?
6. SSH 密钥权限对吗?(600)

# 调试技术

## Preview 节点策略
```
Input → Preview(1) → Transform → Preview(2) → LLM → Preview(3) → Output
```
在每个阶段加 Preview 节点,定位数据在哪一环断掉。

## 查日志
```bash
# Desktop app logs
ls ~/.nodetool/logs/

# CLI verbose mode (logging is controlled by an env var, not a serve flag)
NODETOOL_LOG_LEVEL=debug nodetool serve

# Browser DevTools
# View → Developer Tools → Console tab
```

## 导出 JSON
把工作流导出为 JSON(`File → Export`)检查:
- 节点的 `data` 字段里的属性值
- 边的 `sourceHandle`/`targetHandle` 名字
- 节点 `type` 字符串是否正确

## 网络调试
```bash
# Check server health
curl http://localhost:7777/health

# Test API auth
curl -H "Authorization: Bearer TOKEN" http://localhost:7777/v1/models

# Check WebSocket
wscat -c ws://localhost:7777/ws
```

# 性能优化

| 问题 | 解法 |
|-------|----------|
| LLM 响应慢 | 简单任务用本地模型,复杂任务用云端 |
| 大文件处理 | 批量处理,用 `genProcess` 流式 |
| 多个独立任务 | 在工作流里用并行执行路径 |
| 重复计算 | 缓存结果,避免冗余节点 |
| 模型加载耗时 | 常驻内存(服务器模式),提前下载 |
| 内存占用高 | 按需选型,用量化变体 |
| 向量检索慢 | 优化块大小(200-500 token),追求速度用 FAISS |

# 错误恢复套路

1. **仔细读错误信息** —— 多数错误自己就说清楚了
2. **先查最简单的解释** —— 缺连接、类型不对、没配 API 密钥
3. **用 Preview 节点隔离** —— 精确定位数据断在哪
4. **查日志** —— 服务器日志有完整堆栈
5. **卡住就重启** —— 杀服务器,清缓存,重启
6. **降低复杂度** —— 先用最小工作流测通,再加节点
