# Logo 演绎动画 → 片头标

一个标识一个想法。勾画、拼合或擦除——绝不三样全上。整段演绎控制在
800–2500ms,收在干净的标识上,并保持定格。

`motion-graphics` 承载操作契约。`motion-direction` 决定这条片头标属于哪种
性格;标识通常是一部作品里唯一允许过冲的地方。

## 选一种技法

| 技法 | 最适合 | 时间线上怎么做 |
|---|---|---|
| 描边勾画 | 线条标识、字母组合标、签名体 | 一个 `path` 形状片段,动画驱动 `trimStart`/`trimEnd` |
| 遮罩擦除 | 实心形状、渐变标识 | `wipe` 预设,或动画驱动一个 `set_mask` 矩形 |
| 错峰拼合 | 多部件标识、网格 | 每部件一个片段,放进编组,`delayMs` 错峰 |
| 字标排版 | 标准字 | 一个文字片段,按字符或按词 `stagger` |
| 待机循环 | 加载动画、氛围闪屏 | `breathe` 或 `rotate` 作为 `loop` |
| 缩放落定 | 拿不准时的万能选择 | `pop` 加一点 `overshoot` |

## 描边勾画

`trimStart` 和 `trimEnd` 只描一条路径的子区间,取值 0..1。勾画即
`trimEnd` 从 0 跑到 1,描边先可见、填充后到位:

```json
{"op": "add_shape_clip", "shape": {"kind": "path", "d": "M0.1 0.7 L0.3 0.2 L0.5 0.7",
 "stroke": "#111111", "strokeWidthPx": 6, "lineCap": "round",
 "trimStart": 0, "trimEnd": 0}, "durationMs": 2000}
```

```json
{"op": "animate_clip", "target": "Path", "animations": [
  {"role": "in", "preset": "custom", "durationMs": 1100,
   "easing": "cubic-bezier(0.65,0,0.35,1)",
   "curves": [{"property": "trimEnd", "keyframes": [
     {"t": 0, "value": 0}, {"t": 1, "value": 1}]}]}]}
```

两个 trim 通道按**替换**折叠:一条动画只驱动其中一个;两条在时间上
重叠时后者生效、前者被丢弃,并报告 `replace_curves_overlap`。只用
`trimEnd` 勾画;只有要"画了又擦掉"的描边才让 `trimStart` 追它,并把
两者放进各自的时间窗。

多条描边错峰:给每条路径片段的动画一个 `delayMs`,彼此相隔 100–200ms,
顺序按一只手会怎么画来排。

渲染器解析不了的 `d` 会在调用时被拒绝而不是存下来;未知的 `kind` 报
`unknown_shape_kind` 且什么都不画——标识凭空消失,通常是这两种之一。

## 遮罩擦除

实心标识用揭示,不用勾画。`{"role": "in", "preset": "wipe",
"durationMs": 700, "params": {"direction": "left", "softness": 0.05}}`
把一条羽化边缘扫过图层。`softness` 为 0 是硬边,观感平面构成;0.1 的
观感是光从上面掠过。

驱动 `wipeProgress` 的 `custom` 曲线必须在同一条动画上带一个 `mask`——
`{direction, softness}`——因为没有边缘可贴的擦除无从推断。`wipeProgress`
按**取小**折叠,同一图层上的两次擦除保留更紧的那次。

## 错峰拼合

每部件一个片段,各占一条自己的覆盖轨,全部用 `add_group` 归到一个编组。
先揭示主体,再点缀,字标最后,让视线落在名字上。

```json
{"op": "animate_clip", "target": "Mark part 2", "animations": [
  {"role": "in", "preset": "pop", "durationMs": 500, "delayMs": 160,
   "params": {"overshoot": 1.12}}]}
```

步进 80–120ms。之后凡是挪动整个组合的运动,都动画**编组**——对编组做
一次 `fade` 出,好过给各部件三次各自漂散的机会。编组的不透明度会乘进
每个子元素。

部件已有动画时,`{"op": "stagger_animations",
"clip_ids": ["mark-id", "wordmark-id", "tagline-id"], "offset_ms": 100}`
按这个顺序补延迟,而不动它们的媒体。要用片段 ID,至少两条,并且先给
每条选中的片段配好动画。第一条保持自己的延迟不变。一片重复的同款
标识,用文档的 `repeater` 在一条片段上设副本数、位置步长与时间步长。
图样用 repeater,需要独立画面的部件用各自的片段。

