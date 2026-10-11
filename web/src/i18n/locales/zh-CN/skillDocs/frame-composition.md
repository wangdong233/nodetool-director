# 画面构图 → 时间线上的调度

东西坐在哪、画面有多深、镜头怎么在里面移动。`motion-graphics` 是搭建
循环;`timeline-edit-ops` 承载操作契约。本技能决定你传给它们的坐标。

## 四套坐标空间,混用就是最常见的 bug

| 是什么 | 空间 | 读作 |
|---|---|---|
| `shapeStyle.x/y/width/height`、`x2/y2`、`d` | **画面**的 0..1 | 0.5 是画面的正中 |
| `set_mask` 的 `x/y/width/height`、`d` | **图层**的 0..1 | 0.5 是片段自己的正中,不是画面的 |
| `positionX` / `positionY` 曲线 | 画布像素 | 绝对值,按 `replace` 折叠 |
| `offsetX` / `offsetY` 曲线 | 画布像素,叠加 | 与其余一切组合 |
| `slide` `distance`、`kenBurns` `driftX/driftY` | 画面宽或高的分数 | 0.3 走过画面的 30% |
| `anchorX` / `anchorY` | 0..1 | 缩放或旋转的支点 |
| `textStyle.fontSizePx` | 序列像素 | 对着 `get_timeline` 的 `height`,不是预览宽度 |
| `transform.depthPx`、`camera2d.position/depthPx/focalLengthPx` | 序列像素 | 透视;片段深度还决定同轨内的层叠顺序 |
| `layout.gap`、`layout.padding` | 序列像素 | Flex 容器间距,对着子元素渲染出的盒子量 |

算任何东西之前,先从 `get_timeline` 读 `width`、`height` 与 `fps`。按
1920×1080 编写、存进 1080×1920 序列的布局,错的不只一个裁切。

## 文字交给容器摆放

改用 `@nodetool-ai/sandbox-timeline` 搭建(什么时候该写代码见
`motion-graphics`)?**容器决定子元素坐在哪——你几乎从不为文字写
`x`/`y`。** `s.stack(children, o)` 与 `s.row(children, o)` 会建一个真正的
Yoga flex 容器,并把 `children` 重新挂为它的真实子元素——可以随意嵌套,
`stack` 组成的 `row`、内嵌 `row` 的 `stack` 都能正确解析。文字子元素会
回流到 Yoga 给它的任何宽度,而不是猜一个行长。

容器自身在画面里的落点由 `o.at`(默认画面中心)加 `o.anchor`(默认
`"center"`)决定:`anchor` 指容器*计算出的*盒子上哪个点落在 `at`——名字
`"left"` 就是把盒子的左边缘放到 `at.x`,不需要量兄弟元素的宽度。具名锚点:
`"top-left"`、`"top"`、`"top-right"`、`"left"`、`"center"`、`"right"`、
`"bottom-left"`、`"bottom"`、`"bottom-right"`,也可以直接传 `{x, y}` 分数。
`o.align`(交叉轴,默认 `"start"`)与 `o.justify`(主轴,不设)就是 Yoga
的 `alignItems`/`justifyContent`。子元素自己的弹性尺寸写在它自己那次调用
的 `o.flexItem` 上(`grow`、`width`、`alignSelf`……);`rect`/`ellipse`
(或任何片段)上的 `absolute: true` 会把它拿出流,并拉伸到恰好填满其 flex
父容器的盒子——一块底板贴在卡片文字后面,零像素算术。

只有装饰(一枚散落的记号、一个背景形状)或与阅读顺序无关的刻意自由摆放,
才去写显式 `x`/`y`。观众要读的一切——标题、眉题、说明、一排数据——都进
容器。

**标题块**——眉题、标题、副题,按同一节奏纵向排:

```js
// fragment
const kicker = s.kicker("LAUNCHING TODAY");
const title = s.text("Round-ups", { size: 120, weight: 700 });
const sub = s.text("on every card", { size: 40 });
s.stack([kicker, title, sub], { gap: 20 });
```

**组合标**——标识旁放标准字,一行:

```js
// fragment
const mark = s.image(logoAssetId);
const wordmark = s.text("Northwind", { size: 64, weight: 700 });
s.row([mark, wordmark], { gap: 16, align: "center" });
```

**卡片**——一块绝对定位的底板上,一个带内边距的纵列:

```js
// fragment
const plate = s.rect(1, 1, "#0c2a21", { r: 24, absolute: true });
const heading = s.text("Plan Pro", { size: 48, weight: 700 });
const price = s.text("$12/mo", { size: 32 });
s.stack([plate, heading, price], { gap: 8, padding: 24 });
```

**列表 / 网格**——一行排满宽度后自动折成网格:

