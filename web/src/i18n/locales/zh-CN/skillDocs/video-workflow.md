**先加载 `/storyboard-core` 了解镜头是什么、实体如何让提示词生效,再加载
`/nodetool-workflow-builder` 了解图到底怎么搭**——节点搜索、接线柄、校验、
工具。本技能是两者之间的接缝:哪些节点把简报变成镜头,以及什么时候图
是错误答案。

## 先确认真的需要图

只有管线会被**换新输入重跑**时,图才赚得回自己的成本。一条视频,哪怕再
复杂,在分镜上执导都更快更便宜——不用搜节点、不用接柄、不用过校验,
而且每一镜用户都看得见、改得动。

用户说出模板、管线、批量、工厂、"每个 SKU 都要"、"下个月再跑一遍",
或想让它能从 Chat 按名字调用时,才搭图。如果用户要的只是一条视频而你
在伸手够图,回分镜技能去。

## 创意节点

加下面任何一个之前先搜注册表——`search_nodes` 或 `ui_search_nodes`,带上
`include_properties` 和 `include_outputs`——绝不凭空发明类型、属性或接线柄
的名字。已核验的类型:

| 节点 | 作用 |
|---|---|
| `nodetool.creative.Director` | 简报 → `Screenplay`。属性:`model`(language_model)、`brief`、`style`、`shot_count`(1–20)。输出:`screenplay`、`narration`、`music_prompt`、`title`。 |
| `nodetool.creative.ScreenplayShots` | 把剧本一镜一镜扇出。每次迭代输出 `shot`、`shot_prompt`、`index`,另有整表 `output`。 |
| `nodetool.creative.ShotBatch` | 一次性把剧本摊平成待生成规格。输出:`shots`(list[dict]),含提示词、时序与关键帧。 |
| `nodetool.creative.ShotChain` | 顺序动画一组规格,每镜首帧取自上一片段的末帧。输出:`videos`。需要 `ffmpeg` 运行时。 |
| `nodetool.creative.ApplyEntities` | 用实体描述语给提示词做实体生效,与分镜渲染路径同一条规则。 |
| `nodetool.image.TextToImage` | 提示词 → 图像。 |
| `nodetool.video.ImageToVideo` / `nodetool.video.TextToVideo` | 静帧 → 片段,或提示词 → 片段。 |

## 重跑已认可的文档,而不是重新执导

用户已有签过字的板、剧本或剪辑时,不要把 `Director` 塞进图里。从认可的
那一行出发做派生:

| 节点 | 作用 |
|---|---|
| `nodetool.constant.Storyboard` / `.Entity` | 把选定的板或库实体作为图里的值。输出 `output`。 |
| `nodetool.entity.CreateEntity` | `image`、`kind`、`name`、`descriptor`、`key` → `entity`、`created`。按 `key`(比如 SKU)upsert,第二次运行复用原行,库不再膨胀。 |
| `nodetool.entity.LoadEntity` / `ListEntities` | 读一个实体,或流式读一个筛选后的集合。 |
| `nodetool.storyboard.RecastStoryboard` | `storyboard`、`cast`、`replaces`、`reuse_existing` → 副本、`invalidated`、`kept`。提示词没动的每一帧都保留。 |
| `nodetool.storyboard.RenderStills` / `RenderClips` | 渲染派生板的过期镜头。`only_stale`、`max_shots`、`require_keyframe` 是花费闸。 |
| `nodetool.storyboard.AssembleTimeline` | 派生板 → `timeline`。副本继承模板的剪辑、标题与音乐。 |
| `nodetool.storyboard.LoadStoryboard` / `StoryboardShots` | 读一块板的镜头、实体与设置,或每镜一条消息连它的静帧与片段一起流出。 |
| `nodetool.script.WriteScript` / `FillScript` | 按简报和阵容写剧本,或往已认可的剧本里填 `{{key}}` 占位符。两者都新建一行。 |
| `nodetool.timeline.FillTimelineText` | `timeline`、`values` → 填好叠加层的新序列。 |
| `nodetool.timeline.RetargetTimeline` | `timeline`、`aspect_ratio`、`fit` → 新序列,另附 `cropped` 点名被裁切波及的片段。 |

**写入契约。** `storyboard` 引用只读,除非这次运行派生了它。`RenderStills`、
`RenderClips` 和 `AssembleTimeline` 会拒绝手工选定的板并点名 `allow_writes`
——它是给"整个图的目的就是渲染用户选中的那块板"的图用的覆盖开关。先接
`RecastStoryboard`,把它的输出传下去;那个引用携带着权限。

搭自己的图之前先读出厂示例:**Per-SKU Ad Factory**、**Localized
Explainer**、**Three Ratios**(`get_example_workflow`)。

## 两种形态,不可互换

**逐镜扇出**——`Director` → `ScreenplayShots` → `TextToImage` →
`ImageToVideo`。每镜独立渲染。镜头是各自独立的条时用它:广告、一组社交
剪辑、任何"一镜失败不该连累其余"的场合。

**连续链**——`Director` → `ShotBatch` → `ShotChain`。每镜首帧是上一镜的
末帧,运动与构图跨剪切延续。必须感觉连贯的序列用它。它是串行的,更慢,
一条坏片段会向后传染。

管线里有反复出现的角色或产品需要稳住时,`ApplyEntities` 接在提示词源与
图像节点之间。

## 把门禁接进图里

分镜循环的价值,是人能在片段花钱之前看到静帧。图会丢掉这一点,除非你
把它造进去:静帧半段与片段半段保持可分,让用户能跑到静帧为止、看过、
再跑片段半段。交接工作流时说清哪些输入做这件事。

## 校验并交付所求结果

保存前先对内联图跑 `validate_workflow`——它抓未知节点类型、缺失的必填
属性、未选的模型、悬空连边和服务商并不提供的模型 id,一秒内跑完、零
花费。

`create_workflow` 拒绝保存模型属性未选的图,所以用 `find_model` 挑出真实
模型并钉进去。运行时不会替你补。

保存并把图读回来。构建模板的请求以一个校验通过的工作流加它的输入说明
收尾。用户同时请求执行时,在授权范围与预算内跑获准的阶段。同一授权
不要再次索取。

## 简报

按用户简报改写这些示例。示例的交付物、风格选择与审批检查点,只在用户
采纳时适用。

```
Build a workflow named "UGC factory" that I can re-run from Chat.

Inputs: a product image, a brief, an aspect ratio.
Shape: nodetool.creative.Director (brief + style + shot_count) ->
nodetool.creative.ScreenplayShots -> nodetool.creative.ApplyEntities ->
nodetool.image.TextToImage -> a point I can stop at and look ->
nodetool.video.ImageToVideo -> timeline assembly.

Search the registry for every node type and read its real properties and handles
before you add it. Pick concrete models with find_model and stamp them in.
validate_workflow before saving.

Save it and stop. Do not run the clip stage.
```
