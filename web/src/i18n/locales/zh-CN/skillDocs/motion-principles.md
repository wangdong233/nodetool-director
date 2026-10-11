# 动效原则 → 调用之前先定数字

`timeline-edit-ops` 讲怎么用 `edit_timeline` 把一条动画写进片段。本篇讲
怎么决定写什么。这里每个数字用的都是 `animate_clip` 收的单位:毫秒、
归一化的 0..1 距离、一条缓动字符串。

## 同样的数字,写成代码

改用 `@nodetool-ai/sandbox-timeline` 来搭(`motion-graphics` 负责选表面)?
下面每个数字照旧适用——只有单位会变。`durationMs` 变成以秒计的 `dur`
(除以 1000:400ms 就是 `dur: 0.4`)。归一化的 0..1 距离变成以帧自身
`width`/`height` 为基准的实际像素(1920 宽的帧上 0.3 就是 `from` 里的
`offsetX: 576`)。缓动字符串完全相同——`ease: "outExpo"` 或原始曲线——
每个角色的含义也不变:`el.enter()` 即 `in`,`el.exit()` 即 `out`,
`el.animate()` 覆盖 `emphasis` 与一般关键帧,`el.loop()` 即 `loop`。
`el.count()`、`el.draw()`、`el.scramble()`、`el.typewriter()`、`el.expr()`
与 `el.morph()` 在下面的 op 里没有对应物;它们分别是指示器、`trimEnd`
描画显现、乱码揭示、整片段打字机入场、手写关键帧函数,以及路径轮廓
morph 的捷径。

## 挑数字之前先定三件事

| 支柱 | 问题 | 它决定什么 |
|---|---|---|
| 情绪意图 | 观众该感觉到什么? | 缓动、时长、过冲 |
| 视觉叙事 | 铺垫、动作、收束——什么在什么时候进场? | 时序、`delayMs`、错峰 |
| 运动技艺 | 它为什么看起来可信? | 预备、跟随、弧线 |

意图没定就挑的数字,是你之后要改两次的数字。

## 三层齐动,否则画面发平

规划三个注意力层级。轨道索引控制它们的层叠顺序,而时序决定视线
跟随哪一个:

- **Primary**——视线跟随的那一个移动。这一镜讲的就是那条片段。
- **Secondary**——对主运动做出反应的支撑运动:晚一点落定的压暗层、
  比底板晚 80ms 到达的标签。
- **Ambient**——从不索要注意力的背景活性。底衬上一条低振幅的 `loop`
  预设。

`motion-direction` 把同样的三层排序为 Hero / Support / Texture,并决定
哪些元素挣得哪一层。两条片段同时带主运动,是画面闹最常见的原因。

## 缓动是最大的杠杆

`linear` 读起来机械。把它留给永不落定的运动:`loop` 预设 `float`、
`rotate` 和 `hueShift`,以及 `shake` 强调——它的锯齿默认就是线性的。
凡被眼睛读作事件的东西,都减速进入静止。

| 动作 | 缓动 | 为什么 |
|---|---|---|
| 入场(`in`) | `easeOut`,或落点更利落的 `cubic-bezier(0.16,1,0.3,1)` | 带能量到达,然后落定 |
| 出场(`out`) | `easeIn`,或 `cubic-bezier(0.7,0,0.84,0)` | 加速离开 |
| 留在画面里的移动 | `easeInOut`,或 `cubic-bezier(0.65,0,0.35,1)` | 对称,没有假重量 |
| 俏皮落定 | `easeOutBack`,或 `cubic-bezier(0.34,1.56,0.64,1)` | 超过 1 的那部分就是过冲 |
| 物理落定 | `spring(180,12,1)` 一次过冲,`spring(180,26,1)` 零过冲 | 解真实弹簧;三个常数都为正 |
| 定住再跳 | 在结束关键帧所在的段上用 `hold` | 保持前值直到该段结束 |

角色默认已经做对了:`in` 用 `easeOut`,`out` 用 `easeIn`。除非你要的
不是默认,否则 `easing` 就别设。解析器读不了的字符串按线性缓动并报
`unknown_easing`——是 `easeOut`,永远不是 `ease-out`。

