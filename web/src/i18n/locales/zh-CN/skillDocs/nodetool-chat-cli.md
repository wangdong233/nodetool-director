你帮用户使用 NodeTool 的聊天界面——终端聊天 CLI 与全局聊天。

# 聊天 CLI

聊天 CLI 把终端填成一块可滚动的对话记录,带多行输入框、工具详情、任务进度与审批提示。两个入口:
- `nodetool-chat`(独立二进制)
- `nodetool chat`(转发到聊天界面的子命令)

从源码运行(无需构建): `npm run dev:chat -- [flags]`。

## 启动聊天

```bash
# Interactive chat (default provider/model from saved settings)
nodetool chat

# With a specific provider/model
nodetool chat -p openai -m gpt-5.4
nodetool chat -p anthropic -m claude-sonnet-4-6
nodetool chat -p ollama -m qwen-3.5:4b

# Restrict the enabled tools
nodetool chat --tools google_search,browser,write_file

# Connect to a running server instead of a local provider
nodetool chat -u ws://localhost:7777/ws
```

> **智能体模式常开。** 每个聊天会话都运行统一智能体循环(规划 + 工具)。旧的
> `-a/--agent` 与 `--no-agent` 旗标已废弃,只是为兼容保留的空操作。

## CLI 旗标

| 旗标 | 用途 |
|------|---------|
| `-p, --provider <name>` | LLM 服务商(见下表) |
| `-m, --model <id>` | 模型 ID |
| `-w, --workspace <path>` | 工作区目录(默认: cwd) |
| `--tools <list>` | 逗号分隔的启用工具 |
| `-u, --url <ws-url>` | 连接 NodeTool 服务器的 WebSocket |
| `--resume [id]` | 恢复本工作区的已保存会话,不给 ID 则取最近一个 |
| `--permission-mode <default|auto|plan>` | 设置权限,交互式默认为 `default` |
| `--no-read-only-search` | 关闭只读的 `run_search` 扇出原语 |
| `--trace-file <path>` | 把 LLM/智能体/工作流 span 以 JSONL 追加写入 |
| `--trace-stdout [pretty\|json]` | 把 span 流到 stdout |

服务商: `anthropic`、`claude_agent_sdk`、`openai`、`codex`、`gemini`、`xai`、
`groq`、`mistral`、`deepseek`、`moonshot`、`minimax`、`cerebras`、`alibaba`、`gmi`、
`together`、`openrouter`、`huggingface`、`replicate`、`kie`、`aki`、`ollama`、
`lmstudio`、`mlx`。任何其他已注册的服务商 id(如 `vllm`)显式传入同样有效。

## 斜杠命令(以 `/` 开头)

| 命令 | 用途 |
|---------|---------|
| `/help` | 在对话记录里显示命令与键盘快捷键 |
| `/new` | 开一个全新会话(清空历史 + 服务器会话线程) |
| `/clear` | 清空可见历史 |
| `/compact` | 总结并压缩对话上下文 |
| `/model [provider/id]` | 浏览所有已配置服务商的模型,或用 服务商/模型 ID 切换 |
| `/agent [id\|main]` | 浏览子智能体线程、检视其一,或回到主对话 |
| `/tools` | 列出启用的工具 |
| `/mode <default|auto|plan>` | 更改工具权限 |
| `/sessions` | 浏览本工作区与服务器的已保存对话 |
| `/resume [id]` | 恢复一段已保存对话 |
| `/export [path.md]` | 把对话记录存成 Markdown,不覆盖既有文件 |
| `/details` | 开关工具参数、代码与编辑 diff 的显示 |
| `/exit`、`/quit` | 退出聊天 |

Enter 发送。Alt+Enter、受支持终端里的 Shift+Enter、或 Ctrl+J 插入换行。上/下方向键翻找
历史输入,Tab 补全命令。Page Up/Page Down 滚动,Ctrl+G 回到最新输出,Ctrl+O 开关工具
详情。Escape 取消一轮或收起输入。Ctrl+C 取消、清空草稿,或在输入框为空的空闲态保存并
退出。审批提示会显示应答键,答之前可以滚动。

`/compact` 压缩本地上下文。已连接的服务器自管上下文。`/clear` 只清屏,`/new` 才重置
对话。

非斜杠输入作为聊天消息发给模型——聊天提示符里没有内建 shell(`ls`、`cd`、…)。文件
操作经智能体的文件工具在工作区完成。

## 配置

- 设置文件: `~/.nodetool/chat-settings.json`(持久化 服务商 + 模型)
- 会话: `~/.nodetool/chat-sessions/`(对话记录、上下文、服务商续接信息)
- 会话在每轮之后与退出时保存。选择器按工作区与服务器过滤。恢复会话不继承审批授权。

# 智能体能力

智能体循环始终活跃,聊天因此可以:

1. **规划** —— 把任务拆成步骤
2. **用工具** —— 搜索、浏览、文件操作、代码执行、媒体生成
3. **迭代** —— 执行步骤、评估结果、随机应变
4. **运行工作流** —— 触发已保存的 NodeTool 工作流

## 常用工具

| 工具 | 能力 |
|------|-----------|
| `google_search` | 网页搜索 |
| `browser` | 浏览并抽取网页内容 |
| `read_file` / `write_file` / `edit_file` | 工作区文件操作 |
| `grep` / `glob` | 搜索文件 |
| `screenshot` | 抓取页面截图 |
| `find_model` | 按能力挑选模型 |
| `generate_image` / `generate_video` / `generate_speech` | 媒体生成 |

用 `--tools a,b,c` 收紧集合;用 `/tools` 查看当前生效的集合。

# 全局聊天

全局聊天是桌面应用内建的聊天界面。

## 功能

- 与任何已配置的 AI 模型对话(OpenAI、Anthropic、Gemini、本地)
- 多条会话线程
- 独立窗口(从系统托盘启动)
- 工具: 网页搜索、图像生成、工作流执行
- 与 CLI 相同的常开智能体循环

## 工作流集成

```
1. 在 NodeTool 编辑器里保存一个工作流
2. 打开全局聊天
3. 从工作流选择器里选中它
4. 自然地聊——智能体可以把工作流当工具调用
```

# 典型流程

## 快问快答
```bash
nodetool chat -p openai -m gpt-5.4
> What's the difference between FAISS and ChromaDB?
```

## 调研任务
```bash
nodetool chat --tools google_search,browser,write_file
> Research the top 5 TypeScript ORMs and write a comparison to comparison.md
```

## 代码生成
```bash
nodetool chat -p anthropic -m claude-sonnet-4-6 --tools write_file,read_file,grep
> Create a Python script that processes CSV files and generates summary statistics
```

## 无头 / 程序化聊天

非交互聊天,用运行中服务器(`nodetool serve`)上的 OpenAI 兼容聊天 API:

```bash
curl -X POST http://localhost:7777/v1/chat/completions \
  -H "Authorization: Bearer TOKEN" \
  -d '{"model": "gpt-5.4", "messages": [{"role": "user", "content": "Hello"}]}'
```

# 常见坑

- **没配服务商**: 先存一把密钥(`nodetool secrets store OPENAI_API_KEY`)。`/model` 选择器只列已配置服务商的模型。
- **模型 ID 写错**: 用 `/model <provider>/<id>` 切换;选择器会搜遍所有已配置服务商。
- **指望有个 shell**: `ls` 这类裸命令是发给模型,不是执行。改用智能体的文件工具。
- **找 `/agent` 开关**: 智能体模式常开,没有开关。
- **误用 `/agent`**: 该命令用于检视委派出去的子智能体线程,不是智能体模式开关。
