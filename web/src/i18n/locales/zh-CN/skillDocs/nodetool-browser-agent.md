你帮用户创建面向浏览器自动化的 NodeTool 智能体——用自然语言任务描述去导航、交互并从网站抽取数据的 AI 网页智能体。

# 架构

NodeTool 的浏览器自动化走**智能体系统**。装备了浏览器工具的智能体可以在一个有规划的多步任务里翻页、截图、下载文件并抽取内容。

```
Task description → Agent → (Plan steps → Use browser tools → Extract/interact → Report) → Result
```

# 可用的浏览器工具

这些是智能体工具带上与网页相关的工具。把它们传给
`nodetool agent run --tools`,把工具带收窄到只剩这些:

| 工具名 | 描述 |
|-----------|-------------|
| `browser` | 抓取并渲染网页内容(执行 JavaScript),抽取文本/链接 |
| `screenshot` | 抓取页面截图 |
| `download_file` | 从 URL 下载文件到工作区 |
| `web_search` | 网页搜索,发现 URL |
| `google_news` / `google_images` | 新闻 / 图像搜索 |
| `http_request` | 裸 HTTP GET/POST,面向 API 与简单抓取 |

> 没有 `dom_examine`、`dom_search` 或 `dom_extract` 工具。`browser`
> 工具负责渲染与内容抽取;用自然语言指示智能体(如"抽取每个商品的标题与价格"),
> 并搭配 `write_file` 保存结构化结果。

# CLI 用法

`nodetool agent` 只收参数——没有配置文件。把指令写进 objective,用 `--tools` 收窄
工具带。

```bash
# Scrape a page
nodetool agent run -p openai -m gpt-5.4 \
  --tools browser,write_file \
  --objective "Go to example.com, extract every product name and price, and save them as JSON with write_file"

# Research a topic — final answer to stdout, trace to stderr
nodetool agent run -p openai -m gpt-5.4 \
  --tools web_search,browser,write_file \
  --objective "Research the latest developments in WebAssembly. Search for sources, browse the promising ones, and compile a structured report." \
  > research-report.md

# Compare prices
nodetool agent run -p openai -m gpt-5.4 \
  --tools web_search,browser,write_file \
  --objective "Compare the price, availability, and shipping of <product> across three retailers, then recommend the best deal"

# Objective via stdin
echo "Screenshot example.com and describe the layout" | \
  nodetool agent run -p openai -m gpt-5.4 --tools browser,screenshot
```

省略 `--tools` 则给智能体完整的默认工具带。


# 浏览器智能体作为工作流节点

可视化工作流(以及 DSL)有专门的 `BrowserAgent` 节点(`@nodetool-ai/dsl` 里的
`agents.browserAgent`)。它在一个图里运行浏览智能体并返回抽取到的文本。当浏览只是
更大管线的一步、而非独立 CLI 运行时,用它。

# 程序化用法(TypeScript)

```typescript
import { Agent } from "@nodetool-ai/agents";
import { BrowserTool, ScreenshotTool, DownloadFileTool } from "@nodetool-ai/agents";
import { ProcessingContext, FileStorageAdapter } from "@nodetool-ai/runtime";

const agent = new Agent({
  name: "browser-agent",
  objective: "Extract product listings from example.com",
  provider: openaiProvider,
  model: "gpt-5.4",
  tools: [new BrowserTool(), new ScreenshotTool(), new DownloadFileTool()],
  workspace: "/tmp/browser-output",
  maxSteps: 15,
});

const ctx = new ProcessingContext({
  jobId: `browser-${Date.now()}`,
  userId: "1",
  workspaceDir: "/tmp/browser-output",
  workspaceStorage: new FileStorageAdapter("/tmp/browser-output"),
});

for await (const message of agent.execute(ctx)) {
  if (message.type === "chunk") process.stdout.write(message.content);
}
```

# 要诀

- **用自然语言描述抽取** —— `browser` 工具返回页面内容,让模型去解析。搭配 `write_file` 持久化结果。
- **用 `screenshot`** 调试视觉状态或核实页面加载成功。
- **多页任务把 `max_steps` 调高**(15-20)。
- **智能体需要先发现 URL 时搭配 `google_search`**。
- **JSON API 用 `http_request`** —— 比整页渲染更快更省。
