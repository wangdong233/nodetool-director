# 运动中的色彩 → 色板、调色与什么能动

两件不同的活:你写进形状与文字的颜色,和你罩在画面上的调色。它们在
可动画的调色通道相遇——那是时间线上唯一会动的颜色值。

`motion-graphics` 承载这里点名各调用的操作契约。`motion-direction` 决定
色彩是不是这条片子要动的通道之一。

## 建一套克制的色板

一个主色、一个强调色、两三个中性色。深度从明度与彩度来,不从更多
色相来——多出来的色相互相抢注意力,读起来业余。

挑色时用 OKLCH 推理(`oklch(L C H)`:感知明度、彩度、色相角),因为
按住 L 与 C 转 H 得到的色相视觉权重相等,HSL 做不到。然后**把 hex 写进
文档**:`color`、`fill` 与所有效果颜色都是 CSS 颜色字符串,一个所有界面
都解析得了的 hex,在这里比某个可能解析不了的记法值钱。

深色底板上,让强调色靠高明度与中彩度跳出来,而不是拉满饱和。炸开的
饱和强调色在黑底上发抖。

中性色向主色相方向稍微偏一点色调。彩色元素旁边放纯灰,读起来像没
接上。

## 色彩住在哪里

| 载面 | 字段 |
|---|---|
| 文字 | `textStyle.color`,外加 `stroke.color`、`shadow.color`、`background.color` |
| 文字,渐变 | `textStyle.fill`——设了就压过 `color` |
| 形状 | `shapeStyle.fill` 与 `stroke`,渐变用 `shapeStyle.fillStyle` |
| 字幕 | `captionStyle.color`、`activeColor`、`outline`、`background` |
| 转场 | `set_transition` 的 `dipToColor` `color` |
| 画面 | `set_effects`——`color`、`curves`、`levels`、`liftGammaGain` |

渐变填充是 `{type: "linear", angle, stops}`、`{type: "radial", stops}` 或
`{type: "solid", color}`。渐变点偏移是 0..1,所以填充与形状大小无关:

```json
{"op": "add_shape_clip", "shape": {"kind": "rect", "x": 0, "y": 0,
 "width": 1, "height": 1,
 "fillStyle": {"type": "linear", "angle": 90, "stops": [
   {"offset": 0, "color": "#0b0f1a"}, {"offset": 1, "color": "#1b2440"}]}}}
```

## 色彩不补间——调色才补间

时间线上没有任何东西会把一个 hex 插值到另一个。`textStyle.color` 与
`shapeStyle.fill` 在片段一生中固定。让颜色动起来的三条路,按"是正确
答案"的频率排序:

1. **动画调色通道。**`hue`(度,相加)、`saturation`(0..4,相乘)、
   `brightness`(−1..1,相加)、`contrast`(0..4,相乘)、`temperature`
   与 `tint`(−1..1,相加)全是可动画属性。`saturation` 从 0 到 1 的
   `custom` 曲线就是一次色彩绽放;`colorFade` 是它的预设形态,
   `hueShift` 每个 `loop` 周期转满一圈。
2. **叠化两个片段。**两个填色不同的形状同轨重叠,在它们之间叠化——
   这是在两个写定的颜色之间移动的唯一办法,而不是从其中一个出发
   绕色环。
3. **重写片段。**观感只在一次剪切处变化的场合,第二个片段比任何曲线
   都好推理。

按旋转插值色相不等于在两个颜色之间插值:`hue` 走色环的路,蓝到琥珀
会路过绿,除非用负值反向走。

## 按序调色——效果链按你给的顺序生效

`set_effects` 替换整条链并按列表顺序生效,所以列表**就是**调色顺序。
改顺序就是改结果。

1. `levels`——先定黑位与白位。
2. `color` 带 `brightness`、`temperature` 与 `tint`——曝光与色偏。
3. `curves` 或 `color` 的 `contrast`——影调范围。
4. `color` 的 `saturation` 与 `hue`——中间调颜色。
5. `liftGammaGain`——分离色调:`lift` 让暗部偏冷,`gain` 让亮部偏暖。
   青色暗部加暖亮部是电影感的默认,因为它讨好肤色。保持克制。
6. `vignette`,以及任何 `glow`,收尾——它们收拢画面。

中性值即恒等:`brightness` 0、`contrast` 1、`saturation` 1、`hue` 0、
`gamma` 1、`lift` `[0,0,0]`、`gain` `[1,1,1]`。点了名却什么都没设的
效果不做事,而不是被拒。

序列里每一镜用同一套调色,否则它们剪不到一起。某一镜需要单独校正时,
先把它往其他镜的方向校,再套共享观感。

## 调色看渲染,不看预览帧

`preview_timeline_frame` 是 2D 合成器。它把 `color` 与 `blur` 映射到画布
滤镜,而对 `chromaKey`、`vignette`、`sharpen` 以及 `color` 效果的
`temperature` 与 `tint` 字段**没有等价物**。它会把这些列进
`effects_not_applied`,而不是悄悄丢弃。运动不受影响——用帧判断时序与
摆位,用 `render_timeline` 判断观感。

`unknown_effect` 表示这个构建完全应用不了该类型,图层按未调色绘制。

## 对比与可读性

`validate_timeline` 对低于画面高度 2.5% 的文字、或与自己的 `background`
底板(或其后的全画面形状)对比不足 3:1 的文字,报 `text_illegible`。这
项检查拒绝瞎猜:解析不了的颜色、半透明底板、渐变填充文字、或一块无法
证明在文字后面的背景,都**不产生任何发现**。静默通过不算通过——看帧。

三种修法,从最便宜起:文字样式上的 `background` 压暗层、字形底下的
`stroke`、或画面与文字之间一层 40–60% 黑的形状片段。压暗层放在两者之间
的轨道索引上,因为索引最低的画在最上层。

## 色带与发闷的中点

暗色画面上的宽渐变会出色带。时间线上没有噪声生成器,所以修法是:
缩短渐变的跨度、把渐变点在明度上拉近,或在其上铺一层 3–6% 不透明度的
纹理图像片段,`blendMode` 用 `overlay` 或 `soft-light`。

中段发灰的渐变,是渐变点路过了低彩度。在中点加第三个渐变点、选彩度
托住的值,别信两点的路径。

## 色彩作为运动通道

色彩扛着与运动相同的三层排序。主角可以独占画面里唯一的饱和强调色,
而底衬在 `saturation` 0.6 的 `color` 效果下去饱和——眼睛在任何运动开始
前就读出了这套层级。`flash` 强调(一次亮度尖峰)是可用的最响的颜色
事件;一条片子一次。

## 收尾自检

- 一个主色、一个强调色、两三个中性色,中性色向主色偏调。
- 每个颜色都写成文档解析得了的 hex。
- 效果链按调色顺序,同一观感贯穿成片每一镜。
- 画面预览画不出的东西,用渲染判断。
- 文字在实际背景上读得清,靠看确认。