跟随者要与标识对齐,就在它的片段上存 `animationLinks`,让它读标识的
位置、缩放、旋转或透明度。链接跟随源写好的动画,且不会再链向其他
链接。字标的位置要跟着标识变化的盒子走,用
`layout: {kind: "relative", targetClipId: "<mark-id>", side: "right"}`;
`fitText` 可以按字标给背板定尺寸。这些都是文档字段,先用
`get_timeline` 读、再用 `set_timeline_document` 写完整文档。
`set_clip_params` 拒绝 `repeater`、`animationLinks` 和 `layout`。

## 字标排版

一个带错峰的文字片段。短标识按字符;带标语的标准字组合按词:

```json
{"role": "in", "preset": "pop", "durationMs": 380,
 "stagger": {"unit": "character", "offsetMs": 45, "from": "start"}}
```

算清总跨度——`durationMs + offsetMs × (units − 1)`——并和片段时长比对。
放不下的跨度会被静默压缩,而一段被压缩的字标正是演绎"看起来没有错峰
感"的原因。`stagger_compressed` 是它的警告。

字体族用内置的——`Inter`、`Space Grotesk`、`Bebas Neue`、
`Playfair Display`、`Lora`、`JetBrains Mono`——否则渲染端和编辑器各自
解析,标准字组合的宽度会在你脚下变化。

## 不要对标识做的事

缩放、不透明度、绕标识自身锚点的旋转、位移,都是安全的。单独的
`scaleX` 与 `scaleY` 不是:`squash` 扭曲几何,而扭曲的标识是品牌问题,
不是品味问题。运动不要进净空区——辅助元素滑过标识边缘,会让它显得廉价。

## 落在声音标识上

先定声音。还不存在的声音标识就是一份 1–3 秒的音效简报——声源、动作、
空间——走 ElevenLabs 音效(`elevenlabs-audio-prompting`)或 Stable Audio
的 `TrackType: SFX` 提示词(`stable-audio-prompting`);要 30 秒的重音,
产出的是重音加房间底噪。然后对片头标跑 `detect_audio_events`,得到的
`onsets.times` 单位是**秒**;乘以 1000。让标识恰好在那个毫秒到达完全不
透明与最终缩放:

`in` 动画的 `delayMs` = 打点毫秒 − 片段的 `startMs` − `durationMs`。
然后在打点本身上加强调,作为独立的一次 emphasis:
`{"role": "emphasis", "preset": "pulse", "durationMs": 220, "delayMs": <onset −
startMs>, "params": {"intensity": 0.04}}`。

定格若脱离声音悬空,即便两者都好,观感也廉价。整张结尾卡都要落在网格
上时,`snap_to_beats` 是粗钝但管用的版本。

标识要在序列速度变化后仍卡在拍上,就在完整文档里给它的动画放一个
`beat: {index, scope: "sequence", offsetMs?}` 锚点。index 从一开始计,
`delayMs` 在其上再叠加。`animate_clip` 工具输入不收 `beat`。加它的时候
保留已存动画的 `id`、`role`、`preset` 和 `durationMs`。若真源是声音
标识实测的起振,就保留绝对延迟,或改用 `bake_audio_animation` 做
音频驱动的运动。

## 待机循环

给会等待的加载动画或闪屏一个低幅 `loop`:`breathe`,`intensity`
0.02–0.04;或径向对称的标识用 `rotate`。`durationMs` 设为一个周期,
2000–4000ms,并记住:周期长于片段时,观众只看到运动的一角。

绝不让别人正在读的字标循环。

## 定住尾帧

屏幕上最后的东西是静止的标识。演绎完成后再留至少 800ms 什么都不动——
刚落定就切的结尾卡,观感像失误。2500ms 的片段配 1100ms 勾画加 220ms
强调刚好满足;要核对,不要想当然。

## 合适时从骨架起步

`list_compositions` 和 `get_composition` 展示随产品发布的 `logo-sting`
骨架及其参数。`insert_composition` 把它作为编组放入,片段 ID 全新。
改它的时序或错峰它的部件之前,先查看这些 ID。排印式演绎用
`title-slam` 或 `word-cards` 示例;它们是起步文档,不是工具预设。

## 检查

- `validate_timeline`:trim 上的 `replace_curves_overlap`、字标上的
  `stagger_compressed`、演绎长于片段时的 `animation_exceeds_clip`、
  什么都不画的标识上的 `unknown_shape_kind`。
- 用 `preview_timeline_frame` 看勾画中点、一个保持时刻、最后一帧。中点
  暴露画了一半的路径或永不闭合的描边;最后一帧确认标识干净、完整。
- 然后 `render_timeline`——片头标要在速度里评判。
