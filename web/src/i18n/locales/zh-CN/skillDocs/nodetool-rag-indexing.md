你帮用户在 NodeTool 里搭建文档摄入、向量索引、检索与 RAG 管线。适用于:文档要切块进向量集合并按语义检索;回答要从用户自己的文档得出。按名字或标签找已存的图像、视频或文件,用 `asset_search`。

# 为文档建索引并据此回答

**集合**(collection)是一个命名的向量库。索引把文档切成块,用集合的嵌入模型嵌入每一块并存入;检索用同一模型嵌入问题,返回最近的块,由语言模型据此作答。

```
INDEX:  documents → text → chunks → vector.IndexTextChunk → collection
QUERY:  question → vector.HybridSearch / QueryText → context → Agent → answer
```

## 检索已索引的内容

两个工具在每次聊天里都在智能体工具带上:

- `list_collections` 返回用户可访问的每个集合及其元数据(含 `embedding_model`)。
- `query_collection {collection, query, n_results?}` 以 `{id, document, score}` 返回最近的块,`n_results` 默认 5。

从返回的块作答,并说明答案用了哪些块 id。结果为空意味着集合里没有相近内容,不代表主题未知。

`vector_index`、`vector_batch_index`、`vector_text_search`、`vector_hybrid_search`、`vector_recursive_split_and_index` 和 `vector_markdown_split_and_index` 只作用于宿主绑定到本次运行的集合。聊天不绑定任何集合,所以在聊天里它们报错。建索引走下面的节点。

## 通过节点建索引

所有向量节点都在 `vector` 命名空间。

| 节点 | 输入 | 作用 |
|---|---|---|
| `vector.Collection` | `name`、`embedding_model` | 取或建集合,输出 `{type: "collection", name}` 引用 |
| `vector.IndexTextChunk` | `collection`、`document_id`、`text`、`metadata` | 追加一个块;同一 `document_id` 重写整篇 |
| `vector.IndexString` | `collection`、`text`、`document_id`、`metadata` | 追加一个字符串 |
| `vector.IndexImage`、`vector.IndexEmbedding` | | 索引一张图像或预计算的嵌入 |
| `vector.QueryText` | `collection`、`text`、`n_results` | 向量检索,输出 `ids`、`documents`、`metadatas`、`distances` |
| `vector.HybridSearch` | `collection`、`text`、`n_results`、`k_constant`、`min_keyword_length` | 向量+关键词检索,倒数排名融合,多出 `scores` |
| `vector.QueryImage` | `collection`、`image`、`n_results` | 以图搜图 |
| `vector.GetDocuments`、`vector.Peek`、`vector.Count` | `collection` | 查看库里存了什么 |
| `vector.RemoveOverlap` | `documents` | 去掉重叠块之间重复的文字 |

嵌入模型只在 `vector.Collection` 的 `embedding_model` 上设一次,存进集合元数据。索引与检索节点只接集合,所以建索引和搜索永远用同一个模型。自带示例用 Ollama 的 `nomic-embed-text`。换模型意味着新建集合。

块不多时 `run_node` 就够:先 `run_node {node_type: "vector.Collection", inputs: {name, embedding_model}}` 一次,然后每块跑 `vector.IndexTextChunk`、传 `collection: {type: "collection", name}`。一整个文件夹的文档,搭个工作流跑。

### 索引工作流

1. **列文件。** Code 节点 `await workspace.list(dir)`,或 `nodetool.document.ListDocuments {folder, pattern, recursive}`。
2. **读文本。** 文本与 Markdown 用 `nodetool.document.LoadDocumentFile {path}`;PDF 用 `lib.pdf.ExtractText` 或 `lib.pdf.ExtractMarkdown`。
3. **切块。** 没有切块节点。用 Code 节点,从 "Chunk Text" 片段起步,用 `await output("chunks", chunks)` 记录列表;文档输入用 `await media.text(inputs.document)` 读。
4. **扇出。** `nodetool.control.ForEach` 把每块从 `output` 发出、序号放 `index`。由文件名与序号拼唯一 `document_id`,例如用 `nodetool.text.Template`。
5. **入库。** `vector.IndexTextChunk`:接集合引用、块作 `text`、id 作 `document_id`、`{source: <file name>}` 作 `metadata`。

用 `validate_workflow` 校验后运行。托管嵌入模型按 token 计费,大文件夹建索引前先与用户确认语料规模。

| 内容 | 块大小 | 重叠 |
|---|---|---|
| 技术文档 | 200–500 token | 约 50 token |
| 散文 | 300–600 token | 约 75 token |
| 代码 | 100–300 token | 约 25 token |

### 检索工作流

`StringInput`(问题)→ `vector.HybridSearch {collection, n_results: 5}` → Code 节点把 `documents` 拼成一个上下文字符串 → 带上下文与问题的 `nodetool.text.Prompt` 或 `Template` → `nodetool.agents.Agent`(系统提示限定只能依据上下文)→ `Output`。

自带示例 **Chat With Your Documents** 建集合、索引三份文档并据此回答。用 `get_example_workflow {package_name: "nodetool-base", example_name: "Chat With Your Documents"}` 加载后改造,别从零开始。

## 存储后端

工作流节点与工具在每个后端上都一样。服务器启动时凭 `NODETOOL_VECTOR_PROVIDER` 选一个:

| 值 | 存储 | 配置 |
|---|---|---|
| `sqlite-vec`(默认) | 本地 SQLite 文件 | `VECTORSTORE_DB_PATH` 移动位置 |
| `pinecone` | Pinecone | `PINECONE_API_KEY`,可选 `PINECONE_ENVIRONMENT`、`PINECONE_CONTROLLER_HOST` |
| `supabase` | 带 pgvector 的 Postgres | `SUPABASE_URL` 配 `SUPABASE_KEY` 或 `SUPABASE_SERVICE_ROLE_KEY`,并在项目上执行 `packages/vectorstore/sql/supabase-migration.sql` |

其他值会让服务器启动报错。这些是服务器环境变量,由运行服务器的人设置,不是 agent 设。

## 从 shell 或经 HTTP

有 shell 的人用 `nodetool collections` CLI 管理本地服务器上的集合:

```bash
nodetool collections create handbook --embedding-model nomic-embed-text --embedding-provider ollama
nodetool collections index handbook ./docs/*.md
nodetool collections query handbook "refund policy" -n 5
nodetool collections list
nodetool collections delete handbook --yes
```

`POST /api/collections/<name>/index` 以 `multipart/form-data` 的 `file` 字段收一个文本文件,分块并索引进已有嵌入模型的集合。接受纯文本、Markdown、HTML、CSV 与 JSON。PDF、Office 文件和图像需要索引工作流。

```bash
curl -X POST http://localhost:7777/api/collections/handbook/index \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./docs/refunds.md"
```

## 常见坑

- **没有嵌入模型的集合**无法检索,建的时候就带上。
- **块太大**稀释上下文;**块太小**切断句子。保持 10–20% 重叠。
- **复用 `document_id`** 会互相覆盖,id 里放文件名。
- **建索引之前检索**什么都查不到。
- **节点名**:是 `vector.IndexTextChunk`、`vector.QueryText`、`vector.HybridSearch`。没有 `vector.chroma.*` 或 `vector.faiss.*`,也没有 `nodetool.text.Chunk`。
