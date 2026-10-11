# 动效语言设定 → 其余一切都遵守的规则

执导是技艺之上的判断层。它把一份简报变成一小套运动规则,让每一镜
读起来出自同一只手。大部分工作是减法:决定什么不动。

`motion-principles` 给出数字。本篇决定整条片子允许用哪些数字。

## 唯一规则

先锁运动语言,再对着它做动画。下表每一行挑**一**个,然后反复用。
一致读起来自信,花样读起来嘈杂。拿不准时,重复,别发明。

## 运动语言规格

在活儿的最上端把每一行填一次,并在动画之前向用户复述一遍。这些行
指引时间线文档;工具调用归 `motion-graphics` 管。

| 行 | 挑一个 | 示例 |
|---|---|---|
| 缓动族 | 十之八九的移动共用的 `easing` 字符串 | `cubic-bezier(0.22,1,0.36,1)` |
| 基准计时单位 | 原子的 `durationMs`;其余一切都是它的倍数 | 400——微节拍 200,主角 800 |
| 转场族 | 这条片子用哪种剪切风格 | 只用 `crossfade`,其余硬切 |
| 错峰节奏 | 一个 `offsetMs` 和一个 `from` | 80ms,`from: "start"` |
| 运动强度 | 行程、缩放与过冲的预算 | `distance` ≤ 0.15,`overshoot` ≤ 1.05 |
| 驻留纪律 | 移动之间的最短静置 | ≥ 400ms 什么都不动 |
| 字体族与字重 | 一种内置字体族,每个文字层级一个字重 | 主角 `Inter` 800,辅助 400 |
| 空间与对焦 | 一条运镜路径和深度规划(若片子需要 2.5D) | 主角 `depthPx: 0`,背景更远 |
| 快门与质感 | 哪些层模糊、拖影或步进 | 冲击点上主角模糊,背景保持 |

缓动至多两种:入场与落定一种,出场一种。第三种必须自证理由。

## 深度要配得上 brief

showcase、hero、发布或"要最好的"活儿,每个场景都要按背景床、中景、前景、
颗粒或调色收尾来规划。每个场景单独编组。路径形状、遮罩、repeater、样式轨、
动画链接与效果,只要能加深构图就用。用 `get_timeline` 读完整文档,对
`edit_timeline` 写不了的字段(`styleTracks`、`repeater` 在内)用
`set_timeline_document`。

动手之前先研究一条出厂参考。调 `list_example_timelines` 选一个 slug,再调
`get_example_timeline` 读它的统计、场景目录与首场节选。用 `scene_id` 换场景,
用 `clip_offset` / `clip_limit` 翻它的图层。CodeAct 形态是
`nodetool.timelines.examples.list()` 与
`nodetool.timelines.examples.get("kite", {clip_limit: 12})`。不需要装库,也不
需要仓库文件系统。Kite、Prism、Voltra 与 Tidewater 展示了场景编组与关键帧
图层组合的不同做法。Cadence 展示了一条用图表助手与可复用组件搭出的竖屏数据
故事。

用工艺方法搭,不要手搓关键帧淡入淡出。`@nodetool-ai/sandbox-timeline` 的
`video({palette, fonts, ...})` 给每个场景配了 `s.backdrop()`、`s.glow()`、
`s.flash()`、`s.kicker()`、`s.pill()`、`s.streaks()` 与 `s.finish()`——出厂
示例正是用这套词汇搭场景的。砸落、升起或生长就是配好 `from`/props 的
`el.enter()`/`el.animate()`(`title.enter({from: {scale: 1.35, blur: 26,
opacity: 0}})` 就是一次砸落),数字滚动是 `el.count()`,描画显现是
`el.draw()`。下面的深度规划与 API 一一对应——先够这些,再考虑裸的
`animate()` 自定义曲线:

| 平面 | 用什么搭 |
|---|---|
| 背景床 | `s.backdrop()`、`s.streaks()`、低幅度的 `el.loop()` |
| 中景 | 辅助元素,放进容器排布(`frame-composition` 的 `s.stack`/`s.row`) |
| 主角 | 唯一一个 `el.enter()`/`el.animate()` 最重、踩在节拍上的元素 |
| 收尾 | 每个场景里的 `s.finish()`,或 `v.series()` 之后整片调色的 `v.adjust()` |

写主角动画之前,把每个 showcase 场景按这四层都规划好。每个方法的签名读包
文档(`nodetool.packs.docs("@nodetool-ai/sandbox-timeline")`)。除非用户设了
成本上限,showcase 里要给生成静帧或音乐床留预算。

