# 海螺 → 一串节拍,按顺序

海螺按读到的顺序做动画。它没有反向提示词、没有分镜表、也没有 CFG 旋钮,你能拿到的全部控制都在措辞里:发生什么、按什么顺序、以及事情发生时镜头怎么表现。片段 6 或 10 秒(海螺 02 的 1080p 没有 10 秒档)。

用 `find_model` 查 `text_to_video` 或 `image_to_video`,再走 `generate_video` / `animate_image`。

## 把动作写成节拍

把一个动作拆成它由之构成的节拍,用顺序词连起来——first、then、as、finally。模型动画化的就是这个顺序。

> A skateboarder rolls toward a handrail in an empty underground car park.
> First he crouches low over the deck, then he pops the tail and the board
> snaps up under him, and as he lands on the rail the trucks grind along the
> steel, sparks trailing behind. Finally he drops off the end and rolls out of
> frame past a pillar.

对比 "a skateboarder does a trick on a rail"(滑板玩家在栏杆上玩个花活):它把整场编排留给模型发明,也给不出版本按你本意收场的理由。

情绪节拍同理。"She reads the letter with growing concern, tears well up, then she crumples the paper and throws it"(她读信,忧虑渐起,泪水涌上,随即把纸揉成一团扔掉)是三个可动画的状态;"she is sad about the letter"(她为那封信难过)是一个形容词。

## 镜头

在导演端点(`video-01-director` 及其图生视频形态)上,运镜是方括号里的命令。支持十五个:

`[Truck left]` `[Truck right]` `[Pan left]` `[Pan right]` `[Push in]`
`[Pull out]` `[Pedestal up]` `[Pedestal down]` `[Tilt up]` `[Tilt down]`
`[Zoom in]` `[Zoom out]` `[Shake]` `[Tracking shot]` `[Static shot]`

两条摆放规则承载全部。同一括号内的命令同时发生,上限三条:`[Truck left, Pan right, Zoom in]`。在提示词不同位置的命令,按先后发生:

```
[Static shot] The chef sets the plate down under the pass light. [Push in]
He wipes the rim with a cloth, then looks up. [Tilt up, Pan right] The dining
room comes into view behind him.
```

其余所有海螺端点只以散文收镜头指示——"a slow tracking shot follows her"(一个缓慢的跟拍镜头跟着她)、"the camera racks focus from the leaves to her face"(镜头从树叶移焦到她的脸)。括号在那里只是文字。

## prompt_optimizer

全线默认开启,生成前用一个 LLM 重写你的提示词。提示词短就留着:它补上你没写的细节。提示词已是一份深思熟虑的简报时就关掉——否则它会把你刚花力气写下的具体着装、具体光线与节拍顺序重写掉。

## 图生视频

画面已定。只提示变化:运动、镜头、光随时间的走向、环境动画。简短点名主体以锚定参考无妨——"the red-haired woman turns slowly to face camera"(红发女子缓缓转身面向镜头)——但重述静图的一段话,就是没花在增量上的一段话。

取景与源图保持一致。要求一张特写输入图产出宽定场运镜,就是你得到一条幻觉出来的身体的方式。

`video-01-subject-reference` 用一张参考图让脸贯穿片段;描述这个人的动作,不描述外貌。

## 没有反向提示词

没有这个字段,而提示词里的 "no text, no watermark, not blurry"(不要文字、不要水印、不要模糊)会被当成内容读。改说该在那里的是什么。空旷的天空,不是 "no birds"(不要鸟)。一面素水泥墙,不是 "no graffiti"(不要涂鸦)。

## 症状

| 出了什么问题 | 改什么 |
| :--- | :--- |
| 动作以错误的顺序收场 | 用 first / then / as / finally 给节拍编号 |
| 镜头在漂 | 在导演端点上用方括号命令,或用散文点名运镜 |
| 你写的细节消失了 | 把 `prompt_optimizer` 设为 false |
| 输入图裁切处凭空出现身体 | 让提示词的取景对齐输入 |
| 你排除的东西照样出现 | 把排除改写成正向描述 |

用 `analyze_video` 与 `detect_video_scenes` 给渲染打分;需要一份"落了什么"的书面读解时用 `understand_video`。

改编自 fal 导演端点文档所载 MiniMax 运镜契约,与 Akool 的海螺提示词指南:
https://fal.ai/models/fal-ai/minimax/video-01-director/api
https://akool.com/blog-posts/minimax-hailuo-video-prompt-guide
