# 处理 NodeTool 图稿

图稿是一份**图像文档**: 一块画布、一叠图层,以及说明每层图像从哪来的绑定。它是合成
静帧、蒙版、叠加层与引导式图像简报的表面。一张成图、无需保留图层,那是
`generate_image`,不是图稿。

文档只有图层与引用。**像素永远不被无头读写。** 绘制发生在打开的编辑器里,生成发生在
工作流运行或图像工具里。图像以引用落到图层上,所以没有任何位图内联进文档。

## 主循环

1. **找到它。** `list_sketches`,然后 `get_sketch`。新建:
   `create_sketch {name, width?, height?, background?, project_id?}` 给一块空白画布
   (默认 1024×1024、`#ffffff`)。
2. **编辑图层栈。** `edit_sketch {image_document_id, ops: [...]}`。操作按序对已存储
   文档执行并保存结果。打开的编辑器实时拾取变更。
3. **验证。** `validate_sketch {image_document_id}`,或内联传一份 `document`。
4. **破坏性操作前先快照**,用 `create_sketch_version`。

## `edit_sketch` 操作

| 操作 | 作用 |
|---|---|
| `add_layer` | 加一个图层。带 `image` 字段时一步到位,省去第二步 |
| `remove_layer`、`rename_layer`、`duplicate_layer`、`reorder_layer` | 图层栈管理 |
| `select_layer` | 设当前图层 |
| `set_layer_props` | `opacity`、`blendMode`、可见性、锁定 |
| `set_layer_image` | 把图层指向素材 id、`asset://` 定位符、`data:` URL 或 http(s) URL |
| `resize_canvas` | 正整数宽高 |
| `set_setup` | 生成简报: `brief`、`use_case`、`variations`(1..8)、`stage` |

解析不到东西的素材 id 会被拒绝而不是存下来,因为存进去的那层会显示为空图层。

图稿在浏览器里打开时,`ui_sketch_place_image` 对着活画布做同样的事。

## 引导式简报

`set_setup` 写下那一行简报。`refine_image_brief {image_document_id,
provider?, model?}` 把它扩写成图像模型需要的五个字段(主体、构图、光照、风格词,以及
要排除什么),停在评审一步。它不建图层、不启生成。它是人在渲染任何东西之前先改的廉价
文本环节。字段读着对了,再用图像工具从它生成。

## `validate_sketch` 抓什么

重复的图层 id、图层栈里不存在的当前层或蒙版层、未知混合模式、渲染不出来的不透明度与
变换、指向已缺失图层的生成绑定、未知的绑定种类与状态、与存储值不一致的画布设置,以及
schema 往返会剥掉的字段。图层位图对它保持不透明。

## 版本

`list_sketch_versions`、`get_sketch_version`(读快照而不恢复)、
`create_sketch_version`、`restore_sketch_version`、`delete_sketch_version`。
恢复前会先快照恢复前的状态,所以可撤销;随后按今天的 schema 重新验证: 旧文档可能
过不了它当年过的检查。

这些快照的是整个文档。逐图层的生成记录是另一回事,它们记录的是某一层上的一张生成图。

## 从 shell 验证

这些是 `nodetool` CLI。在 NodeTool checkout 里,同样的命令以 `npm run dev:nodetool --
<command>` 运行。

```bash
nodetool sketch validate <image_document_id|sketch.json> --json
nodetool sketch debug sketch.json \
  --interact '[{"tool":"add_layer","input":{"name":"Shadow"}},
               {"tool":"set_layer_props","input":{"target":"Shadow","opacity":0.4,"blendMode":"multiply"}}]'
nodetool sketch versions list <id> --save-type manual --limit 10
```

磁盘上的路径优于 id。`debug` 先跑静态检查,再逐步对无头 `ui_sketch_*` 桥执行每个
`--interact` 步骤,最后验证会话留下的结果。失败的步骤会被记录,脚本继续跑。像素、
绘制、渲染、生成与素材 I/O 不在模拟之列。

## 图稿在哪里被用到

- 小程序用 **Sketch** 控件展示它,该控件收 `{type: "sketch", id}` 引用;用
  **Sketch Pad** 输入控件采集它。见 `nodetool-app-builder`。
- 小程序的 `kind: "sketch"` 资源让小程序读或改它。

## 参考

在 NodeTool checkout 里,这些仓库源码走得更远:

- `docs/harnesses.md` § nodetool sketch validate / debug
- `docs/harnesses.md` § nodetool sketch versions