```js
// fragment
const chips = ["Round-ups", "Instant transfers", "No fees"].map((t) => s.pill(t));
s.row(chips, { gap: 12, wrap: true });
```

## 网格

横屏十二列,竖屏六列。1920 宽的画面、100px 外边距、24px 列间距:

```
content = 1920 − 2×100 = 1720
column  = (1720 − 11×24) / 12 = 121.3px
```

一切间距取 8 的倍数。正文文案的 `fontSizePx` 落在画面高度的 2.5–4%;
低于 2.5%,`validate_timeline` 报 `text_illegible`。往网格上放文字之前,
先从 `motion-direction` § Typography 选定字体族、字重与标题比例。

## 一个视觉焦点

把主体放在三分交点上,不放心正中,除非作品刻意用对称。交点是:

| 序列 | 三分交点(px) |
|---|---|
| 1920×1080 | x 640 / 1280,y 360 / 720 |
| 1080×1920 | x 360 / 720,y 640 / 1280 |
| 1080×1080 | x 360 / 720,y 360 / 720 |

视线动线按**大小、再对比、再颜色、再位置**排序。一帧一个主体;其余
一切服务它。在它周围留白——边缘填满一整圈的画面读起来廉价,运动也没
处可去。

## 景深:平面与轨道顺序

把画面拆成背景、中景、前景。轨道索引控制**轨道之间**的顺序:索引最低
的画在最上层。同一条轨道内,片段按 `transform.depthPx` 排序:更远的值
先画,更近的正值后画、盖在前面。同一个深度也在序列的 `camera2d` 下
控制透视。把片段挪到另一条轨道改变的是层叠顺序,不是摄影机距离。

| 平面 | 建议轨道索引 | 片段深度 | 运动与观感 |
|---|---|---|---|
| 前景 | 最低 | 更近,正值 | 视线跟随的那个运动;焦点不转移就保持锐利 |
| 中景 | 居中 | 零附近 | 主体与对比峰值 |
| 背景 | 最高 | 更远,负值 | 小幅漂移,更低对比 |

平面视差:三档速度跑过同一扇窗。每层一个 `kenBurns`、`zoom: 0`、各配
不同漂移是 `fullClip` 预设,三层自动覆盖同一时段:

```json
{"role": "loop", "preset": "kenBurns",
 "params": {"zoom": 0, "driftX": -0.02, "driftY": 0}}
```

背景 −0.02、中景 −0.06、前景 −0.12。一层一个速度不叫视差,那只是
模板在动。

共享的 2.5D 运镜,给各层不同的 `transform.depthPx`,再对序列的
`camera2d` 写关键帧。它以绝对 `timeMs` 关键帧线性插值摄影机位置与
深度。`focusDepthPx` 与 `aperturePx` 控制景深。用一次摄影机运动把各
平面连起来,然后检查中间帧有没有多余缩放或模糊。轨道索引管跨轨层叠,
片段深度管同轨顺序。

倾斜的卡片墙,把卡片编到一个带墙面 2D `rotation`、`rotationX` 和
`perspective` 的组里。每张卡自己的 `depthPx` 与滚动曲线,再用
`camera2d` 做共享推进与景深模糊。这是平面卡片投影:在多个帧上预览
整面墙,检查间距、层叠与模糊读起来是不是一个整体。

要有自己形状的运动,改写 `custom` 曲线并留意角色:`in` 窗口在它之前
保持其 `t=0` 的值、之后不再贡献;`out` 窗口在它之后保持其 `t=1` 的值;
`loop` 循环重复自己的周期——所以必须停在落点上的单程位移要用 `out`,
而 `loop` 曲线必须回到起始值,否则每个周期跳一次。

各层必须在运动中保持相对关系时,把整套编组:先 `add_group`,再对组做
动画。子层保留自己的轨道,所以编组永远不改变谁盖住谁。要在拼好的画面
上做转场,把 `transitionIn` 设在组上。子层仍留在各自的轨道上,转场对
它们预合成出的那个面起一次作用。

形状几何先在一张画面大小的源面里栅格化,片段才被摆放。归一化的
`shapeStyle` 几何保持在那张面之内,然后用 `transform.position` 或
自定义 `offsetX`/`offsetY` 曲线移动片段或父组,做滚动墙与飞卡。写出
源面之外的几何在摆放之前就被裁掉。

## 运镜

在序列运镜与单片段运动之间选。`camera2d` 关键帧让视野跨所有深度平面
移动。图层动画只动一条片段,它的 `anchor` 决定缩放或旋转绕哪里转。

