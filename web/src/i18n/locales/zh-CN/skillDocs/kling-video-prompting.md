# 可灵 → 写镜头,不写段落

较新的可灵版本收的是分镜表,而不是一条提示词:一次调用带多个镜头、生成带对口型的原生音频、并让标注的角色跨每个剪切保住。一整段密不透风的散文把这三样全扔掉,回来的是一条漂移的长镜头。

你能拿到哪几样取决于版本,动笔前先查:

| 版本 | 分镜表 | 元素标注 | 原生音频 | cfg_scale / 反向提示词 |
| :--- | :--- | :--- | :--- | :--- |
| 2.5-turbo | — | — | — | 有 |
| 2.6 | — | — | 有,默认开 | 有 |
| O1 | — | 参考图与视频生视频路线有 | — | — |
| v3 | 有 | 有 | 有,默认开 | 有 |
| O3 | 有 | 有 | 有,**默认关** | — |

原生音频属于生成它的那次调用。分开生成的几条片段剪在一起,每个接缝都丢声音——`video-audio-continuity` 讲避免它的两种搭法。

用 `find_model` 查 `text_to_video` 或 `image_to_video`,再走 `generate_video` / `animate_image`。片段 3–15 秒、720p 到 4K,画幅 16:9、9:16 或 1:1。提示词上限 3072 字符。

## 一条提示词一个镜头

在 v3 与 O3 上,`multi_prompt` 收镜头列表,`prompt` 收单个镜头;二者互斥,发其一即可。`shot_type`(fal)或 `customize_multi_shots`(kie)设为 customize 时,你的镜头边界逐字生效;设 `intelligent` / `prefer_multi_shots`,模型自己切叙事。知道节拍在哪就选 customize。kie 的 omni 端点最多收六个镜头。

2.5-turbo、2.6 与 O1 没有分镜表——一次调用一个镜头,序列是多次调用在时间线上剪出来的。在那里往一条 `prompt` 里写三个带标签的镜头,得到的只是一个不知所云的镜头。

每镜头 2 到 5 句是工作区间。每句点名取景、主体动作与镜头行为:

```
Shot 1 (4s): Wide. A courier in a wet orange jacket steps off a tram into
  a night market, steam rising off the food stalls. Camera locked off.
Shot 2 (3s): Close on her hands unfolding a paper note, the ink running.
  Slow push-in, shallow focus.
Shot 3 (5s): Medium tracking shot alongside her as she pushes through the
  crowd toward a lit doorway, neon reflections sliding over the jacket.
```

主体出现的每个镜头都重复它的描述。第 3 镜里的一个代词,就是另一个人。

## 元素让脸跨过剪切

`elements` 按角色或物体收参考图或参考视频;提示词以 `@Element1`、`@Element2` 称呼它们。它在 v3、O3、以及 O1 的参考图与视频生视频路线上可用。在参考图生视频端点上,风格参考另走 `images`,以 `@Image1` 称呼。带视频参考时,元素加参考图合计上限四张;kie 的 omni 端点最多七个图像主体,或三个视频角色主体。

```
@Element1 sets the espresso cup down on the counter beside @Element2 without
looking up. Medium two-shot, warm window light from the left.
```

标注正是让可灵在一条片段里放三个以上不同角色而脸不互熔的东西。每个元素描述一次,之后只用标签指代。

## 对白与原生音频

`generate_audio` 在 2.6 与 v3 上默认开启,在每条 O3 路线上**关闭**——O3 片段不主动要,回来就是无声。它产出带对口型的对白,外加环境声。用带标签的台词来导:

```
[Detective Voss, low and tired]: "You left the light on."
Immediately, [Marla, brittle, too fast]: "I was coming back."
```

这个格式靠四条规则成立:

- **标签唯一且恒定。**每行都用 `Detective Voss`,永远不用 "he",也永远
  不用 "the detective"。
- **每句台词绑一个动作。**先写动作,再写台词。没有锚的台词会漂出画面。
- **用衔接词排时序。**"Immediately"(紧接着)、"after a beat"(顿一拍)、
  "as she turns"(她转身时)——没有它,两句台词糊成一团。
- **英文口说时大小写有讲究。**全小写书写;大写留给缩写与专名——模型
  据此决定要不要把一个词逐字母拼出来。

中文与英文原生配音。其他语言会先被译成英文再说出口,所以台词用你想被听到的语言写。

## 控制项

| 参数 | 存在于 | 怎么用 |
| :--- | :--- | :--- |
| `cfg_scale` | 2.5-turbo、2.6、v3 | 默认 0.5;0.3 解读更自由,0.7 只在空间布局已定死时用 |
| `negative_prompt` | 2.5-turbo、2.6、v3 | 默认是 "blur, distort, and low quality";往上加你看到的——滑步的脚、多出的手指、变形的脸、抖动的镜头 |
| `duration` | 所有路线 | 3–15 秒;分镜表里每个镜头有自己的时长 |
| `generate_audio` | 2.6、v3、O3 | 关掉每秒更省;反正要在时间线里配乐时,就让它关着 |

反向提示词在这一线上比多数线上更配得上位置:可灵的失败集中在快速运动中的肢体与接触瑕疵,点名你正看到的那个就能压住它。O1 与 O3 两个旋钮都不暴露,在那两版上,提示词就是全部乐器——把参数本可省下的词都花进去。

## 图生视频

图像是锚。提示词只写变化——镜头怎么动、主体接着做什么、光怎么移。重述画面里已有的东西,既费词,又邀请模型把它重渲得略不一样。`start_image` 与 `end_image` 同用,得到一个落点固定的运镜。宽高比跟随输入图;该参数被忽略。

## 运镜控制不是提示词的活

运镜控制端点把参考视频里的角色动作复制到参考图上,提示词只给结果上色。决定产出的是 `character_orientation`:`video` 匹配参考片段的朝向,撑得住最长 30 秒的复杂运动;`image` 匹配静图、更跟得住镜头运动,上限 10 秒。参考图需要一个无遮挡、占画面 5% 以上的人形。

## 症状

| 出了什么问题 | 改什么 |
| :--- | :--- |
| 一条漂移长镜头,而不是节拍 | 把镜头挪进 `multi_prompt` 配 `shot_type: customize`;版本没有分镜表就换 v3/O3 |
| O3 片段回来无声 | 那里 `generate_audio` 默认为 false |
| 角色在剪切处换脸 | 给他一个元素,每次提及都打标签 |
| 两句台词撞在一起 | 加衔接词,并把每句绑到动作上 |
| 滑步的脚、弯折的手指 | 把那个瑕疵写进 `negative_prompt` |
| 构图无视写明的布局 | 把 `cfg_scale` 往 0.7 提 |
| 口播台词出来是错的语言 | 用中文或英文写台词——其余语言都会被翻译 |

用 `analyze_video` 与 `detect_video_scenes` 给渲染打分而不是看一遍;需要一份"落了什么"的书面读解时用 `understand_video`。

改编自 fal 的可灵 3.0 提示词指南与 Kling 3.0 Pro 使用说明:
https://blog.fal.ai/kling-3-0-prompting-guide/
https://fal.ai/learn/tools/how-to-use-kling-3-0-pro
