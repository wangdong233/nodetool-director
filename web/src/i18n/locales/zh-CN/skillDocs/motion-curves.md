# 运动曲线 → 没有现成预设的动画

`{"preset": "custom"}` 恰好携带 `curves`(你手写的关键帧)或 `code`
(一段 JS 代码体,宿主侧一次性烘焙成曲线)之一。曲线驱动
`wipeProgress` 时加 `mask`。

`motion-graphics` 承载操作契约和预设目录——本篇就是从那里出来的逃生
口。`motion-principles` 给出一条曲线在写关键帧之前该命中的时长与形状。

## 什么时候写一条

预设接近但不对,就立刻写曲线。目录是七种入场形状加一小把节拍——
运动的起点,不是运动的终点——每个标题都 `pop` 进场的片子读起来像
模板。一条曲线只花一个字段加几个数字,而下面的配方就是值得伸手的
那几个形状:过冲两次的入场、一次移动中间的驻留、两条通道各走各的
时刻表、一次衰减、一条弧线、一次抖动、一次路径勾画。

有两种形状不需要曲线,硬写只会让文档更难读:单次过冲与物理落定已经
是 `easing` 字符串。普通预设上的 `cubic-bezier(0.16,1,0.3,1)` 和
`spring(180,12,1)` 就把两件事都做了。再往后的都归本篇。

## 手写曲线

```json
{"op": "animate_clip", "target": "Title", "animations": [
  {"role": "in", "preset": "custom", "durationMs": 600,
   "curves": [
     {"property": "offsetY", "keyframes": [
       {"t": 0, "value": 80}, {"t": 0.7, "value": -12, "easing": "easeOut"},
       {"t": 1, "value": 0, "easing": "easeInOut"}]},
     {"property": "opacity", "keyframes": [
       {"t": 0, "value": 0}, {"t": 0.4, "value": 1}]}]}]}
```

`t` 在动画的**时窗**内跑 0..1,不在片段内。关键帧上的 `easing`,缓动的
是**结束**在那里的那一段。关键帧会被排序,`t` 被钳到 0..1,而够不到
两端的曲线按保持端值延长——所以采样 0.05..0.95,得到的就是它看起来的
那个样子。

上限:每条动画 16 条曲线,每个属性一条,各 4096 个关键帧。

`durationMs` 默认取片段自己的时长,所以除非你另说,曲线铺满整条
片段。

## 通道,以及它们怎么合并

几条动画可以驱动同一条通道。怎么折叠,决定第二条是叠加到第一条上,
还是把它扔掉。

| 折叠 | 通道 | 恒等值 | 结果 |
|---|---|---|---|
| 相加 | `offsetX`、`offsetY`、`rotation`(弧度)、`blur`(px)、`brightness`(−1..1)、`hue`(度)、`temperature`、`tint` | 0 | 数值求和 |
| 相乘 | `scale`、`scaleX`、`scaleY`、`opacity`(0..1)、`saturation`(0..4)、`contrast`(0..4) | 1 | 数值相乘 |
| 取小 | `wipeProgress`(0..1) | 1 | 最紧的那次擦除获胜 |
| 替换 | `positionX`、`positionY`(画布 px)、`anchorX`、`anchorY`(0..1)、`trimStart`、`trimEnd`(0..1) | 无 | 文档顺序里最后那条赢;其余被丢弃 |

替换那一行是陷阱。两条动画在同一批时刻驱动 `positionX`,意味着其中
一条什么都不做,报为 `replace_curves_overlap`。片段要与其他运动组合,
就用 `offsetX` 挪它;`positionX` 只留给一个别的什么都不碰的绝对摆位。

最后一个关键帧落在恒等值上,除非你就是要片段停在曲线停下的地方——
并且记住,留下什么由角色决定:`in` 时窗在它之前保持其 `t: 0` 的值、
之后不再贡献,`out` 时窗在它之后保持其 `t: 1` 的值,`emphasis` 两头
都不保持,`loop` 重复自己的周期——所以循环曲线必须停在它出发的
值上。

