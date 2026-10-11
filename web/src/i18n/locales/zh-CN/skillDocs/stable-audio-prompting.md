# Stable Audio → 写元数据,不写情绪

Stable Audio 用曲库音乐元数据训练,所以它响应曲库元数据形状的提示词:曲风是什么、什么在演奏、感觉如何、走多快。诗意地描述一种感觉,得到一条平庸的底铺。

音乐端点用 `find_model` 查 `text_to_music`,再走 `generate_music`。音效检查点与音频转音频、局部重绘、音频外扩变体不在音乐目录里——用 `search_nodes` 找到那些节点,以 `invoke_node` 运行。

## 音乐提示词

四个要素,按此顺序:

1. **曲风** — 核心风格,放最前。
2. **乐器** — 要有性格,不只是报名字。"Smooth electric piano"(顺滑电
   钢)、"textural percussion"(质感打击)、"distorted bass"(失真贝斯)
   承载得比 "piano, drums, bass" 多。
3. **情绪与制作** — 感觉,加上制作年代或处理方式。
4. **BPM** — 以及要紧时的调性。

> An exciting breakbeat instrumental for a fast-paced game, funky electric
> guitar chords, steady break drums, smooth electric piano and supporting bass.
> Fresh, modern and adventurous, 105 BPM.

两个可度量的习惯有帮助:换着用词汇,而不是重复同一个形容词;以及引用年代来描述制作——"80s gated reverb"(80 年代门限混响)、"90s grunge distortion"(90 年代垃圾摇滚失真)——三个词就编进一整条处理链。

Stable Audio 3 上给类型加前缀。`TrackType: Music, VocalType: Instrumental` 是器乐底铺的标签对,值得显式设;否则由模型自己决定要不要带人声进来。

## 分轨与单件乐器

从 `TrackType: Instrument` 起头,然后乐器、曲风、情绪与 BPM。这是给"要坐进混音、而不是当混音"的东西走的路。演奏技法、录音环境与效果都读得懂:"close-mic'd upright bass, fingered, small wooden room, light tape saturation"(近距拾音的立式贝斯、指弹、小木房间、轻度磁带饱和)。

## 音效

`TrackType: SFX`,然后三件事:

1. **声源** — 发声的物体或乐器。
2. **动作** — 怎么被触发、响多久、怎么衰减。
3. **制作** — 拾音位置、房间性格、处理。

> TrackType: SFX. A steel toolbox lid slamming shut on a concrete workshop
> floor, sharp metallic impact with a short rattling decay, close mic, small
> room with a hard early reflection.

然后设一个短时长。大多数音效两秒以内;关门声要 30 秒,你得到的是关门声,加 28 秒的房间。

## 时长与参数

让时长匹配你描述的东西。Stable Audio 3 的 medium 检查点最高 380 秒,但描述循环或一记打击的提示词,只有长度合身时才出最佳结果;音乐底铺,指南推荐的区间是 60–90 秒。注意字段改了名——2.5 是 `seconds_total`,3 是 `duration`——且 2.5 默认 190 秒,那是没人要的三分钟音频。

| 参数 | 它做什么 | 该坐在哪 |
| :--- | :--- | :--- |
| `num_inference_steps` | 采样步数 | 蒸馏检查点为默认的 8 调优,调高收获甚微;只在 `base` 检查点上提 |
| `guidance_scale` | 提示词遵从 | Stable Audio 3 上仅对 `base`(非蒸馏)检查点有效——蒸馏版上调它毫无变化 |
| `negative_prompt` | 要避开的质地(仅 Stable Audio 3) | 点名你听到的瑕疵:"clipping"(削波)、"muddy low end"(浑浊低频)、"vocal chops"(人声切片) |
| `enable_prompt_expansion` | LLM 改写提示词 | 默认关;三词提示词有用,提示词已是元数据时有害 |
| `seed` | 可比性 | 一次只改一个元素时钉住它 |

`base` 与蒸馏之分,正是坑人的那一处:在蒸馏版 Stable Audio 3 检查点上,大多数人伸手去拧的两个旋钮什么都不做,提示词就是全部乐器。

## 编辑既有音频

**音频转音频**从一条片段给生成做种,而旋钮有两个名字。Stable Audio 3 用 `init_noise_level`(默认 0.9):0.1 紧贴源,1.0 换成噪声、彻底重新生成。Stable Audio 2.5 用 `strength`(默认 0.8),跑法相同——0 原样返回输入。低值保旋律与节奏;高值剥掉它们,只留大性格。

**局部重绘与音频外扩**守住遮罩区外的一切、区内重新生成——Stable Audio 3 用 `mask_start_seconds` / `mask_end_seconds`,2.5 用 `mask_start` / `mask_end`。这里周边音频比提示词更说了算:短遮罩不管你写了什么,都会被上下文狠狠拉过去,只有宽遮罩给提示词留出空间。局部重绘不听话时,先加宽遮罩,再改写提示词。

## 症状

| 出了什么问题 | 改什么 |
| :--- | :--- |
| 一条平庸的底铺 | 改写成曲风、有性格的乐器、情绪、BPM |
| 混入不想要的人声 | 在提示词加 `TrackType: Music, VocalType: Instrumental` |
| 音效被房间底噪填充 | 把时长砍到事件实际长度 |
| 调高 guidance 毫无变化 | 你在蒸馏检查点上——换 `base`,或修提示词 |
| 局部重绘无视提示词 | 加宽遮罩区 |
| 两条 take 没法比 | 钉住种子,一次只改一个元素 |

用 `analyze_audio`、`analyze_audio_spectrum` 与 `detect_audio_events` 检查结果,而不是用耳朵找——少一件乐器、一个削波峰,在那里露面比耳朵快。

## 它落在哪

从这里出的音床,就是 `video-audio-continuity` 里"自己的一轨"搭法:一条片段上自己的音频轨铺满全程,生成的镜头在它下面静音。因为提示词写明了 BPM,`beat-sync-editing` 先拿一张可预测的网格起步,再用 `detect_audio_events` 对文件核实。一记 1–3 秒的 `TrackType: SFX` 打击,正是 `logo-reveal` 落标识的东西。`motion-graphics` 承载铺片段的时间线操作。

改编自 Stability 的 Stable Audio 2.5 提示词指南与 Stable Audio 3 提示词指南:
https://stability.ai/implementations/stable-audio-25-prompt-guide
https://github.com/Stability-AI/stable-audio-3/blob/main/docs/guides/prompting.md
