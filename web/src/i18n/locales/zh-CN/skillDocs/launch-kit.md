**先加载 `/storyboard-core`。**它承载本技能所假定的循环、工具契约与门禁。
下面只讲交付物是一套物料而非一条成片时,做法有什么不同。

## 这类任务的独特之处

在所要求的定向广告交付物之间保持调色与选角一致。把下面各轮制作当作
组织模式,按简报的规模伸缩。

也就是说:一套实体、一个分镜板的 `style` 字符串、一个图像模型、一个视频
模型,在 A 阶段固定,直到 D 阶段逐字复用。在物料包中途换图像模型,正是
一套包看起来像两套包的原因。

## 产出所要求的定向广告

把各阶段当作进度检查点。在已授权的交付物与预算内继续推进。用户要求复核、
或出现会改变产出或花费范围的未决事项时暂停。已经给过的授权不要重复确认。

### A — 选角并锁定

1. 用平铺图建产品实体:保存素材,`create_entity {kind: "prop"}`,描述词写
   几何形状与表面处理。其余角度(四分之三、背面、顶面、上身)留作普通
   素材——只有第一张参考图会进入提示词。
2. 用上身照建角色实体。描述词写脸型、发型与体型,**不含服装**——服装属于
   镜头文本,这样同一个人才能在整套物料里换装。
3. 可选建一个风格实体:`create_entity {kind: "style", palette}`。风格实体
   作用于每块板上每个镜头,这正是物料包想要的。
4. 用 `find_model` 各查一次 `text_to_image` 与 `image_to_video`。用
   `set_board` 把它们连同实体写到板上。
5. 用 `memory_save` 保存调色、模型 id、板 id 与实体 id,id 放进
   `resources`。这套包下周还能续作就靠它——`share_result` 会随运行一起
   被丢弃。

汇报实体 id、调色与模型 id。继续产出所要求的素材。

### B — 定向广告静帧

按要求的数量与配比产出静图。用户保留了选条权时就走选条。只要静图的
需求到此为止;否则带着选定的画面继续产出已授权的视频交付物。

在 `camera.framing` 里变化构图,并在 `action` 里复述,因为只有 framing
会进入静帧提示词。纯产品照画面写明只含产品的 `entity_ids`,免得角色的
描述词注入她没出镜的画面。

汇报选定的素材 id,在所要求的范围内继续。

### C — 社交平台剪辑

按简报给的条数、时长与宽高比,从 B 阶段选定的静图出动画剪辑。遵守对这些
静图的任何审批要求。复用它们,保持观感一致。

每个宽高比一块独立的板——`aspect_ratio` 是板级字段而非镜头字段,一块板
无法同时服务 9:16 与 16:9。每块板用同样的实体、同样的风格、同样的模型。

汇报剪辑素材 id。如果所要求的物料包还包含更长的影片,继续。

### D — 长片

按要求的时长与宽高比制作较长的成片,字卡与时间点保持稳定。装配完成后
收尾声音:`edit_timeline` → `get_state`,对旁白下方的 "Shot Audio" 片段
执行 `set_clip_params {muted: true}`,再用 `generate_music` + `add_track` +
`add_media_clip` 以较低的 `volumeDb` 加上音乐。

收尾前跑 `validate_timeline`。

## 花费

每一轮渲染前汇报该阶段的镜头数与帧数——绝不报美元数字,因为没有任何
东西能给渲染定价。事后用 `get_cost_summary` 查这套包实际花了多少。

一轮十二帧静图很便宜;三轮剪辑外加一条 30 秒影片就不是了。用户在权衡时,
就把这个比值告诉他。

## 日后续作物料包

`list_storyboards` 能看到镜头数,以及多少镜头已有静图与剪辑。
`memory_search` 找得到写有调色与实体 id 的 A 阶段备忘。两者合起来足以
续作,无需重新推导观感。

## 简报

把这些示例按用户的简报改编。示例交付物、风格选择与审批检查点只在用户
采纳时适用。

```
Launch kit for [BRAND] [SKU] from the attached flat and on-body photos.
Stop after each phase and wait for me.

A. Cast and lock. Product entity from the flat (descriptor = geometry and
   finish). Character entity from the on-body photo (descriptor = face, hair and
   build, no wardrobe). Pick one image model and one video model with find_model
   and write both onto the board. Grade: [cold film / warm daylight / black
   studio]. memory_save the grade, both model ids and every entity id.
B. Twelve still campaign frames, mixed crops, on-figure and product-only. Stills
   only — stop before clips. Product-only frames get entity_ids naming the
   product alone.
C. Three 9:16 clips, 6-8s, animated from stills I approved in B. Do not
   re-render those stills. A separate board for the vertical ratio.
D. One 30s 16:9 film, slugged and timed. Assemble, mute the Shot Audio clips
   under the voiceover, add a music bed low, then validate_timeline.

Same grade and the same two models from A through D. Report counts before each
render, not dollars.
```
