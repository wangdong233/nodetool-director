# 运动中的色彩 → 色板、调色与什么能动

先为形状与文字选色,再围着它们调画面。写定的颜色、渐变档位和效果
字段如今既能走预设调色通道,也能走动画样式轨。

`motion-graphics` 承载这里点名各调用的操作契约。`motion-direction` 决定
色彩是不是这条片子要动的通道之一。

## 建一套克制的色板

一个主色、一个强调色、两三个中性色。深度从明度与彩度来,不从更多
色相来——多出来的色相互相抢注意力,读起来业余。

挑色时用 OKLCH 推理(`oklch(L C H)`:感知明度、彩度、色相角),因为
按住 L 与 C 转 H 得到的色相视觉权重相等,HSL 做不到。静态颜色写进文档
时优先用 hex;共享的解析器在样式轨里也收具名色、RGB 与 HSL。

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
| 画面 | `set_effects`——`color`、`curves`、`levels`、`liftGammaGain`、`lut`、`stylize`、`generator` |

渐变填充是 `{type: "linear", angle, stops}`、`{type: "radial", stops}` 或
`{type: "solid", color}`。渐变点偏移是 0..1,所以填充与形状大小无关:

```json
{"op": "add_shape_clip", "shape": {"kind": "rect", "x": 0, "y": 0,
 "width": 1, "height": 1,
 "fillStyle": {"type": "linear", "angle": 90, "stops": [
   {"offset": 0, "color": "#0b0f1a"}, {"offset": 1, "color": "#1b2440"}]}}}
```

## 让写定的颜色与调色动起来

在存储的动画上用 `styleTracks`,插值写定的颜色或渐变字段。受支持的
目标包括 `text.color`、`shape.fill`、`shape.stroke`、
`text.fill.angle`、`text.fill.stops.0.color`、`shape.fillStyle.angle`,
以及 `shape.fillStyle.stops.0.color` 或 `.offset`。目标必须指向片段
已有的字段。文字渐变会隐藏 `text.color`;`shapeStyle.fillStyle` 会隐藏
`shape.fill`。颜色关键帧接受受支持的 CSS 颜色,含 hex、RGB、HSL 与
具名色。效果颜色轨可以指向生成器上的 `effect.<effect-id>.colorA` 或
`.colorB`,以及投影、色度键或用色的 stylize 模式上的 `.color`:
`lightRays`、`lensFlare`、`innerShadow`、`innerGlow`、`edgeHighlight`
和 `lightLeakOverlay`。辉光渲染器不用 `glow.color`。字段必须已经存在
于效果上。`mode` 这类字符串字段不是颜色目标。

一份带文字渐变的文档,下面这条动画移动它的第一个渐变点:

```json
{"id": "colour-shift", "role": "in", "preset": "fade", "durationMs": 600,
 "styleTracks": [{"target": "text.fill.stops.0.color", "keyframes": [
   {"t": 0, "value": "#8bd5ff"}, {"t": 1, "value": "#ffffff"}]}]}
```

`edit_timeline` 的 `animate_clip` 输入不收 `styleTracks`;它会丢弃该
字段。这些动画要在完整文档里经 `set_timeline_document` 写入——该调用
先校验再写入,并快照前一版文档;契约见 `motion-graphics`。要走
`animate_clip` 做定点编辑,就用数值调色预设或自定义曲线。三种常用
做法:

1. **动画调色通道。**`hue`(度,相加)、`saturation`(0..4,相乘)、
   `brightness`(−1..1,相加)、`contrast`(0..4,相乘)、`temperature`
   与 `tint`(−1..1,相加)全是可动画属性。`saturation` 从 0 到 1 的
   `custom` 曲线就是一次色彩绽放;`colorFade` 是它的预设形态,
   `hueShift` 每个 `loop` 周期转满一圈。
2. **动一条样式轨。**片段已带该样式时,移动形状或文字颜色,或一个
   渐变点。
3. **叠化两个片段。**变化还需要不同纹理或排版时,让两个填色不同的
   形状同轨重叠、在它们之间叠化。

按旋转插值色相不等于在两个颜色之间插值:`hue` 走色环的路,蓝到琥珀
会路过绿,除非用负值反向走。