| 运镜 | 做法 | 时机 |
|---|---|---|
| 推近/拉远 | `kenBurns`,`zoom` 0.08–0.2,`direction` 向内或向外 | 1500–4000ms,`easeInOut` |
| 漂移 | `kenBurns` 的 `driftX` / `driftY`,±0.02–0.08 | 与缩放同窗 |
| 横移 | 贯穿片段的 `offsetX` `custom` 曲线 | 800–2000ms,`easeInOut` |
| 甩 | `offsetX` 走 150–250ms,配 12–24px 的 `blur` 效果 | 在剪切上,绝不在镜中 |
| 跟随 | `offsetX` 与 `offsetY` 追踪主体,主体保持偏心、朝向前方 | 动作要多久就多久 |

`camera2d` 是文档字段。`set_clip_params` 改片段的 `transform`,但拒绝
`camera2d`、`layout`、`repeater`、`motionBlur` 和其他新的文档字段。
用 `get_timeline` 读完整文档,改相关字段,再用 `set_timeline_document`
写回完整文档。轨道、片段、标记、速度、设置、媒体轨、模板标识和其余
字段都要留在写入里。操作契约归 `timeline-edit-ops` 承载。

`kenBurns` 是 `fullClip`:它无视 `durationMs` 与 `delayMs`,贯穿整条片段。
要把一次推近对到更短的时窗,改写成 `custom` 的 `scale` 曲线。

一拍一运镜。推近加横移加旋转读起来是混乱,三者折叠成一个没人选过的
方向。

## 入场与出场

顺着阅读方向的运动显得自然;反着走读起来像在倒退。让 `slide` 的
`direction` 对齐意图——它指明元素**从**哪条边来:

- 新内容:从右,或从下。
- 关闭或撤销:倒放入场。
- 下钻进入:`pop`,或用缩放曲线代替位移。

从最近的边进出。`distance` 保持在 0.35 以下,否则位移读起来是整个模板
在滑——更长的移动要配同一时窗上的缩放或透明度变化。剪切上同一套
词汇:`wipe`、`push` 与 `slide` 的 `set_transition` `direction` 同样指明
进场片段从哪条边来。

## 安全区

标题、logo、脸与行动号召留在边距以内。数字是画面的分数,对着 `width`
和 `height` 换算。

| 宽高比 | 上 | 下 | 两侧 |
|---|---|---|---|
| 16:9 | 5% | 5% | 5% |
| 9:16 | 12–14% | 18–20% | 6% |
| 1:1 | 7% | 7% | 7% |
| 4:5 | 8% | 8% | 6% |

1080×1920 上,可用区带大约在 y 250 到 y 1570。字幕片段默认就坐在
`bottomMarginFrac` 0.12,在部分平台已落进手机 UI 区——抬它,别想当然。

## 一套布局,多种宽高比

以最宽的目标为母版,焦点放在中央带内,再为竖屏**重排**:标题挪到主体
上方,主体从底部 UI 区拉上来,`fontSizePx` 提高约 20%。把 16:9 的布局
裁成 9:16,切掉的是外侧几列里的东西——通常正是 logo 和行动号召。

写代码搭建时,重排通常只是上面容器的一次选项改动——把 `s.row` 换成
`s.stack`(或改它的 `align`/`justify`),或挪一个新的 `at`/`anchor`——
而不是重建每个子元素的 `x`/`y`。

在 op 路径上,编组片段上的 `layout: {display: "flex", flexDirection:
"row" | "column", gap}` 让它的真实子元素(它们的 `parentId` 指名编组)
按普通 CSS flexbox 排布——`justifyContent`/`alignItems` 负责定位,
`padding` 给容器留内边距。文字后面的形状,在装着这段文字、带内边距的
flex 纵列里给形状设 `flexItem: {position: "absolute", inset: 0}`:
形状的盒子随文字带边距的盒子改变尺寸——含动画中的字号——零手动像素
算术。这些关系省去每次改文字都重算像素。16:9 文档做 9:16 仍要单独排
一遍版,并在那个尺寸下核对安全区。

## 检查画面,不是文档

`preview_timeline_frame` 合成的是真实画面——每条轨道依序、变换与透明度
应用到位、动画走到一半。把它随帧返回的图层清单摆在旁边读:它自栈顶
向下点名每层的 `z_index`、`opacity` 与擦除进度,大多数调度问题不看一个
像素就能回答。

在每个运动的中点预览,不在两端。帧抓得住、校验器抓不住的:滑出画面的
标题、盖住了本该挨着的脸的压暗层、因两条轨道索引颠倒而压在错误元素下
的下三分之一条、因为挂在音频轨上而永远不绘制的图层。

## 收尾自检

- 一个视觉焦点,落在三分交点上,或刻意居中。
- 每个元素归入一条管层叠顺序的轨道;摄影机动时再归入一个深度平面。
- 一次摄影机运动或带缓动的图层运动,800–4000ms。
- 入场走最近的边,`distance` ≤ 0.35 或配第二通道。
- 关键内容在每个目标宽高比下都在安全边距内,竖屏重排而非裁切。
- 在中点预览过,图层栈读过了。
