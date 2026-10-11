# MG 动效制作 → 时间线智能体

运动是有计时、有分层、有检查的。用 `edit_timeline` 写动画,再用
`preview_timeline_frame` 看帧。没有看过的改动不算完成。

## 按活加载对应的技艺技能

本文件是工具契约:一次调用收什么、拒绝什么。八篇技能架在它上面,
决定往这些调用里放什么。加载与这次活儿相关的那一篇,然后回到这里查
参数形状。

| 问题 | 技能 |
|---|---|
| 多长、哪种缓动、错峰多少、为什么发僵 | `motion-principles` |
| 全片遵守什么规则;画面闹或不统一 | `motion-direction` |
| 元素坐哪、9:16 下活不活、怎么做纵深 | `frame-composition` |
| 剪切落哪、节奏怎么铺、冲击点怎么变速 | `beat-sync-editing` |
| 用哪些颜色、按什么顺序调色、什么真的能动 | `color-motion` |
| 预设接近但不对;过冲、衰减、抖动、弧线、勾画 | `motion-curves` |
| 片头标演绎、片尾卡、闪屏 | `logo-reveal` |
| 内容后面的氛围底衬 | `motion-background` |

另有三篇是邻居而不是分层。`caption-titles` 决定文字说什么、什么时候
出现。`video-audio-continuity` 在第一条片段渲染之前,先决定多场景片子的
声音来自一条生成片段还是你自己铺的一条轨——一个本文件的操作无法撤销的
决定。板类技能(`explainer-storyboard`、`commercial-beat-sheet`、
`launch-commercial`、`music-video-treatment`、`trailer-template`)在还
没有时间线可动画之前先定镜头;`assemble_storyboard_timeline` 是它们的
板变成本文件文档的地方。

凡为时间线生成的东西——底衬、片头标、人声、片段——都各有一条模型
产品线,带自己的指南。`find_model` 在它覆盖的产品线上返回
`prompting_skill`;写那条提示词之前先 `load_skill` 它。

## 动画之前先读

先调 `get_timeline`。你需要序列的 `fps`、`width`、`height`,带每条轨
`index` 与 `type` 的轨道清单,以及每条片段的 `startMs`、`durationMs`、
`mediaType` 与已有 `animations`。拿到文档里的片段 id 之前什么都别动画
——绝不凭空猜一个。

第一次编辑前先用 `create_timeline_version` 拍快照。动效活是迭代的,
一个错误的 `mode: "replace"` 会抹掉别人写好的动画。

## 选对编写面

`edit_timeline` 收一个时间线 ID 和一个 `ops` 数组。操作按顺序执行,
每次调用至多 60 个。做有依赖的编辑之前,先看每个操作的 `ok` 和整批的
`failed` 结果。产品内的 agent,对单个操作用对应的 `ui_timeline_*`
工具。下面是一次合法的无头调用:

```json
{"timeline_id":"<id>","ops":[{"op":"animate_clip","target":"Title","animations":[{"role":"in","preset":"fade","durationMs":400}]}]}
```

`animate_clip` 输入收目录预设或 `custom` 曲线与代码,外加 `stagger` 和
打字机的 `caret`。它**不**写 `styleTracks`、`textAnimator` 或 `beat`。
`set_clip_params` **不**写 `layout`、`repeater`、`motionBlur`、
`steppedTime`、`temporalEcho`、`animationLinks` 或 `transform.depthPx`。
往操作里塞这些键不会写进这些功能。

要写这些字段,读 `get_timeline` 的 `timeline` 对象,改需要的片段或
序列字段,再用从它装配出的完整文档调 `set_timeline_document`。存在时
保留 tracks、clips、markers、tempo、setup、templateId、mediaTracks、
transcript、scriptEnabled 与 camera2d。带上 `timeline.updatedAt` 作为
`expected_updated_at`,让并发编辑被拒。整文档写入先校验结果、再快照
前一版。省略的文档字段会被删掉,所以绝不要只发改动的那条片段。下文
各节的 JSON 对象是要并进完整文档的字段,不是 `edit_timeline` 操作。
编辑器可能没有它们的控件,但它们照样渲染、并在保存后还在。

## 轨道分层

**`index` 最低的画在最上层。** 轨 0 盖住轨 1,轨 1 盖住轨 2——Premiere、
Resolve、FCP 的顺序,与绘画软件的图层堆相反。合成器把索引换算成
`z = 1000 - index`;`preview_timeline_frame` 按层报告那个 `z_index`,
并自栈顶向下列出各层。

四种轨道类型,而类型是角色,不是对画什么的限制:

| 类型 | 装什么 | 用于 |
|---|---|---|
| `video` | 画面片段、图像 | 剪辑本体 |
| `overlay` | 文字与形状片段 | 标题、下三分之一字幕条、压暗层、标注 |
| `audio` | 声音 | 音乐、旁白、音效——从不绘制 |
| `subtitle` | 文字 | 烧录字幕 |

由叠放顺序推出的规则:

- 压暗层要比它垫在后面的那段文字索引**更高**,比它压暗的画面更低
  ——所以按索引降序排列是画面、压暗层、文字。
- 时序重叠时,给每个动效元素自己的叠加轨。同轨两条动画片段在时间上
  重叠,会触发一次你没有要过的自动叠化(见转场)。