## 调画面

`set_effects` 替换整条链。空间类、stylize、生成器与 LUT 步骤按列表
顺序生效。渲染器会把旧式的颜色与模糊字段聚合进靠后的遍,所以重排两个
`color` 效果并不会造出两次独立调色。共享观感必须叠在单镜校正之后时,
用一条独立的调整片段。

按这个顺序选校正,然后对着最终渲染判断:

1. `levels`——先定黑位与白位。
2. `color` 带 `brightness`、`temperature` 与 `tint`——曝光与色偏。
3. `curves` 或 `color` 的 `contrast`——影调范围。
4. `color` 的 `saturation` 与 `hue`——中间调颜色。
5. `liftGammaGain`——分离暗部与亮部颜色。保持克制。
6. `lut`——把 3D `.cube` 表的内容粘进 `cube`,混合比例设 `intensity`。
   1D 表会被拒。LUT 的定义域与表值可以超出 0..1;渲染器在插值后对
   最终颜色做钳制。
7. `vignette`,以及任何 `glow`,收束观感。

中性值即恒等:`brightness` 0、`contrast` 1、`saturation` 1、`hue` 0、
`gamma` 1、`lift` `[0,0,0]`、`gain` `[1,1,1]`。`lut` 效果要求完整的
`.cube` 文本。

序列里每一镜用同一套调色,否则它们剪不到一起。某一镜需要单独校正时,
先把它往其他镜的方向校,再套共享观感。

## 在帧上、在运动中检查调色

`preview_timeline_frame` 用 Canvas 2D 像素遍实现受支持的效果链,包括
调色、LUT、stylize 模式、生成器与抖动。判断细微效果或半透明边缘时,
把同一时码的帧与 GPU 渲染对比。缺失的离屏面会出现在该帧的 `degraded`
报告里。帧把不支持的效果类型列进 `effects_not_applied`;
`validate_timeline` 把它们报为 `unknown_effect`。

合成按存储的编码 sRGB 通道值混合,合并图层前不做线性化。50% 混合就按
那个输出判断,别期待线性光的中点。

## 对比与可读性

`validate_timeline` 对低于画面高度 2.5% 的文字、或与自己的 `background`
底板(或其后的全画面形状)对比不足 3:1 的文字,报 `text_illegible`。这
项检查拒绝瞎猜:解析不了的颜色、半透明底板、渐变填充文字、或一块无法
证明在文字后面的背景,都**不产生任何发现**。静默通过不算通过——看帧。

三种修法,从最便宜起:文字样式上的 `background` 压暗层、字形底下的
`stroke`、或画面与文字之间一层 40–60% 黑的形状片段。压暗层放在两者之间
的轨道索引上,因为索引最低的画在最上层。

## 色带与发闷的中点

暗色画面上的宽渐变会出色带。在渐变后面加
`{"type":"stylize","mode":"dither","enabled":true,"amount":1,"seed":4}`,
配固定种子得到可复现的帧。抖动减少可见的 8-bit 阶梯;它救不回源媒体
已经丢掉的精度,也不能保证视频编码器保留噪声。也可以缩短渐变跨度,
或把渐变点在明度上拉近。要的是可见纹理那个观感时,`mode: "noise"` 或
`"fractal"` 的 `generator` 效果正合适,而不只是修色带。

中段发灰的渐变,是渐变点路过了低彩度。在中点加第三个渐变点、选彩度
托住的值,别信两点的路径。

## 色彩作为运动通道

色彩扛着与运动相同的三层排序。主角可以独占画面里唯一的饱和强调色,
而底衬在 `saturation` 0.6 的 `color` 效果下去饱和——眼睛在任何运动开始
前就读出了这套层级。`flash` 强调(一次亮度尖峰)是可用的最响的颜色
事件;一条片子一次。

## 收尾自检

- 一个主色、一个强调色、两三个中性色,中性色向主色偏调。
- 静态颜色写成受支持的 CSS 记法,优先 hex。
- 效果链按调色顺序,同一观感贯穿成片每一镜。
- 观感在预览帧与一段渲染上各查过。
- 文字在实际背景上读得清,靠看确认。
