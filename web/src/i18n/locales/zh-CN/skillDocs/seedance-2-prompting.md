# Seedance 2 → 导演一场戏,不是一张画格

Seedance 2 在同一遍里写画面与声音,仅此一件事实就改变了提示词。你描述的不是一帧;你在导一场短戏,含运镜与混音,而模型必须把它们全部拢住。它吃平实的自然语言,所以管用的提示词读起来像一份简短的镜头简报:谁、在做什么、在哪、怎么拍、听起来是什么。

这也决定了多场景作品怎么搭:声音属于生成它的那条片段,所以几条 Seedance 片段剪在一起,每个接缝处混音都重新起头。整部作品必须是一条生成时该怎么办,以及能过版权过滤的那套声音设计词汇,见 `video-audio-continuity`。

用 `find_model` 查 `text_to_video` 或 `image_to_video`,再走 `generate_video` / `animate_image`。时长设为 auto 让模型自己挑合内容的长度;剪切点要紧时,改钉在 4 到 15 秒之间的具体值。

## 公式

两部分干活:

- **主体** — 画面上是谁或是什么,要具体。
- **运动** — 它在做什么,怎么做。

其余全部可选,按镜头需要追加:

- **环境** — 地点、时段、天气、光线。
- **画风** — 成品风格,从纪实质感到扁平 2D。
- **镜头** — 取景与运镜,按你给摄影 operator 下简报的方式写。
- **声音** — 对白、环境声、配乐,或静默。

装满的样子:

> A glassblower in a leather apron pulls a glowing orange gather of molten glass
> from the furnace, turns the rod steadily to keep it from slumping, then lifts
> a blowpipe to his lips and breathes into it as the bulb swells and the glass
> deepens from orange toward red. A dim workshop lit almost entirely by the
> mouth of the furnace, tools and half-finished pieces on the bench behind him,
> a warm documentary look with the highlights blown out slightly. The camera
> opens on a slow push-in toward his hands, then arcs around to catch the
> molten glass against the dark of the room. Audio: the low roar of the
> furnace, the creak of the turning rod, a faint hiss as the surface cools, no
> music.

那里每一层都是模型不必再发明的一个决定。

## 对白、声音与屏幕文字

**对白**放双引号里。模型给它配音、对上口型、并按剪切定时。行要短——长独白会漂出同步,把一段话拆成两行,让剪切来扛。语气也要导("play her line dry and a little proud, his quiet and worn out",她的那句干硬里带点得意,他的安静而疲惫)。

**字幕**靠描述一段画外音、并要求文字沿底边随声音定时来实现。

**环境声**是一份声音简报。点名你要进混音的声音,不要音乐就写 "no music"。敞着口的提示词回来会配得像汽车广告。

## 规则

- **把词花在动词上。**运动才是被动画化的东西。"A stunning dancer"(一个
  惊艳的舞者)什么都给不了;"a dancer dropping into a low spin, the skirt
  flaring, then snapping upright"(舞者落进低转、裙摆张开、随即立起)
  给了它一条可跟的路径。
- **用镜头语言。**Dolly(推轨)、pan(横摇)、tilt(纵摇)、crane(摇臂)、
  push-in(推近)、rack focus(移焦)、locked-off(固定机位)都读得干净
  利落。"Epic cinematic camera"(史诗电影运镜)会往一百个方向跑。
- **声音指导不足是最常见的失败。**点名戏内声、房间底噪,需要静默时有意
  地要静默。
- **物理要有后果。**"Leaves scatter on each impact"(每次撞击树叶四散)、
  "the mug slides and tips"(杯子滑移并倾倒)给了模型可据以求解的具体
  目标。
- **想要剪切就写 "cut to"。**拼出来,它遵守你给的镜头列表的可靠度,远
  高于自己发明一个。
- **跨剪切的两行短对白**,好过半路失同步的一行长对白。

含糊与具体的差距到处一样,而这里代价更高,因为一条坏片段赔的是数秒渲染。"A beautiful cinematic video of a dancer, stunning, 8k, masterpiece" 回来的是平光下的库存舞者。把裙子、旋转、鞋跟点地、孤零零的追光与吉他都定下来,模型就把力气花在渲染你的场景,而不是发明一个。

## 范式

- **硬运动与真物理** — 给重量与接触点:手按住岩沿的一次撑越、落地时溅起
  的碎石、拍打的外套、贴胸高跟拍的镜头。
- **一条在镜头间剪切的广告** — "built as three cuts in one take"(一条
  片子三个剪切),每个剪切点名,收尾帧上以点名的字体大类与颜色淡入
  标题。
- **声音就是场景时** — 缓慢推近、自然主义调色,与 "no music at all" 之下
  水滴、远处鸟鸣与枝条吱呀的混音。
- **产品主视觉镜头** — 一个令人满足的物理瞬间。一次倾倒、一记飞溅、一声
  拉环弹起带起细雾,微距,水珠上的硬轮廓光,然后一行字在下三分之一处
  淡入。
- **对镜头口播的代言人** — 竖版、手机拍摄质感、引号里的一句短口播、最后
  一个字上的一个小动作,然后两秒插入剪切再切回。

## 结构化节拍表

散文只扛得住一个镜头。要一整条有形状的片子——钩子、转折、Drop、高潮——就改递给 Seedance 一份 JSON 简报:对整条片段成立的全程字段,然后是一列节拍,每个节点名自己的职能、画面与声音。职能标签(`fn`)正是防模型把起伏压平成八个等重镜头的东西。