- 字幕是你控制不了的例外:旁白片段的词级字幕合成在所有真实轨道之上,
  不管那条片段挂在哪条轨上。别搭一个指望盖住它的标题。
- 音频片段永远不贡献图层。一帧因为所有东西都挂在音频轨上而显得空,
  是轨道类型用错了。
- 至多 **8 个视频图层**同时合成,自顶轨向下解析。文字、形状与图像
  片段不计入,所以一堆标题不受影响——但九条视频片段重叠意味着最底下
  那条悄悄不画。预览一帧就能发现。

## 搭建元素

你要做动画的片段,用同一份 `edit_timeline` 操作清单搭出来。

```json
[
  {"op":"add_text_clip","text":"Maya Chen","trackId":"<overlay>","startMs":4000,"durationMs":3000,"fontSizePx":64},
  {"op":"add_shape_clip","shape":{"kind":"rect","x":0,"y":0.72,"width":1,"height":0.18,"fill":"#000000"},"startMs":4000,"durationMs":3000,"opacity":0.55}
]
```

`add_text_clip` 只必须要 `text`;样式字段(`fontSizePx`、`color`、
`background`、`stroke`)从操作本身或一个 `style` 样式包读,不给
`trackId` 就落在叠加轨上。`add_shape_clip` 的几何放在 `shape`(或
`shapeStyle`,或操作自己的键)里,`x`、`y`、`width`、`height` 是画面
0..1 的分数——完全不给几何就是全画面矩形,通常正是你要的压暗层。

轨道就是 Z 轴顺序,所以它们怎么建很重要:

```json
[
  {"op":"add_track","type":"overlay","name":"Titles"},
  {"op":"move_track","target":"Picture","toIndex":2}
]
```

`add_track` 收 `type`(`video`、`audio`、`overlay`、`subtitle`)和可选
的 `name`,并**追加到底部**——最高索引、最后绘制。之后才加的画面轨
于是盖住叠加轨。要么最后加叠加,要么之后把画面挪下去:`move_track`
收一个 `target`,再加 `toIndex`(0 是顶)、`before` 或 `after` 之一。

## 给片段做动画

`edit_timeline` 收 `{"op": "animate_clip", "target": <clip id 或名>,
"animations": [...]}`。每条动画是 `{role, preset, durationMs?, delayMs?,
easing?, params?}`。`mode` 是 `"replace"`(默认)或 `"add"`。

四种角色。一条片段可以带好几条,每种一两条都行:

- **`in`**——入场。`delayMs` 相对片段起点偏移。
- **`out`**——出场。`delayMs` 从片段**终点**向回偏移,0 表示它恰好在
  片段结束时完成。这是人人都会弄错的那一条。
- **`emphasis`**——片段中段的一拍。`delayMs` 从片段起点算。
- **`loop`**——持续运行;`durationMs` 是一个周期,不是总长。

### 预设

`in` / `out`——`fade`(500ms)、`slide`(500ms;`direction` 左/右/上/下,
`distance` 为画面的 0–1,默认 0.3)、`pop`(500ms,easeOut;`overshoot`
1–1.5,默认 1.08)、`spin`(500ms;`turns` 0–2,默认 0.25)、`wipe`
(500ms;`direction`,`softness` 0–0.5,默认 0.05)、`blur`(500ms;
`amount` 0–40,默认 12)、`colorFade`(600ms,灰度晕开成彩色)。

仅文字的 `in`——`typewriter` 按阅读顺序逐字揭示。把 `durationMs` 设为
整个文字出现完的时间。不给它,字符每 65ms 出一个、在片段内出完。要
定速,用 `durationMs: 1` 配 `stagger: {unit: "character", offsetMs: 40}`。

`emphasis`——`pulse`(600ms;`intensity` 0–0.5,默认 0.06)、`flash`
(400ms;`intensity` 0–1,默认 0.6)、`shake`(600ms;双轴种子噪声:
`intensity` 0–0.2 默认 0.02,`frequency` 单位 Hz 默认 8,`seed` 默认 1,
`fadeInMs`/`fadeOutMs` 默认 0;同一种子复现同一段运动)、`bounce`
(600ms;`height` 0–0.3,默认 0.05)、`squash`(500ms,easeOutBack;
`amount` 0–0.5,默认 0.12)、`followPath`(也可作 `loop`;`d` 是 0..1
空间的 SVG 路径,配 `pathX`/`pathY`/`pathWidth`/`pathHeight`,`orient`
让片段沿切线转向,`startT`/`endT` 取路径的一段;它写
`positionX`/`positionY`,所以会替换片段的位置)。

`loop`——`kenBurns`(3000ms;`zoom` 0–1 默认 0.12,`direction` 向内/
向外,`driftX`/`driftY` −0.2–0.2)、`float`(3000ms;`amplitude` 0–0.2,
`frequency` 每周期循环数默认 1,`seed` 0 = 纯正弦,否则带漂移)、
`breathe`(3000ms;`intensity` 0–0.3)、`rotate`(3000ms;`direction`
cw/ccw)、`hueShift`(3000ms;`direction` 正向/反向)、`orbit`(3000ms;
`degrees` 默认 360,`direction` cw/ccw)——它扫的是 3D 片段的摄影机,
对其他任何片段无效。