过冲读起来像玩具。金融、医疗、商务内容上一律别用 `easeOutBack`、
`easeOutElastic` 和 `easeOutBounce`。

## 时长承载重量

| 元素 | `durationMs` |
|---|---|
| 微节拍:小元素上的一次 `flash`、一次 `pulse` | 150–250 |
| 标题、下三分之一字幕条、叠加层入场 | 300–500 |
| 主角元素、满幅底板、一次 `blur` 移焦 | 500–800 |
| 运镜:`kenBurns`、一次缓慢推近 | 1500–4000 |

距离与面积会放大它。一条走 `distance: 0.05` 的字幕和一条走 `0.5` 的
满幅底板,绝不能共用 400ms——底板会显得没有重量。行程或面积翻倍时,
大约加 30–50%。

引擎用两条硬约束代替行文提醒:

- `in` 加 `out` 必须装进片段并留出驻留。一条 3000ms 的标题两端各
  500ms,驻留 2000ms。驻留低于约 1000ms,元素永远落不了定,读起来像
  故障。过长的时窗报 `animation_exceeds_clip`。
- 长于片段的 `loop` 周期只演出一段。`kenBurns` 按它 3000ms 的默认值
  放在 2000ms 的片段上,是一次半途停下的漂移。

## 错峰即节奏,而且会被钳制

绝不让一组元素在一次事件里全部揭示。文字片段上,`stagger` 把动画按
词、按字素或按折行拆开。哪种 `unit` 数什么、计数怎么跟着画幅变,在
`motion-graphics` 里。

| 内容 | `offsetMs` |
|---|---|
| 要带着质感进场的一句话 | 60–100 |
| 一句一句砸落的短包袱 | 150–250 |
| 超过五个词 | 不要错峰——读者在等句子说完 |

跨度是 `durationMs + offsetMs × (units − 1)`,`from: "center"` 时减半。
算出来,拿它对比片段的 `durationMs` 减去 `delayMs`。装不下的跨度会被
**静默压缩**:引擎收窄偏移,绝不收窄每单元时长,于是这一行落得比
写下的更平,而只有 `validate_timeline` 会说出来,以
`stagger_compressed`。

一组各自独立的片段——下三分之一字幕条的三件、五枚图标——错峰的做法
是给每条片段的 `in` 动画一个相隔 60–80ms 的 `delayMs`,并把整次揭示
控制在 700ms 上下。再长,尾巴就拖了。

## 三分之一法则,两种形态

- **距离。** 一次不中断的移动不超过画面约三分之一。`slide` 的
  `distance` 超过 0.35 读起来是"模板在动"。用同一时窗上的一次缩放或
  透明度变化破掉它,或缩短行程。
- **同时性。** 三个及以上元素时,任一时刻至多三分之一在主动运动。
  其余保持不动,或跑低幅循环。

## 预备、跟随、弧线

把"做了动画"和"只是挪了位置"区分开的三招。没有一招有预设;每一招
都是一条 `custom` 动画,也正是短 `code` 体挣得位置的地方。

**预备**——主动作之前 60–120ms 的一次反向预备。pop 之前先要一次
下沉:

```json
{"role": "in", "preset": "custom", "durationMs": 520,
 "curves": [{"property": "scale", "keyframes": [
   {"t": 0, "value": 1}, {"t": 0.2, "value": 0.94, "easing": "easeInOut"},
   {"t": 0.75, "value": 1.06, "easing": "easeOut"}, {"t": 1, "value": 1}]}]}
```

**跟随**——连带的部件比主体晚 40–80ms 落定。给子片段同一条预设、晚
60ms 的 `delayMs`,而不是把整组当一块动画。

**弧线**——任何活物走直线读起来都机械。同一时窗里 `offsetX` 线性走、
`offsetY` 走一条浅弧;两者按 `add` 折叠,所以互相组合。

衰减弹跳、弧线、或写成时间函数的落定,是一段返回 `samples` 的 `code`
体——每个点一袋 `{t, offsetY}`,共 `inputs.sampleCount` 个点。代码体在
编写时密闭地运行一次,并从 `inputs` 读 `role`、`durationMs`、
`clipDurationMs`、`canvasWidth`、`canvasHeight`、`params`、
`staggerCount` 和 `sampleCount`:

