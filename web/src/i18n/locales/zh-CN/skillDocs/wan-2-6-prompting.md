# Wan 2.6 → 两种模式,两种提示词形状

Wan 2.6 从文字生成,或让静图动起来。每种模式要的提示词形状不同。形状写错,是片段回来平庸的常见原因。

用 `find_model` 查 `text_to_video` 或 `image_to_video`,再走 `generate_video` / `animate_image`。它们转发提示词(和图像)、反向提示词(`animate_image` 没有)、时长、画幅与分辨率。镜头模式开关、提示词扩写和音频文件只在路由自己的节点上:用 `search_nodes` 找到它,用 `get_node_info` 读字段,用 `run_node` 运行。每次运行都是付费生成,连渲多条前先与用户确认范围。

fal 的指南把主提示词限在 800 字符以内。没有一条在售路由写明这个上限,但按它成立来写。

## 文生视频

两个组成部分:一句全局风格线,然后是带时间括号的镜头。

```
A cinematic journey through ancient ruins at sunset. Photoreal, 4K, film grain.

Shot 1 [0-3s] Wide establishing shot of stone pillars with sunlight streaming through.
Shot 2 [3-7s] Camera tracks forward through an archway revealing a hidden chamber.
Shot 3 [7-10s] Close-up of ancient inscriptions as dust particles float in light beams.
```

镜头模式是一个开关,名字和默认值各家不同:AtlasCloud 的 `shot_type` 默认 `multi`,Replicate 的 `multi_shots` 默认 false,在那里发括号镜头前要先设 true。给每个镜头一个时间标记、一个镜头动作(push、pull、pan、orbit、track)与它的场景元素——主体位置、光线变化、环境细节。靠跨镜头引用同一批角色、地点与物件保持连贯;互不相关的镜头产出割裂的结果。

AtlasCloud 的时长为 5、10 或 15 秒,720p 或 1080p,画幅 16:9、9:16、1:1、4:3 或 3:4。按你选的画幅写:16:9 用宽定场与横向运动,9:16 用更紧的取景与纵向构图,1:1 用居中主体。

## 图生视频

描述随时间的变化,不描述画面。模型已经有了那一帧;重述它的词,就是没花在运动上的词。

```
Continue from first frame. Gentle camera push toward the mountain peak as
clouds drift overhead. Light changes from morning to golden hour. Cinematic and
serene movement.
```

把提示词花在镜头运动、光线变化与环境动画上——水、云、枝叶、烟。同一个镜头开关适用:AtlasCloud 默认 `multi`,Replicate 的 `multi_shots` 为 false。纯动画静图就设单镜头。

图像在这些条件下动得更好:高分辨率、景深分明、带氛围元素、不杂乱且主体明确。元素相互抢戏的杂乱构图产出不一致的运动。fal 的指南给输入图每边 360 到 2000 px,最大 100 MB。

## 控制项

**反向提示词** — fal 的指南限 500 字符。优先写你真看到的瑕疵:"low quality, blurry, distorted faces, unnatural movement, text, watermarks, shaky camera"。

**运动强度**是措辞选择,不是参数。轻微:"subtle camera drift"(细微镜头漂移)、"gentle movement"(轻柔运动)。中等:"smooth camera track"(平稳镜头跟踪)、"flowing motion"(流动运动)。剧烈:"dynamic sweeping motion"(动感扫动)、"rapid camera movement"(快速镜头运动)。

**音频输入**(路由节点上的 `audio`)收 WAV 或 MP3,3 到 30 秒,最大 15 MB,按 fal 的指南。音频比视频长会被截断;比视频短则其余静默。写对白时,把说话人提示放进提示词。

**提示词扩写**(`enable_prompt_expansion`)在每条 Wan 2.6 视频路由上默认开启,生成前用一个 LLM 过一遍提示词。它补细节而不占 800 字符预算;你先给了风格参照、视觉描述词与精确术语时,它扩得最好。

## 症状

| 出了什么问题 | 改什么 |
| :--- | :--- |
| 叙事不连贯 | 把场景拆成带时间括号的具体镜头 |
| 主体不一致 | 每个镜头都重复角色描述 |
| 运动不自然 | 明确点名镜头运动:push、pan、orbit |
| 画质发平 | 往全局风格线加质量描述词 |
| 某个元素被无视 | 在镜头描述里前移它 |

一次只迭代一个变量,并从文生视频起步——镜头与时间格式迁移到图生视频,不依赖任何素材。用 `analyze_video`、`detect_video_scenes` 与 `understand_video` 检查渲染。

改编自 fal 的 Wan 2.6 提示词指南:
https://fal.ai/learn/devs/wan-2-6-prompt-guide-mastering-all-three-generation-modes
