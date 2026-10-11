**先加载 `/storyboard-core`。**它承载本技能所假定的循环、工具契约与门禁。
这类任务把该循环的顺序倒了过来,所以建板之前先读完下面的序列。

## 这类任务的独特之处

在别处,画面先行,文字搭车;这里文字是主轴:它定片长,每个镜头必须
恰好和它覆盖的那句台词一样长。这走的是另一条工具路径——一个被分镜
链接的**剧本文档**——而不是把旁白打进分镜里。

回报在于:对一块已链接的板执行 `assemble_storyboard_timeline`,会把
文字和画面剪在一起:每个镜头的时长等于它覆盖的各条配音,每一句配好音
的台词都成为自己的一条旁白片段。

## 序列

1. **调研并撰写旁白。**150–165 个词约等于 60 秒。在任何视觉内容出现之前
   先把它写完。
2. `create_script {name}`。
3. `edit_script {script_id, ops}`——先 `{"op": "add_speaker", "name": "Narrator"}`,
   再每句一条 `{"op": "add_line", "text": "..."}`。一句一行:行是获得配音条、
   为镜头计时的单位,把一整段塞进一行,会得到一个没法剪的镜头。
4. **给旁白者配音:**`find_model`(`text_to_speech`)→
   `{"op": "set_speaker_voice", "target": "Narrator", "provider", "model", "voice"}`。
   不配的话每行都读作 `no_voice`。
5. `derive_storyboard_from_script {script_id, provider, model}`——按朗读顺序
   每行一镜,各镜带着它覆盖的行 id。传入语言模型服务商与模型即做一轮
   导演改写,在这个骨架上为每镜写画面;**两者都**不传则只出裸骨架。
6. **重写画面。**派生出的镜头只是起点。用 `edit_storyboard` 的
   `update_shot` 逐镜改写,给每镜一个具体 B-roll 的 `action`,和一个带
   数量的 `motion`。用 `set_board` 设好板的 `style` 与 `entity_ids`。
7. **每个镜头先出静图**并复核,然后才碰任何剪辑。
8. `voice_script_lines {script_id}`——默认配所有草稿或已过期的行。词级
   时间点来自转写环节(默认 `transcribe: true`),并作为字幕随片段进入。
9. 出剪辑,然后 `assemble_storyboard_timeline`,然后 `validate_timeline`。
10. **压掉画面自带的声音。**装配会给每个镜头片段在 "Shot Audio" 轨上配
    一个音频孪生。`edit_timeline` → `get_state`,然后对这些片段用
    `set_clip_params` 设 `muted: true`,让旁白顶上来。

## 计时

已链接板上的镜头时长来自其台词的配音条——即 `duration_source: "audio"`,
链接后即为默认。别去动它。只有当镜头必须比旁白撑得更久时(比如结尾卡),
才用 `duration_source: "manual"` 加 `duration_seconds` 钉死。

**先配音,后剪辑。**没有配音条的行,其镜头停留在自身时长上,装配时会
把它列为跳过。

## 风格样式

挑一个写进板的 `style`,并写上 `no on-screen type`——标题字属于时间线
上的文字片段,在那里才可编辑。

| 样式 | `style` |
|---|---|
| 扁平 2D | `flat vector illustration, three-colour palette, thick uniform strokes, white ground` |
| 纪录微距 | `macro photography, shallow depth, natural light, matte film grade` |
| 暗色 UI | `dark interface on a black ground, single accent colour, crisp type-free panels` |
| 纸艺 | `cut-paper layers, soft drop shadows, warm raking light` |

## 音乐

只有当板正开在浏览器标签页里时才设板的 `music_prompt`——
`ui_storyboard_set_screenplay` 是它唯一的写入方,装配会把它变成一条草稿
音频片段。在浏览器外,自己加音乐轨:`generate_music`,然后
`edit_timeline` → `add_track` + `add_media_clip`,并把 `volumeDb` 设得
足够低,垫在旁白之下。

## 简报

把这些示例按用户的简报改编。示例交付物、风格选择与审批检查点只在用户
采纳时适用。

```
Research [TOPIC], then direct a faceless 16:9 explainer. No on-camera talent.

Write the voiceover first, 150-165 words, one sentence per line, as a script:
create_script, then edit_script to add a Narrator speaker and the lines. Give
the narrator a voice with set_speaker_voice before anything else.

Then derive_storyboard_from_script with a director pass, and rewrite each of the
eight shots' action and motion as concrete b-roll to that voiceover.
Board style: [flat 2D / documentary macro / dark UI / paper-craft], no on-screen
type.

Stills on every shot before any clip. Then voice_script_lines so the shots take
their length from the takes, then clips, then assemble_storyboard_timeline and
validate_timeline. Finish by muting the Shot Audio clips under the voiceover.

Stop after the script and the board. Show me the words before you spend.
```