`list_animation_presets` 从引擎报告这张表。某条通道的取值范围要紧时,
到那里读,别凭记忆。

## 代码体

一段 JavaScript 代码体,编写时在 QuickJS 沙箱里运行**一次**。它返回
关键帧;关键帧存在片段上;每个渲染器采样的是那些。没有任何东西逐帧
求值——这就是代码体无法对播放做出反应的原因,也是同一条动画在预览、
导出和无头合成器里长得一模一样的原因。

烘焙是密闭的:没有工具带、没有 `nodetool.*`、没有网络、没有密钥。只有
算术、10 秒上限和 `inputs`:

| `inputs` 字段 | 它是什么 |
|---|---|
| `role` | `in`、`out`、`emphasis` 或 `loop` |
| `durationMs` | 动画自己的时窗 |
| `clipDurationMs` | 它所在的那条片段 |
| `canvasWidth`、`canvasHeight` | 序列像素——把归一化距离换算成 px 在这里做 |
| `params` | 动画的 `params`,原样送达 |
| `staggerCount` | 文字片段拆成的单元数,或 0 |
| `sampleCount` | 连续函数的建议采样密度 |

返回 `{curves}`——与上面 JSON 同一个形状——或 `{samples}`,每个
时间点一袋:

```js
const n = inputs.sampleCount;
const samples = [];
for (let i = 0; i < n; i++) {
  const t = i / (n - 1);
  samples.push({ t, offsetY: ..., opacity: ... });
}
return { samples };
```

两个都返回是错误,一个都不返回也是。某个属性在部分采样点上有、部分
上没有,是错误而不是一个洞——跨着缺口插值会发明没人写过的运动。
一个采样点要有一个有限数值的 `t`;采样点上的 `easing` 可选,作用于
结束在那里的那一段。至多 4096 个采样点。

因为烘焙只跑一次,用了 `Math.random` 的代码体被冻结在它抽到的那一次
值上:结果从此永远稳定,但重新烘焙会给出不同的运动。同一段代码体
必须两次产出同一段抖动时,给你自己的生成器配上种子。

## 配方

**过冲后落定。**两次过冲,第二次更小——单条 `easeOutBack` 表达不了
的东西。

```js
const p = [[0, 0.6], [0.45, 1.09], [0.68, 0.97], [0.85, 1.02], [1, 1]];
return { curves: [{ property: "scale",
  keyframes: p.map(([t, value]) => ({ t, value, easing: "easeInOut" })) }] };
```

**衰减弹跳。**逐渐死掉、恰好停在静止上的几次跳。

```js
const n = inputs.sampleCount, h = 0.06 * inputs.canvasHeight, hops = 3;
const samples = [];
for (let i = 0; i < n; i++) {
  const t = i / (n - 1);
  samples.push({ t, offsetY: -h * Math.abs(Math.sin(Math.PI * hops * t)) * (1 - t) });
}
return { samples };
```

**预备动作。**主动作之前的一次反向预备,占时窗的 60–120ms。

```js
return { curves: [{ property: "offsetY", keyframes: [
  { t: 0, value: 0 }, { t: 0.18, value: 10, easing: "easeInOut" },
  { t: 0.8, value: -4, easing: "easeOut" }, { t: 1, value: 0 }] }] };
```

**抖动。**确定性噪声,沙箱对 wiggle 表达式的回答。一个带种子的生成器,
重新烘焙也复现。

```js
const n = inputs.sampleCount;
const amp = Number(inputs.params.amplitude ?? 6);
let seed = Number(inputs.params.seed ?? 1);
const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5;
const samples = [];
for (let i = 0; i < n; i++) {
  const t = i / (n - 1);
  const fade = Math.min(1, 4 * t, 4 * (1 - t));   // rest at both ends
  samples.push({ t, offsetX: rand() * amp * fade, offsetY: rand() * amp * fade });
}
return { samples };
```

