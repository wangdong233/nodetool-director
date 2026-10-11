# Veo 3 → 一份导演规格,不是一段描述

Veo 3 产出 4 到 8 秒带同步音频的片段:对口型的对白、环境效果、环境声。它准确解析景别、机位角度与电影术语,并在帧序列上保持连贯。把可用片段与平庸片段分开的,是把提示词写成一份规格,而不是一段叙述。

用 `find_model` 查 `text_to_video` 或 `image_to_video`,再走 `generate_video` / `animate_image`。

音频逐条各管各的,几条 Veo 片段剪成的作品在每个接缝重起声音。场景该进一条生成,还是进你自己加的轨,由 `video-audio-continuity` 裁决。

## 五要素,按顺序

1. **镜头** — 框住其余一切的摄影工作:中景、特写、广角、跟拍。
2. **场景与氛围** — 空间、时间、光线质地、环境。
3. **主体** — 足够的视觉细节,让它跨帧一致渲染。
4. **动作** — 定义时间推进的运动。
5. **对白**(可选)— 口说的台词,给任何需要对口型的内容。

> A medium shot frames a cartographer in a cluttered Victorian study. Warm
> lamplight illuminates ancient maps spread across a mahogany table. The
> cartographer, wearing round spectacles and a burgundy vest, traces a route
> with his finger. "According to this sea chart, the lost island exists. We
> sail at dawn."

每个要素叠在前一个之上。

## 参数

**时长**决定塞得下多少时间复杂度。4 秒装单个动作——定场镜头、产品展示。6 秒装多段动作或简短对白。8 秒装长对白或一个氛围瞬间。时长越长,注意力摊到更多帧上,单帧细节密度随之下降。

**宽高比**改的是构图,不只是画框。16:9 对齐训练分布、水平构图。9:16 把主体收进更窄的横带。1:1 会外扩——模型把你描述之外的场景延展出来填满方画幅,可能带出你从没要过的环境。

**分辨率**:720p 迭代,1080p 交付。

**音频**是成本杠杆。关掉它,标准模型降到约一半,fast 变体降到约三分之二。只有后期要上自配声轨时才关。

## 摄影词汇

该模型用专业影视内容训练,这些术语直接读得懂:

- **运镜**:slow dolly forward(缓慢推轨前移)、gentle pan left(轻柔左
  横摇)、crane shot descending(摇臂下降)、handheld tracking(手持跟拍)。
- **景别**:extreme close-up(大特写)、Dutch angle(荷兰角)、
  over-the-shoulder(过肩)、establishing wide(定场全景)。
- **布光**:golden hour backlighting(黄金时刻逆光)、harsh overhead
  fluorescents(刺眼顶置荧光灯)、dappled forest light(树影斑驳的林间
  光)、volumetric fog rays(体积雾光束)。

> A slow tracking shot follows a lone figure walking through fog-shrouded ruins
> at twilight. Volumetric light rays pierce through broken archways, creating
> dramatic god rays in the mist.

**感官细节喂养音频。**一段描述霓虹映在雨水洼、蒸汽从小吃摊升起、摊贩叫卖压过远处车流的提示词,给音频合成的东西,比同一场景只作视觉描述来得多。

**角色一致性来自辨识标记。**"A woman in her thirties with auburn hair pulled back in a loose bun, wearing a charcoal peacoat and silver-rimmed glasses"(三十多岁、赤褐发挽松髻、炭灰豌豆大衣、银边眼镜的女性)能跨帧保住身份,"a woman"(一个女人)不能。

## 预处理器

**提示词增强**(Enhance prompt,默认开)在生成前用电影术语扩写简短提示词。探索期留着;要你的措辞被逐字执行时关掉。

**自动修正**(Auto fix,默认开)把触碰内容政策的提示词改写而不是拒绝,尽量保住意图。

## 错误与修法

- **规格含糊** — "a person walks in a city"(一个人在城市里走)什么也没
  约束。定外貌、城市的气质、时间、走法。
- **内部矛盾** — "bright sunny day with dramatic moonlight"(明亮晴天配
  戏剧性月光)自己打自己。保持环境一致。
- **时间过载** — 8 秒内多个场景转换很少落得住。拆成独立提示词。
- **反向提示词闲置** — 拿来写 "no camera shake"(不要镜头晃动)、"no
  lens distortion"(不要镜头畸变)、"no text overlays"(不要文字叠加)。
- **种子被忽略** — 种子是一个系列保住一种观感的手段。把管用的记下来。
- **提示词长度** — 150 到 300 字符是工作区间。100 以下产出泛泛;400 以上
  模型开始不可预测地排优先级。

症状对得上修法。衣服颜色漂移或五官变形,是主体需要更多辨识标记。物体无来由地出现,是提示词对时长太复杂——砍内容或缩短片段。对白与口型失同步,是声音提示要写明白:"a vendor loudly calls out 'Fresh fish!' while gesturing"(摊贩一边比划一边高喊 "Fresh fish!")。

## 工作方法

在 fast 变体上以 4 秒 720p 打磨——坏点子在这里几乎不花钱。提示词开始照你意愿干活了,再上标准模型、更长时长与 1080p。然后在同一概念里换种子找变体。

用 `analyze_video`、`detect_video_scenes` 与 `understand_video` 检查实际渲染了什么,别默认它没事。

改编自 fal 的 Veo 3 提示词指南:
https://fal.ai/learn/devs/veo3-prompt-guide-master-google-video-generation
