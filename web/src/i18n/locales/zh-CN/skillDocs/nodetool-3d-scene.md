# 处理 NodeTool 3D 模型

3D 模型是一份 `.glb` 或 `.gltf` **素材**,以素材 id 寻址。各能力就地编辑存储中的
glTF 并存回同一素材,所以 id 始终有效,打开的编辑器会重新加载它。

用 `native-game` 搭 2D 游戏(内置游戏引擎之后会补上 3D 场景支持)。要给一段剪辑做 3D 片段,在这里
建模,然后摆上时间线。

## 主循环

1. **找到它。** `list_model3ds` 返回素材 id、名字、内容类型与大小。没有起点时:
   `create_model3d {name, ops?}` 建一个空 glTF 场景,并且可以在同一次调用里把整个
   场景应用进去。
2. **读它。** `get_model3d {model_id}` 列出每个对象的 uuid、名字、类型、可见性、
   变换与材质颜色,外加场景的世界空间包围盒。编辑前先调它,为了拿 uuid。
3. **编辑。** `edit_model3d {model_id, ops: [...]}`。操作按序执行。它们没有点名的
   一切——网格、纹理、蒙皮、动画——都保留,所以导入的模型经得起编辑。
4. **验证。** `validate_model3d {model_id | document}`。
5. **渲染**,当需要的是一张图时。`render_model3d` 走无头 Blender(EEVEE 或
   Cycles),尊重场景相机与灯光,存出一张 PNG 素材。它需要服务器上装有 Blender。

## `edit_model3d` 操作

| 操作 | 字段 |
|---|---|
| `add_object` | `kind`: `box`、`sphere`、`plane`、`cylinder`、`torus`、`directionalLight`、`pointLight`。可选 `name` |
| `delete_object` | `target` |
| `set_transform` | `position`、`rotation`(欧拉角,**度**)、`scale`,各为 `[x, y, z]` |
| `set_visibility` | `visible` |
| `rename_object` | `target`、`name` |
| `set_material_color` | `color`,CSS 十六进制字符串,仅限网格 |
| `select_object` | `target`,或 `null` 清除选择 |

`target` 是 uuid 或名字。对象 id 盖章在 `node.extras.nodetool_id` 里,因为 glTF 按
数组下标寻址节点,而删除会重新编号。重名会让寻址产生歧义,`validate_model3d` 会就此
告警。

这些就是不打开编辑器时的 `ui_3d_*` 动词。操作、单位与寻址都定义在
`@nodetool-ai/model3d`,与浏览器编辑器共享,所以无头建出的模型在那里原样打开。

## 无头没有相机

`ui_3d_frame_scene` 与 `ui_3d_capture_view` 需要 WebGL 上下文。没有它时,
"它多大、在哪"由 `get_model3d` 的世界空间包围盒回答。真要一张图,用
`render_model3d`。

## `validate_model3d` 抓什么

glTF 版本、解析不到任何东西的引用(节点、网格、accessor、材质、buffer)、节点层级里
的环、同时带矩阵与 TRS 字段的节点、越界读取所属 buffer 的 buffer view、未声明的灯,
以及本构建无法兑现的扩展。空场景、无灯光的几何体与重名会告警。

## 上时间线

`model3d` 图层是 `preview_timeline_frame` 唯一无法在自己的画布上绘制的一种。预览环节
会收集所请求各时刻的全部 3D 图层,按 glTF 加上锁定渲染器的那些选项分组,把每组交给
一个无头 Chromium 页面。图层报告上的两个字段说出了像素说不出的东西: `camera`
(绘制所用的位姿,由创作时设定的相机与动画通道折叠而成)与 `animation_time_sec`
(glTF 动画自身的时钟,不是时间线时间)。宿主没有 Chrome 时,该组被跳过并作为
`model3d_unavailable` 降级上报。

## 参考

在 NodeTool checkout 里,这些仓库源码走得更远:

- `docs/harnesses.md` § 3D scene tools
- `docs/harnesses.md` § 3D clips in preview_timeline_frame
