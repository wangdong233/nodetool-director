# 动态背景 → 底衬

一块吸引注意力的背景就是失败。慢、低对比、循环看不见接缝,而且足够
便宜,它前面的画面照样合得成。

`motion-graphics` 承载这里点名的各调用的操作契约。`color-motion` 挑
底衬用的色板,`motion-curves` 在没有会回卷的预设咬得住接缝时,写那条
循环曲线。

## 挑读得出来的最便宜做法

| 观感 | 用什么搭 | 成本 |
|---|---|---|
| 平涂或渐变底 | 一个铺满画面的 `rect` 形状,`fillStyle` 线性或径向 | 形状片段不计入视频图层上限 |
| 柔光网格或锥形渐变 | 一个铺满画面的形状,配 `generator` 效果,`mode: "meshGradient"` 或 `"conicGradient"` | 一次程序化效果,无模型调用 |
| 成形的色块 | 径向填充的 `ellipse` 片段,低不透明度,加 `blur` | 对每个色块的运动有更多控制 |
| 噪声、分形、粒子、漏光、网格 | 一个铺满画面的形状,配对应的 `generator` 模式 | 程序化,可定种子 |
| 漂移纹理 | 一个带 `kenBurns` 动画的图像片段 | 在视频图层上限之外 |
| 烟、墨或云 | 一条循环起来的生成视频底 | 一个视频图层,外加一次模型调用 |
| 色相轮转 | 以上任一,加一条 `hueShift` 循环 | 再叠一层调色 |

至多**八个视频图层**同时合成,自最低轨道索引向上解析。文字、形状与
图像片段不计入,所以形状搭的底在那份预算里一分不花。九条视频片段
重叠,意味着最底下那条悄悄不画,报为 `layer_cap_exceeded`。

## 程序化底

加一个铺满画面的形状,对它应用一个生成器效果。模式有 `noise`、
`fractal`、`conicGradient`、`meshGradient`、`gradientField`、
`particles`、`lightLeak` 和 `gridPattern`。`colorA` 与 `colorB` 定两个
颜色;`scale`、`amount`、`angle`、`time` 和 `seed` 塑造场。要动起来,
设 `animate: true`,它会把当前时间线时间采样进效果。保持固定的 `seed`
得到可复现的帧。这个时钟会一直走;它不会让程序化场在片段边界回卷。
要无缝循环,用会回卷的片段动画,或在渲染的循环里对齐两端。

```json
{"op": "set_effects", "target": "Bed", "effects": [
  {"type": "generator", "mode": "meshGradient", "enabled": true,
   "colorA": "#10233c", "colorB": "#ec6b45", "scale": 6,
   "amount": 0.6, "seed": 9, "animate": true}]}
```

深色底出现色带时,在效果列表里、生成器或渐变的后面放一个固定种子的
`stylize` `dither`。抖动能打散 8-bit 的阶梯,但救不回源里已经丢掉的
精度。这个观感归 `color-motion` 讲。

## 用形状拼一块网格渐变

要各自移动的色块,就往一个底色上摞径向填充。每个椭圆是自己的片段、
自己的叠加轨,30–60% 不透明度,配一个宽到读不出边缘的 `blur` 效果:

```json
{"op": "add_shape_clip", "shape": {"kind": "ellipse",
 "x": 0.05, "y": 0.1, "width": 0.6, "height": 0.7,
 "fillStyle": {"type": "radial", "stops": [
   {"offset": 0, "color": "#5b8cff"}, {"offset": 1, "color": "#5b8cff00"}]}},
 "durationMs": 12000}
```

```json
{"op": "set_effects", "target": "Ellipse", "effects": [{"type": "blur", "radius": 120}]}
```

然后给每个斑块一条不同的 `loop`:`float` 配 `amplitude` 0.02–0.05,
`breathe` 配 `intensity` 0.03–0.08,周期互不整除——9000、13000、
17000ms——这样合成结果永远不会明显地重复。

深色底上,斑块的 `blendMode` 用 `screen` 或 `add` 是造光而不是盖光;
`multiply` 或 `soft-light` 是加深。这个选择比填充色更重要。

## 真正循环的循环

`float`、`breathe`、`rotate` 和 `hueShift` 生来就会回卷:它们起止同值,
所以 `durationMs` 是一个周期,接缝不可见。自定义循环曲线必须做到
同样的事——`t: 1` 处的值必须等于 `t: 0` 处的值,否则底衬每个周期跳
一次。

`kenBurns` 是例外:它是横贯整条片段的一次单程,在终点上保持,所以它
不重复,它的 `durationMs` 也被无视。长底上的一段 `kenBurns` 漂移走完
就呆住不动。长片段上要持续漂移,改用长周期的 `float`。

读起来是氛围的周期:8000–30000ms。低于约 5000ms 读起来像屏保,而且
它前面的文字变得难以注视。

## 把它压在后面

- 背景坐在**最高**的轨道索引上,因为最低的画在最上层。一块盖住画面
  的底衬是轨道顺序错误,不是不透明度问题。
- 对比:先别碰不透明度,先用 `color` 效果把 `saturation` 压到 0.5–0.7、
  `brightness` 略负。去饱和的底读起来是纵深,褪色的底读起来是失误。
- 振幅:底衬里任何东西的行程都不该超过画面约 3%,否则眼睛开始追它。
- 底衬的亮区压过文字时,给前景配一块压暗层:40–60% 不透明度的黑色
  `rect` 形状,轨道索引夹在底衬与文字之间。`validate_timeline` 对测
  得出的东西报 `text_illegible`,对渐变什么都不说——看帧。

## 生成一张底

程序化模式画不出的烟、墨、云,就生成视频。用
`find_model` 带 `text_to_video`,然后 `generate_video`,再用
`add_media_clip` 挂上返回的 `asset://` 引用。`find_model` 的结果会为
它选中的产品线点名一个 `prompting_skill`;加载它,因为每条产品线要的
提示词形状都不同。无论哪条线,提示词都写缓慢、均匀的运动,无剪切、
无主体;带事件的底是镜头,不是底。在会写原生音频的产品线上
(Seedance 2、Veo 3、MiniMax H3、Kling 2.6 及之后),底衬自带声轨:
要么把它当房间底噪写进简报并保留,要么把这条片段静音、用你本来要
用的那条轨——哪条算数由 `video-audio-continuity` 裁决。

生成的片段不会循环。盖更长的序列,靠复制并叠化接缝:让拷贝在同一条
轨上重叠 800–1500ms,无需任何调用就叠化;或对进场的拷贝设
`set_transition` `crossfade`,把长度钉住。

## 降低运动量,以及知道何时停手

底衬生来就是垫在东西下面的。给它加第二个点子之前,先检查第一个
点子到底有没有用——慢到看不见的漂移是花在零上的预算,太快的那个则
是没人读标题的原因。一个点子、一个振幅、一个周期族。

## 检查

- `preview_timeline_frame` 带 `range` 扫一整个周期、`sheet: true` 拼成
  小样图——循环是均匀呼吸还是一顿一顿,只有这么看得出来。采三个
  时码看不出接缝。
- 同一次扫掠把前景打开,确认文字在周期的每一点上仍读得清,而不是
  只在你碰巧看的地方清。
- 迭代时用低 `preview_scale` 跑 `render_timeline`。底衬要按秒评判,
  静帧说不出它安不安。
