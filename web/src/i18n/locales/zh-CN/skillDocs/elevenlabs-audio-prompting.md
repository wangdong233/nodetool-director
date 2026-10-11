# ElevenLabs → 指挥演绎,不只是提交文本

文本是一次 ElevenLabs 请求里最小的部分。决定它听起来像被导过还是没导过的,是你选的声音、设定的稳定性、以及承载演出的标签与标点。

语音用 `find_model` 查 `text_to_speech`,再走 `generate_speech`;音乐用 `find_model` 查 `text_to_music`,再走 `generate_music`。音效端点不在任何一个目录里——用 `search_nodes` 找到它的节点,以 `invoke_node` 运行。

## 先选声音,再上标签

标签只做声音本来就能做的事。一个用轻声旁白训练的声音加 `[shouts]`,得到的是稍微响一点的旁白。先选音域罩得住你要的那版演绎的声音,再在它之内执导。

- **情绪起伏型**声音吃得了整场戏的指导。
- **窄而稳定型**声音适合每行同一音区的场合。
- **中性**声音跨语言与风格最稳。

## 稳定性是语气的旋钮

影响最大的单项设置。ElevenLabs 以三个命名档暴露它;数值型 API 取同样的三个值,对白端点把其他值四舍五入到最近的档。

| 值 | 行为 | 用于 |
| :--- | :--- | :--- |
| 0.0 — creative(创造性) | 最有表现力、最响应标签,偶发幻觉 | 角色扮演、对白、一切带 `[whispers]` 或 `[laughs]` 的内容 |
| 0.5 — natural(自然) | 均衡,最接近参考录音 | 旁白、大多数制作级朗读 |
| 1.0 — robust(稳健) | 非常一致,基本无视指导标签 | 长文档、必须互相匹配的反复渲染 |

1.0 上标签就失效了。标签被无视时,先查稳定性,再改写标签。

## 音频标签

方括号、行内,并从该行那个位置起生效。它们是 v3 特性:multilingual-v2、turbo 与 flash 上没有东西响应它们,你手里的指导只剩标点与句子结构。

- **语气**:`[whispers]`、`[shouts]`、`[sarcastic]`、`[curious]`、
  `[excited]`、`[mischievously]`
- **反应**:`[laughs]`、`[sighs]`、`[crying]`、`[clears throat]`、
  `[snorts]`
- **环境**:`[applause]`、`[clapping]`、`[gunshot]`、`[explosion]`
- **实验性**:`[sings]`、`[strong French accent]`

其余由标点扛,而 v3 不支持 SSML break 标签。省略号是停顿与迟疑,大写是重音,普通逗号句号定节奏:

> [sighs] It was a VERY long day … nobody listens any more. [quietly] Maybe
> that's the point.

给模型几句,而不是一个碎片。孤立的短行读起来不稳定,因为没有可据以读音区的上下文。文本本身有歧义时,`language_code` 强制一种语言。

## 多个说话人

对白端点收一个 `inputs` 列表,每条带自己的文本与声音,而不是一整块塞着人名的文本。每行打上自己的语气标签,打断就按发生时的样子写:

```
[Ana, voice A]  "You said you'd call." [flat]
[Ruben, voice B] [defensive] "I did — twice —"
[Ana, voice A]  [cutting in] "Once. And you hung up."
```

每个说话人一个不同的声音,它才是一场对话;同一个声音出现两次,听起来像一个人自言自语。

## 音效

按声源、动作与空间下简报:什么发出声音、它发生了什么、在哪个空间里发生。

> A heavy oak door swinging shut and latching in a stone corridor, long natural
> reverb tail, close mic on the latch.

- `duration_seconds` 跑 0.5–22;不设则模型从提示词推断长度。撞击类要
  1–3 秒,底铺类要 10–20 秒。
- `prompt_influence` 默认 0.3。往 1 提是紧跟简报、失去变化;想要多条可选
  时往下调。
- `loop` 让尾音融回头部——氛围声与游戏音频就用它,一次性音效用了毫无
  意义。

## 音乐

一条提示词换来一轨:曲风、有性格的配器、以 bpm 计的节拍、情绪弧线、以及它是给什么用的。

> Fast-paced electronic chase cue for a game trailer, driving synth arpeggios,
> punchy drums, distorted bass, rising tension with abrupt transitions,
> 130–150 bpm.

结构比氛围更要紧时,改发一份 `composition_plan`:一列有序的段落,每段带自己的 `durationMs`、`positiveStyles` 与 `negativeStyles`。正是它让前奏保持素净、让 Drop 落在你指定的位置。`respect_sections_durations` 强制这些时长;`music_length_ms` 只作用于提示词路线。`force_instrumental` 保证无人声——没有它,一条没提人声的提示词也可能唱着回来。

点名艺人、乐队或版权歌词会被直接拒绝;报错里带改写建议。描述那个声音,而不是那个参照。

## 症状

| 出了什么问题 | 改什么 |
| :--- | :--- |
| 标签毫无作用 | 把稳定性降到 0.5 或 0.0,并查这个声音演不演得了那种语气 |
| 朗读是平的 | 加标点与语气标签;别再只靠文字本身 |
| 停顿被无视 | 用省略号与分行结构——SSML break 不受支持 |
| 两个说话人听起来一样 | 给每条 `inputs` 条目分不同的声音 |
| 音效变数太大 | 提 `prompt_influence`,并设明确时长 |
| 循环有咔哒声 | 设 `loop` 为 true 重新生成,而不是修剪 |
| 歌曲无视结构 | 从提示词改走 `composition_plan` |
| 提示词被拒 | 去掉艺人与乐队名;描述声音 |

用 `analyze_audio` 与 `detect_audio_events` 检查结果,而不是整段听;需要证明字落得一字不差时用 `transcribe_audio`。

## 它落在哪

从这里出来的声音或音床,就是 `video-audio-continuity` 里"自己的一轨"搭法:它上自己的音频轨,生成的片段在它下面静音,多场景作品由此保住一条连续混音。给分镜的剧本,`voice_script_lines` 一次调用把每一行都配上各自的声音,而不是每行一次 `generate_speech`。由 `composition_plan` 建的音床段落时长已知,正是 `beat-sync-editing` 剪上去的网格;一记音效重击,就是 `logo-reveal` 对齐 sting 的东西。`motion-graphics` 承载铺片段的时间线操作。

改编自 ElevenLabs 关于 Eleven v3、音效与音乐的提示词文档:
https://elevenlabs.io/docs/best-practices/prompting/eleven-v3
https://elevenlabs.io/docs/overview/capabilities/sound-effects
https://elevenlabs.io/docs/eleven-api/guides/cookbooks/music.md