保存 showcase 之后,调 `validate_timeline` 传
`{"timeline_id":"<id>","tier":"showcase"}`,或
`nodetool.timelines.validate(id, {tier: "showcase"})`。处理它对场景编组、
自定义关键帧、收尾、运镜与并发视觉图层的警告。这些检查只看文档结构。构图
与可读性要预览成品来判断。普通编辑与刻意极简的片子仍用标准校验。

## 字体排印

搭文字片段之前,先在运动语言规格里定好字体族与字重。NodeTool 内置
`Inter`、`Space Grotesk`、`Bebas Neue`、`Playfair Display`、`Lora` 与
`JetBrains Mono`。一部作品用一个族,主角要明显重于辅助,比如 Inter 800 配
400。`Bebas Neue` 只有 400 一档,选它就用字号与字距做对比。

1920×1080 的画面上,主角标题从 96–160 `fontSizePx` 起步,辅助 42–64,短
眉题 28–36。大号展示字保持收紧的字距(`letterSpacingPx` −2 到 1);全大写
眉题放开到 2–5px。在目标画面尺寸下核对实际词句,按贴合与可读性调整。

已有的文字片段,`edit_timeline` 可以用一条 `set_clip_params` 补丁设置字体:

```json
{"timeline_id":"<id>","ops":[{"op":"set_clip_params","target":"Hero title","textStyle":{"fontFamily":"Inter","fontWeight":800,"letterSpacingPx":-1,"fontSizePx":128}}]}
```

完整操作契约归 `timeline-edit-ops`。各宽高比下的摆放与安全区归
`frame-composition`。

## 调性与能量

把片子放到两根轴上,然后守住。一条片子里混格子,是"不统一"的常见
成因。

| | 柔(有机、带缓动) | 锐(精确、干脆) |
|---|---|---|
| **平静** | 奢品、康养、编辑志:长时窗、大驻留、极简错峰 | 高端科技、金融:从容、干净、不赶、零过冲 |
| **律动** | 生活方式、俏皮、儿童:过冲加弹簧、松计时 | 体育、燃向、游戏:短时窗、硬切、重音卡拍 |

## 运动性格

填满规格的缓动、计时与强度三行的,是那几个命名预设。每个项目挑
一个,之后按名字交给后面的每一步。

| 性格 | `durationMs` | `easing` | 过冲 | 常驻预设 |
|---|---|---|---|---|
| **俏皮** | 150–300 | `easeOutBack` 或 `cubic-bezier(0.34,1.56,0.64,1)` | `overshoot` 1.1–1.2 | `pop`、`bounce`、`squash`、`float` |
| **高级** | 350–600 | `cubic-bezier(0.4,0,0.2,1)` | 无 | `fade`、`blur`、`kenBurns`、`breathe` |
| **商务** | 200–400 | `cubic-bezier(0.2,0,0,1)` | `overshoot` ≤ 1.03 | `fade`、`slide`、`wipe` |
| **爆发** | 100–250 | `easeOut` 配短时窗 | `overshoot` 1.15–1.3 | `pop`、`flash`、`shake`、`spin` |

高级坐在平静-柔,商务坐在平静-锐,俏皮坐在律动-柔,爆发坐在律动-锐。
产品默认商务,生活方式默认俏皮。`easeOutElastic` 和 `easeOutBounce`
只属于俏皮。

## 运动层级

给每个元素排位,顺着名单往下做动画,并且早点停。

| 层 | 它是什么 | 它怎么动 |
|---|---|---|
| Hero(主角) | 这一时刻讲的那一件事 | 最大胆、最长、缓动最足的一次移动;落在拍点上 |
| Support(支撑) | 帮主角落地的上下文 | 更小更快,让在一边,绝不抢戏 |
| Texture(质感) | 底衬、颗粒、氛围漂移 | 低振幅的 `loop` 预设;没有硬事件 |

这三层就是 `motion-principles` 点名 Primary、Secondary、Ambient 的那
三层。一帧里两个元素抢视线,就是执导失败:先降级一个,再碰它的
关键帧。

层级也是轨道决策。轨道 `index` 最低的画在最上层,所以主角放低索引、
底衬放高索引;压暗层夹在它压暗的画面与它承载的文字之间。要运镜,把
片段的 `transform.depthPx` 与轨道顺序分开设。序列的 `camera2d` 可以对
位置与深度做关键帧,`focusDepthPx` 与 `aperturePx` 决定哪一层被柔化。
让一个平面保持清晰可读,其余的动。