命名缓动含 `linear`、`easeIn`、`easeOut`、`easeInOut`、`easeOutBack`、
`easeOutElastic`、`easeOutBounce`,指数、五次与圆形变体
(`easeOutExpo`、`easeInOutQuint`、`easeOutCirc`),以及让一段保持其
前一关键帧值直到该段结束的 `hold`。不设表示预设自己的默认,再没有就
用角色的——`in` 用 `easeOut`,`out` 用 `easeIn`。这个默认几乎总是对的:
入场减速到位,出场加速离开。只有片子俏皮时才伸手拿 `easeOutBack` 或
`easeOutElastic`;在商务的东西上它们读起来廉价。

这份摘要不够用时,`{"op": "list_animation_presets"}` 报告确切的参数表
——目录是权威。它和这里其余每个调用一样,是 `edit_timeline` 的一个
操作,不是独立的工具。

### 关键帧与缓动语法

`easing` 能收的不止那七个命名 id。`cubic-bezier(x1,y1,x2,y2)` 是 CSS
曲线:`cubic-bezier(0.16,1,0.3,1)` 就是大多数入场要的那种减速。
`spring(stiffness,damping,mass)` 解的是一根真实的弹簧,所以
`spring(180,12,1)` 带一次小过冲落定,`spring(180,26,1)` 完全不过冲。
三个常数都必须为正。解析器读不了的任何东西都按线性缓动并报
`unknown_easing`。

预设是运动的起点,不是运动的终点。一条自定义动画只多一个字段,却能
到达没有任何预设到达过的形状:过冲两次的入场、一次移动中间的驻留、
两条通道各走各的时刻表、一次衰减、一条弧线、一次路径勾画。预设接近
但不对时就立刻伸手——围着一个从来不是你要的形状的预设去掰
`durationMs` 和 `easing`,更费时,落点更平。`motion-curves` 承载通道表
和写好的配方。然后是 `{"role": "in", "preset": "custom", ...}`,恰好
携带下面之一:

- `curves`——`[{property, keyframes: [{t, value, easing?}]}]`,`t` 在
  动画的时窗内跑 0..1。可动画属性由 `list_animation_presets` 操作报告。
- `code`——一段 JavaScript 代码体,编写时在宿主侧一次性烘焙成曲线。
  渲染时什么都不求值。

曲线驱动 `wipeProgress` 时加 `mask`;没有它,擦除就没有可贴合的边缘。

必须跟着一段音频走的运动是另一个调用:`bake_audio_animation` 测量一条
音频片段,通过 `set_baked_animation` 操作把曲线写到目标片段上,要么
跟随响度(`mode: "envelope"`),要么每个起音点一记脉冲(`mode:
"beats"`)。它的关键帧住在目标片段自己的媒体里,所以修剪或拆分那条
片段会把运动重新切片;动画带着 `bakedFrom`——换设置重跑会替换那条
曲线而不是叠上第二条,也绝不碰你手写关键帧的曲线。
`set_markers_from_beats` 是另一个工具:给你对着下刀的标记,而不是拿来
做动画的运动。

一条通道上的几条动画怎么合并,决定第二条是叠加到第一条上还是把它
扔掉:

| 折叠 | 通道 | 结果 |
|---|---|---|
| 相加 | `offsetX`、`offsetY`、`rotation`、`blur`、`brightness`、`hue`、`temperature`、`tint` | 数值求和,所以抖动和滑动都在挪片段 |
| 相乘 | `scale`、`scaleX`、`scaleY`、`opacity`、`saturation`、`contrast` | 数值相乘,所以两个半透明爬坡得出四分之一 |
| 取小 | `wipeProgress` | 最紧的那次擦除获胜 |
| 替换 | `positionX`、`positionY`、`anchorX`、`anchorY`、`trimStart`、`trimEnd` | 只活下来一个值——文档顺序里最后那条,其余被丢弃 |

替换那一行是陷阱。两条动画在同一批时刻驱动 `positionX`,意味着其中
一条什么都不做,`validate_timeline` 会报 `replace_curves_overlap`。想让
片段与其他运动组合,就用 `offsetX` 挪它;只有当你要一个别的什么都不碰
的绝对摆位时才用 `positionX`。

### 契约约束的时长

数字在 `motion-principles` 手里——入场跑多久、标题驻留多久。本契约补
的是文档拒绝什么:

- `in` 加 `out` 必须一起装进片段。一个在它的 `delayMs` 之后装不下的
  时窗会被钳制或干脆不跑,`validate_timeline` 会以
  `animation_exceeds_clip` 说出这一点。
- 短于一个周期的片段上的 `loop` 只演出运动的一角。`kenBurns` 按它
  3000ms 的默认值放在 2000ms 的片段上,是一次半途停下的缓慢漂移,不是
  一次 Ken Burns 移动。

### 挑与剪辑匹配的运动

入场从剪辑里挑,不从花样里挑。固定机位镜头上的标题可以 `slide`;甩镜
或运动镜头上的标题应该 `fade` 或 `blur`,因为动的字加动的画面读起来是
两股不相干的运动。方向要配画面:文字逆着运镜滑就是在跟它打架。

每一时刻一个运动点子。一条 `pop` 入、`shake` 强调加 `spin` 出的片段,
表现力不是三倍。

## 给文字做动画