```js
// fragment
const n = inputs.sampleCount;
const h = 0.06 * inputs.canvasHeight;
const samples = [];
for (let i = 0; i < n; i++) {
  const t = i / (n - 1);
  // three decaying hops, ending exactly at rest
  const y = -h * Math.abs(Math.sin(Math.PI * 3 * t)) * (1 - t);
  samples.push({ t, offsetY: y });
}
return { samples };
```

最后一个采样点要落在恒等值上——偏移是 0,缩放或透明度是 1——前提
是运动应当落定。`in` 曲线在时窗之后不再贡献,`out` 曲线在时窗之后保持
末值,`emphasis` 曲线在时窗外回到基线。

## 对着音频的节奏

冲击关键帧落在拍点上。120 BPM 时一拍 500ms,八分音符网格 250ms。
`beat-sync-editing` 把检测到的起音点变成标记与吸附。要让运动跟随之后
的速度修改,就把 `beat` 存在完整时间线文档的动画上。它的 `index` 从一
开始计,`scope` 是 `clip` 或 `sequence`,`offsetMs` 可以把预备放到拍点
之前。`edit_timeline` 的 `animate_clip` 输入不写这个字段;按
`motion-graphics` 里说的用 `get_timeline` 和 `set_timeline_document`。

```json
{"id":"impact","role":"emphasis","preset":"pulse","durationMs":240,"beat":{"index":3,"scope":"sequence","offsetMs":-20}}
```

比拍点晚 80ms 结束的移动读起来迟,早 80ms 结束则可能削弱冲击。预备就
有意地用 `offsetMs`。

没有音乐时,每 500–800ms 保持一个大事件,让片子按恒定的脉搏呼吸。

## 弹簧还是时长

`spring(stiffness,damping,mass)` 在动画的 `durationMs` 之内塑形运动;
它被缩放到在该时窗末尾附近落定。要看起来物理的落地就用它,然后像任何
其他缓动一样对着剪切设 `durationMs`。要精确的定住姿势或硬时码,就写
关键帧,并在该静止的段上放 `hold`。

## 帧纹理

快速移动出现频闪时,用逐片段的 `motionBlur`。从 180 度快门开始,
`samplesPerFrame` 只加到画面需要的程度;场景共享被请求的最高采样数。
要刻意的低帧率观感用 `steppedTime.fps`,要延迟副本用 `temporalEcho`。
这些是经 `set_timeline_document` 写入的片段存储字段,不是
`animate_clip` 的参数。

## 诊断

| 感觉 | 因为 | 修法 |
|---|---|---|
| 发僵、机械 | 入场用了 `linear` 或对称曲线 | `easeOut`,或不设 `easing` 吃角色默认 |
| 发飘、慢 | 时长太长,曲线太缓 | 砍 30%,收利落到 `cubic-bezier(0.16,1,0.3,1)` |
| 廉价、卡顿 | 所有东西同时到,一个时长包打所有尺寸 | 错峰,并让时长随面积缩放 |
| 缓动对了还是机械 | 没有预备、没有重叠、直线路径 | 移动前一次 `custom` 下沉;连带部件 60ms 偏移 |
| 闹 | 一帧里两个主运动 | 把一个降级成循环,或让它静止 |
| 错峰文字没有错峰感 | 跨度超出片段,被压缩了 | 自己加长片段,或调低 `offsetMs` |

## 速查表

| 需要 | 值 |
|---|---|
| 入场 | `easeOut` / `cubic-bezier(0.16,1,0.3,1)`,300–500ms |
| 出场 | `easeIn` / `cubic-bezier(0.7,0,0.84,0)`,200–300ms |
| 原位移动 | `easeInOut`,300–400ms |
| 俏皮落定 | `easeOutBack`,400–600ms |
| 逐词错峰 | 60–100ms,五个词以内 |
| 片段到片段的错峰 | 60–80ms 的 `delayMs` 步进,整次揭示 ≤ 700ms |
| 恒速连续循环 | 有意恒速时用 `linear` |
| 行程上限 | 无第二通道时 `distance` ≤ 0.35 |