**惯性。**滞后于主体又追上来的尾部——不用第二个片段的跟随。

```js
const n = inputs.sampleCount, lag = 0.12;
const ease = (t) => 1 - Math.pow(1 - t, 3);
const samples = [];
for (let i = 0; i < n; i++) {
  const t = i / (n - 1);
  const behind = ease(Math.max(0, t - lag) / (1 - lag));
  samples.push({ t, offsetX: (1 - behind) * -0.1 * inputs.canvasWidth });
}
return { samples };
```

**弧线。**直线行程读起来机械。同一时窗里一根轴线性走、另一根走一条
浅抛物线;两者按 `add` 折叠。

```js
const n = inputs.sampleCount;
const dx = 0.25 * inputs.canvasWidth, rise = 0.06 * inputs.canvasHeight;
const samples = [];
for (let i = 0; i < n; i++) {
  const t = i / (n - 1);
  samples.push({ t, offsetX: -dx * (1 - t), offsetY: -rise * 4 * t * (1 - t) });
}
return { samples };
```

**钟摆。**一次衰减旋转,单位是弧度。

```js
const n = inputs.sampleCount, a = 0.12, cycles = 2.5;
const samples = [];
for (let i = 0; i < n; i++) {
  const t = i / (n - 1);
  samples.push({ t, rotation: a * Math.cos(2 * Math.PI * cycles * t) * (1 - t) });
}
return { samples };
```

**看不见接缝的循环。**任何 `loop` 曲线都必须回到出发点,所以用周期
函数的整数个周期来搭它。

```js
const n = inputs.sampleCount, amp = 0.02 * inputs.canvasHeight;
const samples = [];
for (let i = 0; i < n; i++) {
  const t = i / (n - 1);
  samples.push({ t, offsetY: -amp * Math.sin(2 * Math.PI * t) });
}
return { samples };
```

**路径勾画。**`path` 形状片段上 `trimEnd` 从 0 到 1。两个 trim 通道都
按 `replace` 折叠,所以各用一条动画驱动,时窗不得重叠。

```js
return { curves: [{ property: "trimEnd",
  keyframes: [{ t: 0, value: 0 }, { t: 1, value: 1, easing: "easeInOut" }] }] };
```

**带形状边缘的擦除。**`wipeProgress` 曲线要在同一条动画上带 `mask`,
因为方向与软度无从推断:

```json
{"role": "in", "preset": "custom", "durationMs": 700,
 "mask": {"direction": "left", "softness": 0.1},
 "curves": [{"property": "wipeProgress", "keyframes": [
   {"t": 0, "value": 0}, {"t": 0.6, "value": 0.8, "easing": "easeOut"},
   {"t": 1, "value": 1}]}]}
```

## 失败模式

- 代码体什么都没返回,或两个形状都返回,烘焙失败并给出原因。读它:
  烘焙返回错误和代码体的日志,而不是抛异常。
- 通道清单之外的属性名让烘焙失败,并点名它接受哪些。
- 驱动 `wipeProgress` 的曲线没有 `mask` 会被拒。
- 语法读不了的缓动字符串按线性缓动,并在 `validate_timeline` 上显示为
  `unknown_easing`。是 `easeOut`,不是 `ease-out`。
- 延迟之后装不进片段的时窗是 `animation_exceeds_clip`——运动被钳制,
  或干脆不跑。
- 失控循环撞 10 秒上限。曲线生成器不过是对几百个点做算术;慢就是错。

## 检查你写出的形状

曲线是唯一一个光读数字不够的地方。用 `preview_timeline_frame` 带
`range` 扫过动画的时窗、`sheet: true` 把扫掠拼成一张带标注的小样图
——这是看一次过冲真的过冲的办法,而不是检查三个碰巧都像是对的
瞬间。