文字片段吃上面所有预设,外加一件媒体片段没有的:逐词错峰。给文字
片段的一条动画加 `stagger`:

```json
{"op": "animate_clip", "target": "Title", "animations": [
  {"role": "in", "preset": "pop", "durationMs": 400,
   "stagger": {"unit": "word", "offsetMs": 80, "from": "start"}}
]}
```

每个单元完整跑一遍 `durationMs` 的动画,比上一个晚 `offsetMs`。`from`
挑哪个单元领先:`start`(默认)、`end` 或 `center`。错峰至少要两个
单元——再少就编译成普通的整块动画。

`unit` 三选一,而计数就是跨度算术的地基:

| `unit` | 一个单元是 | 计数按 |
|---|---|---|
| `word` | 按空白分隔的一个词 | 片段文字里的词 |
| `character` | 一个字素簇——一个 emoji,或一个字母连同它的组合附加符号,算一次 | 每个簇,包括词与词之间的空格——空格也被计时,但什么都不画 |
| `line` | 一条折行 | 文字按序列宽度和片段 `fontSizePx` 折出来的行,不是你敲进去的换行 |

跨度是 `durationMs + offsetMs × (units − 1)`,`from: "center"` 时减半
(中间单元领先、两端最后跑,所以最大延迟是跨度的一半)。六个词、
`offsetMs: 200`、500ms 预设,跨度 1500ms。同一行文字换
`unit: "character"` 大约三十个单元,同一个偏移就跨六秒——字符错峰要的
偏移比词错峰小一个数量级,而 `line` 错峰的计数会跟着画幅变。

**装不进片段的跨度被静默压缩,不是被剪掉。** 引擎收窄的是逐单元偏移
——绝不是每词时长——所以最后一个词仍在片段内完成。在只装得下 60ms
的片段上要 200ms 的偏移,你得到的就是 60ms:每个词照样动画,运动只是
比你写的更紧、更同时,`validate_timeline` 会以 `stagger_compressed`
报出来。这是错峰字"看起来没有错峰感"最常见的原因。算出跨度,拿它对比 `durationMs` 减去一切 `delayMs`,
装不下就自己加长片段或调低偏移,别让钳制替你选。

`loop` 的错峰是例外:偏移是相位差,所以既不被拉伸也不被钳制。

哪种偏移读起来是质感、哪种读起来是一个词一个词,在 `motion-principles`
里,连同配着它的行长上限。

几条各自独立的片段,`stagger_animations` 按 `clip_ids` 的顺序平移既有
动画的延迟,而不挪片段本身。给至少两个不同的片段 ID,每条都已有
动画,加一个非负的 `offset_ms`。产品内工具是
`ui_timeline_stagger_animations`,字段相同。

```json
{"op":"stagger_animations","clip_ids":["logo-id","title-id","tagline-id"],"offset_ms":80}
```

错峰只作用于文字片段,且只作用于变换与透明度运动。`wipe`、`blur` 和
`colorFade` 即使设了错峰也保持整块生效——遮罩与效果曲线是逐层的,
不是逐词的。媒体片段上的错峰被忽略而不是报错,所以"为什么没有错峰"
的 bug,通常是一条不是 `mediaType: "text"` 的片段。

字号按序列分辨率编写:1920×1080 序列上的 `fontSizePx`,在任何预览宽度
下都是同一个意思。

## 文档运动字段

下面的字段属于完整时间线文档里的片段。把它们并进 `get_timeline` 读到
的片段,保留其余字段与动画,再用 `set_timeline_document` 写完整文档。
`edit_timeline` 和 `ui_timeline_animate_clip` 不把它们当动画输入收。

`styleTracks` 在与预设相同的动画时窗里动视觉属性。每条存储动画需要
`id`、`role`、`preset` 和 `durationMs`。目标包括 `text.color`、
`shape.fill`、`shape.cornerRadius`、`clip.borderRadius`、
`mask.featherPx`、`effect.<effect-id>.<numeric-field>`、受支持的效果
颜色(如 `effect.bg-field.colorB`)、渐变档位,以及可变形的 `shape.d`
或 `mask.d` 路径。片段必须已带目标指向的样式、遮罩或效果。
`glyph.color` 这类逐字形目标还需要文字 `stagger`。

```json
{"animations":[{"id":"title-color","role":"in","preset":"fade","durationMs":600,"styleTracks":[{"target":"text.color","keyframes":[{"t":0,"value":"#8bd5ff"},{"t":1,"value":"#ffffff","easing":"easeOutExpo"}]}]}]}
```

`textAnimator` 在其动画时窗里改文字内容。`ticker` 收 `from`、`to`、
`decimals`、`padTo`、`prefix` 和 `suffix`。要 `2,847` 这样的分组千位,
设 `groupSeparator` 为 `","`;不设就保持不分组。`scramble` 收
`charset` 与确定性的 `seed`。它需要一条文字片段。动画的 `beat` 把它的
起点绑到活序列速度上从一开始计的拍序号;`scope` 是 `clip` 或
`sequence`,`offsetMs` 在那个拍附近挪动它。`delayMs` 仍在其上叠加。

```json
{"id":"count-up","role":"emphasis","preset":"custom","durationMs":900,"beat":{"index":3,"scope":"sequence","offsetMs":-20},"textAnimator":{"kind":"ticker","from":1,"to":7,"padTo":2}}
```

