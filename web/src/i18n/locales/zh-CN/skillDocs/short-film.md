**先加载 `/storyboard-core`。**它承载本技能所假定的循环、工具契约与门禁。
下面只讲叙事类工作在其之上多出来的东西。

## 这类任务的独特之处

广告只需要一块板。叙事作品还需要围在它外面的**剧本框架**:片名、一句话
梗概、风格圣经、旁白与音乐提示词。它们住在板的剧本上,而剧本只有唯一
的写入方。

**`ui_storyboard_set_screenplay` 是唯一能写它们的工具。**`edit_storyboard`
的 `set_board` 只收 `brief`、`style`、`aspect_ratio`、`entity_ids`、
`image_model` 与 `video_model`——其余一律拒绝。所以:

- 板开在浏览器标签页里 → 用 `ui_storyboard_set_screenplay` 一次调用写入
  整个剧本对象,框架与镜头一起。
- 浏览器外 → 用 `create_storyboard` 建板,观感放进 `style`,前提放进
  `brief`,台词与旁白留在各镜头的 `dialogue` 与 `narration` 上,并告诉
  用户:片名、一句话梗概与音乐提示词需要把板打开才能设。不要装作已经
  设过。

这在装配时很关键:`assemble_storyboard_timeline` 会把剧本的旁白与音乐
变成待生成的草稿音频片段。没有剧本就没有草稿片段,你得自己用
`generate_music` 加 `edit_timeline` → `add_track` + `add_media_clip` 补配乐。

## 剧本对象

```json
{
  "type": "screenplay",
  "title": "Night Drop",
  "logline": "A courier discovers the package was never meant to arrive.",
  "brief": "40-second neo-noir teaser",
  "styleBible": "wet asphalt, sodium and cyan, anamorphic flare, 2.39:1 crop, heavy grain",
  "aspectRatio": "16:9",
  "narration": "",
  "musicPrompt": "sparse low synth pulse, one rising note at 0:32, no drums",
  "entityIds": ["<asset id>"],
  "shots": [
    {
      "slug": "1a",
      "action": "Wide. Mara stands alone under a sodium lamp on wet asphalt, the city behind her out of focus",
      "camera": { "framing": "wide", "lens": "40mm anamorphic", "angle": "low", "movement": "slow push" },
      "motion": "she turns her head once toward the sound off-frame; rain falls steadily",
      "dialogue": "",
      "durationSeconds": 7
    }
  ]
}
```

`style` 可作为 `styleBible` 的别名。每镜只有 `action` 必填;id、序号与
状态会自动补齐。

## 镜头配比

四十秒配六个镜头是可行的比值——长到立得住,少到做得起。**开wide,收
特写。**wide 交代世界,特写是观众带走的东西。

- 给镜头留空间:每镜 5–8 秒。只跑 2 秒的叙事镜头,观感像广告。
- 把调度写成带次数的物理事件——`she turns her head once`、
  `he sets the case down and does not let go`——并把情绪排除在 `motion`
  之外。"紧张"不是运动;一次持续的静止才是。
- 台词写进镜头的 `dialogue` 字段,不写进 `action`。这样才保留把这些
  字提升格为真正剧本的选项:用 `extract_script_from_storyboard`,再按
  `/script-video` 逐行配音。
- 风格圣经承载调色。不要逐镜复述——它已经被附加进每条静帧提示词。

## 选角

每个角色是一个角色实体:生成参考图、给用户过目、然后 `create_entity`。
用 `set_board {entity_ids}` 把它们全部挂上板。角色只对其文本点名它的
镜头生效,在一个人独处的场景里这正是你要的。

反复出现的场地值得一个**场地实体**——场地对板上每个镜头都生效,一条
街才能跨六个镜头始终是同一条街。

## direct 模式在这里名副其实

必须看着对口型的台词,以及重运镜,从静帧出发都会更僵。把这些镜头设为
`render_mode: "direct"`,把构图与风格写进 action 文本,因为没有静帧替
它们携带。交代镜头与固定镜头留在 `keyframe` 上——它们最需要守住观感。

## 简报

把这些示例按用户的简报改编。示例交付物、风格选择与审批检查点只在用户
采纳时适用。

```
Direct a 40-second [genre] short: [LOGLINE]. Six shots, open wide, end close,
5-8 seconds each.

Write the full framing as well as the shots: title, logline, style bible,
aspect ratio, and a music prompt. If the board is open in a tab, set all of it
with ui_storyboard_set_screenplay in one call; if not, say so and keep the look
in the board style and the words on the shots.

Cast every character as an entity from a reference you show me first, plus a
location entity for the street. Set the shots that carry spoken lines to
render_mode direct.

If I gave no logline: a night courier loses the package. Wet asphalt, sodium and
cyan, and she whispers "That wasn't a drop."

Stop after the board. Stills before clips.
```
