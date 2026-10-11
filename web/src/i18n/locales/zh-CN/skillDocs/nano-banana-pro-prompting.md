# Nano Banana Pro → 写简报,不堆形容词

Nano Banana Pro 先规划再落笔:它先定版式与布光,然后才提交到像素。由此带来两件事:它能把一幅画面推理出来——白板上解出的一道方程、顺序正确的一张流程图;它对任务知道得越多就越锐利,所以一句背景交代胜过再加一个形容词。

用 `find_model` 查 `text_to_image` 或 `image_to_image`,再走
`generate_image` / `edit_image` 触达它。下文没有一样是参数;全部都是提示词文本。

## 生成简报

八个槽位。镜头需要哪些就填哪些,按此顺序:

| 槽位 | 填什么 |
| :--- | :--- |
| 主体 | 谁或什么,用具体词 |
| 动作 | 主体在做什么 |
| 场景 | 地点、时段、屋里的光 |
| 风格 | 成品的样子,从照片写实到扁平插画 |
| 构图与镜头 | 取景、角度、镜头行为——像给摄影师下简报那样写 |
| 光与色彩 | 怎么打光,以及调色 |
| 文字 | 图上出现的任何字,放引号里 |
| 约束 | 什么不许入画("no hands, no logos, no hotspots") |

一份填好的简报:

> A matte-black stainless steel insulated water bottle, 750ml, slim cylindrical
> body, brushed metal cap. It stands upright on a wet slate countertop, a few
> condensation droplets sliding down its side, mid-morning, in a quiet kitchen
> by a north-facing window, soft overcast daylight from the left. Photoreal
> high-end commercial product photography. Tight three-quarter hero shot,
> slightly below eye level so the bottle reads tall, 85mm at f/8 so the whole
> product stays sharp while the background falls into soft blur. One large
> softbox left, a subtle reflector right to control falloff; cool desaturated
> grade, clean neutral whites, a faint blue cast in the shadows. The words
> "STAY COLD. 24 HOURS." in small caps along the lower third. No other props,
> no hands, no visible brand logos, no harsh specular hotspots on the metal.

知道这张图是给谁看的,就加一句。"This is for a high-end
cookbook"(这是给一本高端菜谱用的)这一句,自己就会把规划步骤推向浅景深与讲究的摆盘。

## 编辑简报

一旦你停止描述"什么不动",编辑就开始漂。四个槽位,第一个就是全部诀窍:

- **锁定** — 一切不许动的东西。先脸部与版式,再列那些缺了会被注意到的
  细节:一种表面处理、一行字、水珠、角度。
- **改动** — 你要改的那一件事。
- **幅度** — 改到什么程度。
- **约束** — 这次编辑不许破坏什么。

> Lock: the water bottle — matte-black finish, brushed cap, slim cylindrical
> body, the "STAY COLD. 24 HOURS." text, the condensation droplets, its size
> and position in frame, the three-quarter hero angle. Change: swap the
> kitchen-counter background for a flat grey boulder beside a sunlit mountain
> trail. Amount: full environment swap, understated — soft natural daylight,
> not golden hour; shot on location, not composited. Constraints: don't relight
> or recolour the bottle beyond the new ambient light; no new reflections or
> hotspots on the metal; keep the original cool grade; don't touch the cap,
> droplets or text; no hands, people or gear in frame.

**一次调用只改一处。**一句话塞十处修改,就是你搞不清哪一处毁掉画面的方式。每一轮都重述一遍锁定清单。

## 让它读起来不像 AI 的规则

- 形容词渲染不出东西。"Stunning"(惊艳)画不出任何东西;阴天光与剥落的
  漆画得出。
- 把风格词钉在具体事物上。"Cinematic"(电影感)会漂;"a teal-and-amber
  grade with hard shadows"(青橙调色加硬阴影)不会。
- 写真名。镜头需要一张登机牌,那 "boarding pass"(登机牌)两个词就胜过
  任何数量的氛围语言。
- 图上文字放引号里,并点名字体大类及其位置。当模型总是丢字母,就把那个词
  逐字母拼出来。这适用于要作为成图交付的海报或样机;要进时间线的静帧、或
  分镜关键帧,字不进画面,事后作为文字片段加上(`caption-titles`),保持
  可编辑。

这组对比就是全部要义。"A gorgeous hyper-detailed photo of a potter,
masterpiece, cinematic, 8k" 没给模型任何可据以决断的依据。"A ceramicist
in her 40s centering wet clay on a spinning wheel in a cluttered studio,
late-afternoon light raking across the workbench, grey slip drying on her
forearms, a row of unglazed bowls on the shelf behind her, eye-level at 50mm
with shallow focus, muted earth tones"(四十多岁的陶艺师在杂乱工作室的转盘
上定湿泥,午后斜光扫过工作台,灰泥浆在小臂上变干,身后架上一排未上釉的
碗,平视机位 50mm 浅焦,低饱和大地色)是一串模型不必再自己发明的决定。

## 值得用的范式

- **排版与海报** — 点名印刷工艺、油墨颜色、引号里的确切文字、字体大类及
  其位置:"risograph gig poster, two-colour overprinted teal and burnt
  orange, visible halftone, 'BLUE ROOM SESSIONS' large in a condensed slab
  serif across the top, 'Thursdays, 9pm' in small monospace at the bottom,
  slightly misregistered"。
- **信息图与示意图** — 规划步骤在此兑现。要一张带标注的剖面图或柱状对比,
  点名色板与字体大类,并以 "keep every label legible"(保持每个标注可读)
  收尾。
- **指挥这个镜头** — 一个硬光源、点名衰减、点名镜头:"lit by one hard
  source from a window at camera left, deep falloff into shadow, a thin rim
  along the fruit's edge, macro so the waxy skin reads"。
- **线框图变成品(编辑)** — "use the attached pencil wireframe as the exact
  layout"(把附上的铅笔线框当确切版式);然后是色板、字体大类与文案。
- **分镜** — 一张图要 N 格,点名媒介("loose black-and-white marker
  sketches",松散的黑白马克笔速写)并让各格取景有变化。
- **物体替换(编辑)** — 换掉物体,然后把场景、光、景深、色板与既有阴影
  列为不变,并要求匹配的体量、质感与接触阴影。

## 模型自带的能力

跨生成与编辑,最多 5 个人物的相似度保持得住,所以广告战役或分镜里反复出场的角色是可行的。一次生成最多可组合 14 张参考图,用于风格或多图场景。文生图与编辑是同一个模型。输出带 SynthID 水印。

给结果打分而不是眯眼看:`critique_image` 拿一份书面读解,需要对照成图检查提示词时用 `score_image_adherence`。

改编自 fal 的 Nano Banana Pro 提示词指南:
https://fal.ai/learn/tools/nano-banana-pro-prompting-guide