`animationLinks` 复制一条源片段写好的 `positionX`、`positionY`、
`scale`、`rotation` 或 `opacity` 通道,可带时间偏移、循环、缩放与
偏移。`wiggle` 链接不带渲染时脚本也能供出带种子的运动。链接不跟随
源自己的链接。写入前把每个 `sourceClipId` 对到文档的片段 ID。透明度
链接替换目标片段自己的透明度,而它的编组与转场覆盖仍会乘进结果。

```json
{"animationLinks":[{"target":"positionX","sourceClipId":"leader-id","source":"positionX","scale":0.35},{"target":"rotation","kind":"wiggle","amplitude":0.025,"frequencyHz":1.4,"seed":8}]}
```

`layout` 把片段摆成 `row`、`stack` 或 `relative` 关系。row 或 stack 列
出子片段 ID;relative 片段用 `targetClipId`、`side` 和可选的 `fitText`
内边距。`repeater.count` 含原片段本身,封顶 128。`timeStepMs` 让每个
副本在时间上错开。这些是片段上的字段,不是要手工新增的片段记录。

```json
{"layout":{"kind":"row","children":["logo-id","wordmark-id"],"gapPx":24},"repeater":{"count":3,"positionStep":{"x":180,"y":0},"timeStepMs":67}}
```

`camera2d` 是序列文档字段。它需要 `position`、`depthPx` 和正的
`focalLengthPx`。关键帧用绝对 `timeMs`,含位置与深度。给片段既有的
`transform` 加 `depthPx` 得到透视;`focusDepthPx` 与 `aperturePx` 加
景深模糊。`camera2d: null` 清掉摄影机。

倾斜的卡片墙:共享倾角用父编组的 `rotation`、`rotationX` 和
`perspective`,分离平面用每张卡的 `depthPx` 与滚动动画,推进与景深
模糊用 `camera2d`。形状的归一化几何保持在画面大小的源栅格之内。用
`transform.position` 或自定义 `offsetX`/`offsetY` 曲线移动片段或编组
来滚动或飞越画面;栅格之外的几何在变换摆放它之前就被裁掉。

```json
{"camera2d":{"position":{"x":0,"y":0},"depthPx":0,"focalLengthPx":1400,"keyframes":[{"timeMs":0,"position":{"x":0,"y":0},"depthPx":0},{"timeMs":1200,"position":{"x":90,"y":-20},"depthPx":120}]}}
```

`motionBlur` 逐片段:`samplesPerFrame` 1–32,`shutterAngle` 0–360 度。
一个采样就对该片段禁用模糊。更高的数是下限;场景按请求中的最高数
渲染,采样在每层自己的快门窗内均匀加权。`steppedTime.fps` 量化片段的
源与动画时钟。`temporalEcho` 通过 `copies`、`intervalMs` 和
`opacityDecay` 加延迟副本。

```json
{"motionBlur":{"samplesPerFrame":8,"shutterAngle":180},"steppedTime":{"fps":12},"temporalEcho":{"copies":3,"intervalMs":80,"opacityDecay":0.5}}
```

## 编组

`{"op":"add_group","name":"Lower third","startMs":4000,"durationMs":4000,"children":["name-id","role-id"]}`
造出一条没有媒体的片段,凡点名它的片段都继承它的变换、不透明度与
时窗。`{"op": "set_parent", "target":
"Name plate", "parentId": "<group id>"}` 收养一条已存在的片段;
`"parentId": null` 解除它,成环会被拒。

下三分之一字幕条就这么搭:压暗层、名字、职位,各占一条自己的叠加轨,
三条全部挂到一个编组下。然后给**编组**做动画。编组上一次 `slide` 入
加一次 `fade` 出,整套一起动、部件彼此锁死;分开做动画则是三次各自
漂移的机会。

子元素保留自己的轨道,所以编组不改变谁盖住谁。普通编组的不透明度
乘进每个子元素。带效果、非 `normal` 混合模式或转场的编组,会先把
子元素预合成到一个画面上,效果或转场随后在装配好的整体上跑一次。
`glow` 放编组上是整体观感,放子元素上只属于那个子元素。

`parent_missing`、`parent_not_group` 和 `parent_cycle` 都意味着子元素按
无父级渲染,丢掉编组的变换、不透明度与时窗。

## 转场

转场在两条片段之间,不在一条片段上。它写在**进场**片段上,为双方
解析:合成器找到它同轨下方的那条片段,把剪切的另一半交给它。进场
片段可以是编组:编组上的 `set_transition` 让整个预合成装配过场,子
元素仍挂在各自的轨道上。它的出场搭档是同一父级下、编组轨道上前一
条重叠的兄弟。

同轨两条片段时间重叠,重叠段自动叠化,完全不需要工具调用。推论:
**意外重叠就是意外叠化。**想要硬切却看着发软时,先查 `startMs` 和
`durationMs`,再看别处。

`set_transition` 主动挑一种剪切而不是吃默认:`{"op": "set_transition",
"target": "Shot 2", "transition": {"type": "wipe", "durationMs": 500,
"direction": "left", "softness": 0.1}}`。传 `"transition": null` 清掉
它。剪切压在目标头部播放,所以**让两条片段至少重叠它的 `durationMs`**,
否则它下面没有可对演的东西——下面空着的转场读起来是从黑场淡入。