六个全程字段,然后是节拍:

- `duration` — 整条片段,在你所调端点接受的范围内。
- `camera` — 全片一个运镜,不是每拍一个。一次连续的推近读起来是一个
  镜头;每三秒一个新运镜读起来是蒙太奇。
- `light` — 光源、色温,以及它随片段怎么变。点名一次,每个节拍都继承。
- `style` — 类型、镜头性格、颗粒、色板,外加一两个克制参照点。
- `negative_prompt` — 你真看到的瑕疵:抖动、肢体弯折、面部变形、闪烁。
- `audio_note` — 混音在每个节拍上都遵守的规则。"One continuous bed,
  never full silence"(一条连续音床,绝不完全静默)正是拦住模型在每个
  剪切处重置声音的东西。

```json
{
  "duration": "25s",
  "camera": "One continuous slow, steady push-in from extreme wide to close-up across the 25s; shallow depth by the end.",
  "light": "Single unseen source above; cold white-cyan 6500K key casts down, intensifying steadily from a whisper to a flood; deep blue 6000K twilight ambient; hard top key, soft fill.",
  "style": "Mysterious sci-fi first contact, withheld reveal, intimate awe; anamorphic, atmospheric haze, fine film grain, deep teal-twilight palette; Arrival / Close Encounters restraint.",
  "negative_prompt": "Avoid jitter and bent limbs; stable facial features, no morphing, no flickering.",
  "audio_note": "ONE continuous bed, never full silence; dips to sub-bass rumble at the DROP instead of cutting.",
  "timeline": [
    {"t":"0:00-0:03","fn":"Cold Open / Hook","visual":"Extreme wide, near-dark. A small child alone in a vast twilight field, tiny and still; wind begins bending the wheat toward one point, a faint unnatural tint at frame edge - source unseen.","audio":"Low sub-bass drone, faint wind, one distant detuned low-brass signal tone."},
    {"t":"0:03-0:08","fn":"Setup / World","visual":"Medium wide. The child looks up; ordinary dusk field established as a cold light starts to rise on them from somewhere above, still unshown.","audio":"The tone bends; sparse high harmonics enter; sub-rumble slowly grows."},
    {"t":"0:08-0:11","fn":"Inciting Incident","visual":"Medium. The 'but then': cold light intensifies on the child's face - curiosity dawning, not fear. The unseen presence is undeniable now.","audio":"First swell; a soft riser begins; a deep slow pulse enters."},
    {"t":"0:11-0:16","fn":"Escalation / Stakes","visual":"Push-in tightening on the face. Light climbing, hair lifting, eyes widening; the child steps forward, drawn in.","audio":"Layers stack - riser rising, pulses quicken, strings enter; tension builds."},
    {"t":"0:16-0:17","fn":"THE DROP","visual":"The hinge: everything stills for one beat, the face half-lit, breath caught, light pooled and waiting.","audio":"Bed dips to a low sub-bass rumble for one beat - near-silence, never fully out."},
    {"t":"0:17-0:22","fn":"Climax / Emotional Peak","visual":"Close-up. PEAK: the child slowly lifts one open hand toward the light, fingers spreading; the intensifying beam washes over the small palm and reflects in wide, wonder-filled eyes as a faint slender silhouette of light enters the top edge of frame, almost meeting the fingertips.","audio":"A warm resonant swell blooms - wordless choir and vast strings soaring into awe over sustained deep brass, a fragile high motif of wonder."},
    {"t":"0:22-0:24","fn":"Title Card","visual":"The light blooms to white across the frame; title fades in over the bloom (clean type in post).","audio":"Choir and strings resolve to one luminous sustained chord; a low sub-boom lands."},
    {"t":"0:24-0:25","fn":"Button / Stinger","visual":"After the title, one last beat: the light settles, the field dim again; a single held stillness.","audio":"One fragile high bell tone over near-silence; hard out."}
  ]
}
```

它为什么管用,改编时要保住什么:

- **每个节拍都齐了 `fn`、`visual` 与 `audio` 三样。**缺了声音行的节拍,就是
  混音漂回通用配乐的地方。
- **Drop 是一个节拍,不是一个空档。**音床沉到低频轰鸣的那一秒读起来是
  铰链;真静默读起来是脱拍。说清你要哪个。
- **高潮节拍拿最多的词。**一只手、一个反光、画格边缘,只有这里值得花
  细节。铺垫节拍保持短。
- **运镜与光是全程的,节拍描述它们的状态。**"Light climbing, hair
  lifting"(光在攀升、发丝扬起)是全程光的状态,不是一盏新灯。
- **标题卡属于时间线。**给那场泛白一个自己的节拍,字在后期加,而不是让
  模型渲染。
- **stinger 让片段不至于停在高潮上。**标题之后多撑一拍,它才读起来
  "完了",而不是"被掐了"。

节拍职能随片型改。UGC 广告跑钩子、问题、产品、证明、行动号召;产品片跑立景、细节、变化、主打、标版。形状在变;给每个节拍点名职责的纪律不变。

用 `analyze_video` 与 `detect_video_scenes` 给结果打分而不是看一遍;需要一份"实际渲染了什么"的书面读解时用 `understand_video`。

改编自 fal 的 Seedance 2.0 提示词指南:
https://fal.ai/learn/tools/seedance-2-0-prompting-guide
