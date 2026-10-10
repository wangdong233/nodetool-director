你帮用户在 NodeTool 里搭建检索增强生成(RAG)管线。

# RAG 架构

```
INDEXING:  Documents → Load → Split → Embed → Store (vector collection)
QUERY:     Question → Embed → Search → Format → LLM → Answer
```

# 向量库后端

NodeTool 的向量库(`@nodetool-ai/vectorstore`)后端可插拔。无论用哪个后端,工作流节点
都一样——后端靠配置选择。

| 后端 | 最适合 | 备注 |
|---------|----------|-------|
| **SQLite-vec** | 默认、本地、内嵌 | 无外部服务 |
| **ChromaDB** | 自托管 / 远程 | `CHROMA_URL`、`CHROMA_PATH`、`CHROMA_TOKEN` |
| **Pinecone** | 托管云 | 基于 API 密钥 |
| **Supabase (pgvector)** | Postgres 支撑 | 与 Supabase 鉴权/存储配套 |

**没有 FAISS 节点**;上述后端已覆盖本地与托管场景。

# 向量节点(`vector.*`)

所有 RAG 节点都在 `vector.*` 这一个命名空间下(不是 `vector.chroma.*`,也不是
`vector.faiss.*`)。

| 节点 | 用途 |
|------|---------|
| `vector.Collection` | 按名引用/选择一个知识库(供其他节点消费的知识库引用) |
| `vector.IndexTextChunk` | 连同嵌入一起索引单个文本块 |
| `vector.IndexString` | 索引一个字符串值 |
| `vector.IndexAggregatedText` | 索引聚合后的文本 |
| `vector.IndexEmbedding` | 索引预计算的嵌入 |
| `vector.IndexImage` | 索引一张图像 |
| `vector.QueryText` | 文本向量相似度检索 |
| `vector.QueryImage` | 图像向量相似度检索 |
| `vector.HybridSearch` | 向量 + 关键词检索(精度最好) |
| `vector.GetDocuments` | 取回指定文档 |
| `vector.Count` | 统计知识库中的文档数 |
| `vector.Peek` | 预览知识库内容 |
| `vector.RemoveOverlap` | 对结果中相互重叠的块去重 |

检索节点(`QueryText`、`QueryImage`、`HybridSearch`)输出 `ids`、`documents`、
`metadatas` 与 `distances`(HybridSearch 还返回 `scores`)。

# 文档加载与切分

| 节点 | 命名空间 | 用途 |
|------|-----------|---------|
| `Code` | `nodetool.code` | 用 `await workspace.list(dir)` 枚举文件 |
| `LoadDocumentFile` | `nodetool.document` | 把 PDF/TXT/MD 加载为文档 |
| `Chunk` | `nodetool.text` | 定长分词切块带重叠(通用) |
| `RegexSplit` | `nodetool.text` | 按分隔符模式做结构感知切分 |

## 块大小指引

| 内容类型 | 块大小 | 重叠 |
|--------------|-----------|---------|
| 技术文档 | 200-500 token | 50 token |
| 散文/文章 | 300-600 token | 75 token |
| 代码 | 100-300 token | 25 token |

# 建索引 —— 工作流模式

```
ListFiles → LoadDocumentFile → Chunk → IndexTextChunk(collection)
```

每个索引/检索节点都配一个 `vector.Collection` 节点(或知识库名),让它们对准同一个
库。建索引与检索用**同一个嵌入模型**。

# 建索引 —— HTTP API

```bash
# Index a file into a collection
curl -X POST http://localhost:7777/api/collections/<name>/index \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"file_path": "/path/to/document.pdf"}'
```

服务器解析知识库,若注册了摄入工作流就运行它,否则回落到 切分 → 嵌入 → 入库。

# 检索 —— 工作流模式

```
ChatInput → HybridSearch(collection, top_k) → FormatText → Agent → Output
```

| 节点 | 用途 |
|------|---------|
| `ChatInput` | 用户提问 |
| `vector.HybridSearch` | 向量 + 关键词检索(精度最好) |
| `vector.QueryText` | 纯向量检索(更快) |
| `FormatText` | 为 LLM 拼上下文字符串 |
| `Agent` | 基于上下文 + 问题生成回答 |
| `Output` | 返回回答 |

# 完整 RAG 示例

## 建索引
```
ListFiles("/docs/") → LoadDocumentFile → Chunk(length=400, overlap=50)
                                                  ↓
                                  IndexTextChunk(collection="my-docs")
```

## 检索
```
ChatInput("What is...?") → HybridSearch(collection="my-docs", top_k=5)
                                  ↓
                         FormatText(template="Context:\n{documents}\n\nQuestion: {query}")
                                  ↓
                         Agent(model=gpt-5.4, system="Answer using only the context provided.")
                                  ↓
                         Output
```

# 环境变量

```bash
# ChromaDB backend (only when using Chroma — SQLite-vec needs no config)
CHROMA_URL=                          # Remote Chroma URL (empty = local)
CHROMA_PATH=~/.local/share/nodetool/chroma  # Local storage path
CHROMA_TOKEN=                        # Optional auth token
```

嵌入模型在索引/检索节点上通过模型选择指定(如 `text-embedding-3-small`,或本地
sentence-transformers 模型)。

# 常见坑

- **嵌入模型不一致**: 建索引与检索必须用同一个嵌入模型。
- **块太大**: 稀释 LLM 上下文——守住 200-500 token。
- **块太小**: 句子被切碎;用 10-20% 重叠。
- **知识库是空的**: 先建索引再检索——没建过索引的知识库什么都查不到。
- **节点名写错**: 是 `vector.IndexTextChunk` / `vector.QueryText` / `vector.HybridSearch`,不是 `IndexTextChunks` / `TextSearch`,也不存在 `vector.chroma.*`/`vector.faiss.*` 命名空间。
- **没有 `nodetool collections` CLI**: 知识库经编辑器 UI 或 `/api/collections/...` 端点管理。