| 类型 | 什么在动 | 什么时候用 |
|---|---|---|
| `crossfade` | 进场那条淡起 | 同一场景的两个镜头;安全的默认 |
| `dipToColor` | 两条都穿过一个实色淡入淡出 | 场景切换、章节断点。`color` 自己挑 |
| `wipe` | 羽化边缘揭示进场那条 | 图形感或分屏感。`softness` 0 是硬边 |
| `push` | 两条片段一起走一个画面宽 | 横向能量;两条读起来是一张移动的画面 |
| `slide` | 只有进场那条在走 | 新镜头压在一条保持不动的镜头上到来 |
| `zoom` | 出场的放大,进场的从 0.8 进来 | 朝下一拍的推进 |
| `whip`、`zoomBlur` | 横向甩切或缩放切上的运动模糊 | 快速镜头能量 |
| `glitch` | 位移的数字剪切 | 刻意的电子断裂感 |
| `gradientWipe`、`iris` | 空间阈值或光圈揭示 | 设计感的图形转场 |
| `lightLeak` | 跨剪切铺开的局部色场 | 漏光般的桥接 |

`wipe`、`push`、`slide`、`whip` 和 `gradientWipe` 的 `direction` 点名
进场的那条边。`gradientWipe` 另收 `map: "linear" | "radial" |
"noise"`、`scale`、`seed` 和 `softness`;`iris` 收 `softness`;
`lightLeak` 收 `color`、`scale` 和 `seed`。`easing` 收命名 id、
`cubic-bezier(...)` 或 `spring(...)`。

`set_clip_params` 上的 `fadeInMs` 与 `fadeOutMs` 是音频淡入淡出。合成器
不读它们,所以它们淡不了画面——要淡画面,给片段做 `fade` 的 `in` 或
`out`。

转场的不透明度与动画的不透明度相乘而不是替换,所以又叠化进来又带
`fade` 入的片段爬两次坡,读起来比单独任何一个都更慢更软。挑一个。

剪切长于载体片段时 `validate_timeline` 报 `transition_exceeds_duration`;
本构建画不出的类型或方向报 `unknown_transition`——它退回一次向左的
叠化,而不是让渲染失败。

## 遮罩与轨道遮罩

`{"op": "set_mask", "target": "Title", "mask": {"kind": "rect", "y": 0.2,
"height": 0.6, "featherPx": 24}}` 把图层裁成片段自己 0..1 空间里的一
个形状。`kind` 是 `rect`、`ellipse` 或 `path`(带 SVG `d`)。
`featherPx` 柔化边缘,`invert` 改为保留外侧,`"mask": null` 清掉它。
栅格化不了的路径报 `mask_path_invalid`,图层按无遮罩绘制——整幅画面
透出来,与你要的正好相反。

`{"op": "set_matte", "target": "Fill", "matte": {"source": "Text shape",
"mode": "alpha"}}` 拿另一个片段当本片段的透明度,即轨道遮罩。`alpha`
读源的不透明度,`luma` 读它的亮度,`invert` 把它翻转。**源片段从此
不再绘制自己。**这正是它的用意,也是一条轨道遮罩指向你仍想留在画面
上的片段时读起来像删除的原因。文字必须填进运动的实拍画面时伸手拿
它:画面放填充片段上,文字放源上。`matte_source_missing` 是错误,图层
随即按无遮罩绘制,把遮罩本来藏着的一切亮出来。

## 片段效果

`set_effects` 替换整条效果链并按给定顺序生效;空列表清空。工具在
`color`、`blur`、`glow`、`dropShadow`、`vignette`、`sharpen`、
`chromaKey`、`curves`、`levels`、`liftGammaGain` 之外,还收
`pixelate`、`posterize`、`directionalBlur`、`lensDistortion`、
`stylize`、`generator`、`lut` 和 `grain`。它的扁平输入用
`{type, ...typeFields}`。它自己分配效果 id 并启用每个效果;不收存储态
的 `id` 或 `enabled` 字段。认不出的类型,`validate_timeline` 报
`unknown_effect`。宿主供出离屏面时,Canvas 2D 预览经 CPU 遍应用全部
已知效果。`preview_timeline_frame.effects_not_applied` 列出未知类型;
`degraded` 报缺失的离屏面与其他绘制限制。

```json
{"op":"set_effects","target":"Shot 2","effects":[{"type":"grain","amount":0.12,"size":1.1},{"type":"stylize","mode":"dither","amount":1,"seed":4}]}
```

## 时间重映射

`{"op": "set_time_remap", "target": "Shot 3", "timeRemap": {"keyframes":
[{"t": 0, "sourceMs": 0}, {"t": 1, "sourceMs": 4000, "easing":
"easeInOut"}]}}` 把时间线时间映射到素材时间。`set_time_remap` 每次调用
都替换整张映射。`t` 在片段的时窗内跑 0..1,必须从 0 起、到 1 止、单调
上升;`sourceMs` 说素材的哪一毫秒在那里播放,所以递减的一对是倒放,
相同的一对是定帧。`"timeRemap": null` 清掉它,而重映射替换片段的
速率。`t` 重复或回退是 `time_remap_not_monotonic`,一个错误。