间距要在文字或形状改动后活下来的元素,用 `layout`(编组片段上的一个
flex 容器,真实子元素经 `parentId` 指名):`flexDirection: "row" |
"column"` 配 `gap` 隔开兄弟元素,按活文字定尺寸的底板则是带内边距
容器里一个 `flexItem: {position: "absolute", inset: 0}` 的兄弟元素。
一条片段要跟随另一条片段写好的位置、缩放、旋转
或透明度时,用 `animationLinks`。链接的跟随者共用一个运动决定;它们
不能再链向第二个链接。

## 克制

对每个元素问一句:这个运动承载意义吗?不承载,就让它静止。

- 不要整帧同时动。给眼睛留一个锚。
- 不要在转场上叠转场——`wipe` 剪切下面压着 `spin` 入、再压着
  `flash`,是三个点子挤 500ms。
- 不要对别人还在读的文字做循环动画。
- 不要给严肃内容过冲。
- 一条片子一个超规格时刻。第二个会抵消第一个。
- 又叠化进来又带 `fade` 入的片段爬两次坡,读起来比单独任何一个都慢。
  挑一个。

## 节奏铺排

给任何单个移动计时之前,先把能量铺过整条时间线:低调开场、蓄势、
一个峰值、安定收尾。有意识地变化——先绷,后松。静止也是节奏,不是
空档。`beat-sync-editing` 把这个形状变成剪切点。

动画的 `beat` 锚点跟随文档速度:从一开始计的 `index`、
`scope: "clip"` 或 `"sequence"`,以及可选的 `offsetMs`。
`bake_audio_animation` 烘焙的实测音频曲线则跟随音频源。要一条节奏
规则用前者,要真实的起振或包络驱动画面用后者。`stagger_animations`
在有序的片段 ID 列表上错开既有动画,而媒体时序保持不动。

运动质感要有意识地选。`repeater` 造一条片段的定位延迟副本;
`temporalEcho` 用淡出的延迟副本给它拖尾;`steppedTime` 把它的时钟
量化。逐片段的 `motionBlur` 控制自己的快门角和最低采样数。各层请求
不同的数时,场景取最高、封顶 32,并在各自的快门内对每层均匀采样。
模糊给快速的主角、且方向因此更清楚时才给,然后检查静帧的可读性。

## 逐镜执导笔记

写意图,不写关键帧。每镜一行,就够别人——或下一轮的你——做动画:

> 第 3 镜,4 秒。主角:价格牌,`pop` 在重拍上入场,商务。支撑:字幕
> 晚它 80ms,`fade`。质感:底衬延续第 2 镜的 `kenBurns`。其余不动。

要做重复出现的标题或 logo 系统,先查 `list_compositions` 再裸搭片段。
时序对得上的话,`title-slam`、`word-cards` 和 `logo-sting` 是现成的
起点骨架。工具契约归 `motion-graphics` 管。`set_clip_params` 不收新的
运镜、布局、链接、重复、拖影、步进或逐片段模糊字段;先读
`get_timeline`,再经 `set_timeline_document` 写完整文档。

## 一致性审计

宣布这一轮完成之前,用 `get_timeline` 把文档读回来,拿每条片段对
规格过一遍。不符是执导缺陷,不是品味差异。

- 同类移动同一缓动族,循环之外没有游荡的 `linear`。
- 每个 `durationMs` 都是基准单位的倍数。
- 剪切上只有选定的转场类型。
- 文字错峰一个节奏,跨片段的搭建共用一个 `offset_ms` 顺序。
- 驻留纪律被尊重:没有两个移动之间毫无静置地叠着。
- 任一时刻恰好一个主角在动。
- 一个字体族,而且是内置的——`Inter`、`Space Grotesk`、
  `Bebas Neue`、`Playfair Display`、`Lora`、`JetBrains Mono`。别的
  都会报 `font_not_portable`,而且每台主机各解析各的。

然后看:对刚审计过的那些移动的中点跑 `preview_timeline_frame`。只读
文档的审计,查过的是规格,不是画面。

## 必做的示例对照

`motion-graphics` 拥有的评审轮次(它的 `## Review pass`)每条片子跑一次,
不要跑两遍——接触印样、逐场景清单、示例对照、`tier: "showcase"` 校验,以及
一次真实的修改。返回的结果也要对照本页规格来判:最忙的场景还守不守运动层级,
示例的密度之下克制是否还在,收拢间距之后选定的运动性格是否仍然可辨。