`split_clip` 和 `trim_clip` 拒绝已重映射的片段。两者都得重新推导映射,
而悄悄重新推导它,正是一条速度斜坡变成另一种运镜的成因。清掉重映射,
剪切,再重设。

## 构图

构图是存成可复用架子、带命名参数的一个编组。`list_compositions` 报告
有哪些,`get_composition` 显示一套架子的参数与默认值,而
`{"op":"insert_composition","composition_id":"lower-third","startMs":4000,"params":{"name":"Ada"}}`
把它以全新的片段 id 实例化进文档。参数名用 `get_composition` 返回的;
这里的 `name` 只是示例。

随包示例包括 `title-card`、`lower-third`、`caption-bar`、`callout`、
`cta-end-card`、`logo-sting`、`title-slam`、`word-cards`、
`window-frame` 和 `number-ticker`。当前工作区有哪些模板,用
`list_compositions` 查。

先插入,再覆写 `params`。架子的时序与动效已经互相调平,从裸片段重建
就是把它扔掉。只在简报真的不同的地方,编辑实例化出来的片段。

一个编组要被复用时,`save_composition
{timeline_id, group_target, name, params}` 把它提取成构图。`params`
把名字映射到带类型的默认值和指向子字段的 JSON 指针。
`insert_composition` 重映射编组与子片段 ID——包括内部的 layout 与
animation link——同时保留对构图之外片段的引用。

## 卡点剪切

对音乐片段跑 `detect_audio_events`,得到起音点与曲速。它的
`onsets.times` 单位是**秒**,而操作收毫秒,乘 1000。从 `bpm` 搭网格
之前先读曲速的 `reliable` 标志:语音和房间底噪会凭空算出一个一脸可信
的数字。

`{"op":"set_markers_from_beats","onsets_ms":[0,500,1000],"count":3}` 把
网格铺下来让你看得见。`{"op": "snap_to_beats", "targets": "all",
"tolerance_ms": 60, "mode": "start", "action": "move"}` 把片段边缘拉上
去。两者要么收 `onsets_ms`,要么收带 `offset_ms` 的 `bpm`。

60ms 的默认容差在 30fps 下约合两帧——宽到一次剪切读起来在拍点上,紧
到不会把一个从来不挨着某拍的边缘拖过去。只在网格松时放宽它,因为大
容差会挪动你本来没打算动的剪切。`snap_to_beats` 报告每个目标,包括
没有任何一拍够得着的那些,并给出原因。

`action: "move"` 保持片段长度、推移后面的内容。`action: "trim"` 改变
长度、不动邻居。标题必须落在某个冲击点上就用 move;画面片段的出点
必须接住下一镜就用 trim。

## 校验产出

两道检查,回答的是不同的问题。

**`validate_timeline`** 回答"这份文档健康吗":未知的动画预设与转场、
长于载体片段的淡入淡出与剪切、挂在文档没有的轨道上的片段、重叠片段、
短于一帧的片段、渲染不出的入出点、重复 id。每批编辑之后跑它。

它还点名那些以前要靠你自己记住的运动失败。每条发现带一个稳定的
`code`;下面这些意味着,画面不会演出你写下的运动:

| code | 严重度 | 怎么办 |
|---|---|---|
| `parent_cycle` | 错误 | `parentId` 链成环,编组完全解析不出来。断开环 |
| `matte_source_missing` | 错误 | 遮罩点名的片段文档里没有,或点名了它自己。图层按无遮罩绘制,把遮罩本来要藏的一切亮出来 |
| `time_remap_not_monotonic` | 错误 | `t` 重复或倒退。`sourceMs` 可以递减——那是倒放——但 `t` 不行 |
| `custom_animation_invalid` | 错误 | 存储的 `preset: "custom"` 动画的数值烘焙曲线不可用,且没有可渲染的样式轨或文字动画器。重烘焙曲线,或补一条有效的类型化轨 |
| `animation_style_invalid` | 错误 | 样式目标没有匹配的片段样式、路径不能变形、颜色解析不了,或字形轨缺文字错峰。修目标或修片段样式 |
| `animation_exceeds_clip` | 警告 | 时窗在延迟之后装不进片段,运动被钳制或干脆不跑。缩短 `durationMs`、砍延迟,或加长片段 |
| `stagger_compressed` | 警告 | 单元装不下,逐单元偏移被收窄。这一行落得比你写的更快更平。缩短逐单元 `durationMs` 或给片段更多时间 |
| `replace_curves_overlap` | 警告 | 两条动画同时驱动一条绝对通道(`positionX/Y`、`anchorX/Y`、`trimStart/End`)。文档顺序里最后那条赢,其余被丢弃。在时间上分开,或折成一条曲线 |
| `text_backing_unproven` | 警告 | 文字画在画面上,后面没有 `background`、`stroke` 或形状,于是没人判定它读不读得清。预览这帧看一眼,或给它一块底板 |
| `text_illegible` | 警告 | 字号低于画面高度的 2.5%,或与自己的 `background` 底板(或其后的全画面形状)对比不足 3:1。提高 `fontSizePx`、压暗压暗层,或加 `stroke` |
| `unknown_easing` | 警告 | 在语法之外,于是按线性缓动。查拼写:是 `easeOut`,不是 `ease-out` |
| `unknown_transition` | 警告 | 本构建画不出那个 `type` 或 `direction`;它退回向左叠化。从上面的表里挑一个 |
| `unknown_effect` | 警告 | 本构建应用不了那个效果;图层按未调色绘制 |
| `unknown_shape_kind` | 警告 | 那个 `shapeStyle.kind` 没有几何,形状什么都不画。凭空消失的压暗层通常是它 |
| `transition_exceeds_duration` | 警告 | 剪切长于载体片段。缩短转场或加长片段 |
| `parent_missing`、`parent_not_group` | 警告 | `parentId` 点不到东西,或点到一条不是编组的片段。子元素按无父级渲染,丢掉编组的变换、不透明度与时窗 |
| `mask_path_invalid` | 警告 | `kind` 或路径 `d` 栅格化不了,图层按无遮罩绘制,整幅画面透出来 |
| `layer_cap_exceeded` | 警告 | 那一时刻重叠的视频片段多于合成器可画的;低轨上的那些被丢掉 |
| `font_not_portable` | 警告 | 字体族不是 NodeTool 内置的,于是每台主机都拿自己安装的字体解析它,编辑器与渲染可以不一致。任何要交回的东西都挑内置字体族 |
| `field_stripped` | 警告 | 一个被 schema 丢弃的字段,下次保存就没了。通常是更新的构建写下了它;用本构建的语法重新写 |

对比那一半拒绝瞎猜:解析不了的颜色、半透明底板或渐变填充文字,不
产生对比发现。压在画面上、完全没有底板的文字,是它不测量也能点名的
那一种,它说的是 `text_backing_unproven`。无论哪种,静默的
`text_illegible` 都不算通过——帧就是为这个存在的。

**`preview_timeline_frame`** 回答"它长什么样"。它在你点名的时码处合成
真实帧——每条轨道依序分层、变换与不透明度应用到位、动画采样、转场
走到一半、文字与形状绘制。它不需要浏览器、不需要 GPU、不需要打开
编辑器。

```json
{"timeline_id": "<id>", "times_ms": [1200, 1450, 3000]}
```

`range {from_ms, to_ms, count}` 在一段跨度上均匀采样,而不是逐个点名
时码——这是看完一整段入场的办法,而不是在它里面瞎猜三个点。
`sheet: true` 把每一帧拼成一张带标注的小样图,于是一次扫掠是一张能读
的图,而不是一小把句柄。

它按每个时码返回一个图像句柄;对你要看的那些调 `view_image`。每帧
旁边它自栈顶向下列出各层,带每层解析出的不透明度、混合模式与擦除
进度——常常不看一个像素,就够诊断一个问题。

**采运动的中点,不采两端。** 端点是你已经知道的状态:入场之前片段
不在场,入场之后片段在歇着。一段 1000ms 开始、400ms 的淡入,在
1000ms 和 1400ms 告诉你的都是零,在 1200ms 告诉你一切。对每条你加的
动画,预览:

- 入场的中点,
- in 与 out 之间的一个驻留时刻,
- 出场的中点,
- 还有,对错峰文字,第一个词落下之后、最后一个词落下之前的一个点
  ——半行字在画面上的那一帧,就是暴露错峰太慢的那一帧。

帧抓得住、校验器抓不住的:压在花哨或同色底板上的文字、因两条轨道
顺序颠倒而垫在错误元素下的下三分之一字幕条、滑出画面的标题、片段
结束时仍在收尾的错峰、盖住了本该挨着它的脸的压暗层、因为片段挂在
音频轨上而永远不出现的元素。

每帧带 `degraded` 条目:Canvas 2D 宿主画不出来的差异,比如缺失的
离屏面、硬边的遮罩,或不支持的透视变换。先读实际条目,再决定画面
哪一部分需要 GPU 渲染。已知片段效果都有 CPU 遍。

哪一层什么都没画时,读它的 `skipped` 字段——它说片段还是 `draft`、
素材读不出,还是素材在那个时刻没有帧。缺画面通常是一条没渲染的
片段,不是运动 bug。

`effects_not_applied` 点名 Canvas 2D 合成器不认识的已启用效果类型。
色度键、暗角、锐化、LUT 这类已知效果应该在帧预览里渲染;缺的是
离屏面时,出现在 `degraded` 里。

## 迭代与渲染

改一件事,预览同一批时码,对比。运动不对时,检查顺序是:元素到底
在不在画面上(报告里有没有这一层)、叠放位置对不对(`z_index`)、
不透明度对不对(`opacity`)、位置对不对(看帧)。顺着这张清单查
下来,好过重写动画。

`compare_timeline_frames {a, b, times_ms | range}` 测量两份文档或两个
版本之间真正动了什么。在用户没有要的改动之后跑它(一次重排、一次
构图插入、一次吸附),这样你能说出它碰了哪些帧,而不是指望它一帧
都没碰。

宣布剪完之前,渲染它。还在迭代时 `render_timeline` 配低于 1 的
`preview_scale`,然后用全尺寸跑一次。预览回答一个时码长什么样;渲染
回答文件能不能播。

整文档重写走 `set_timeline_document`,它先校验再写入,并给被替换的
东西拍快照。给快照起名(`snapshot_name: "before the title pass"`),
让版本清单说出你当时要做什么。更小的改动,先 `create_timeline_version`
后 `edit_timeline`。

运动对了就停,并说清你动画了什么。
