**先加载 `/storyboard-core`。**它承载本技能所假定的循环、工具契约与门禁。
下面只讲该循环之前的拆解轮,以及哪些东西可以带过去、哪些绝不可以。

## 这类任务的独特之处

结构是给定的,所以工作在于准确读懂它,再用不同的内容重建它。两种失败
形态:把参考描述得模糊到重建出来的东西与它无关;或者抄得太近,以至于
复刻了别人的商标元素。

## 先读懂参考

用 `find_model` 按 capability 为 `capability: "generate_message"` 找一个能读
视频的模型——Gemini 原生支持——然后:

```
understand_video {provider, model, video, prompt, max_tokens}
```

`video` 接受素材 id、`asset://` URI、URL 或 data URI。它读的是整条视频,
不是抽样帧。一次只问一件事,别一口气全问;两三次调用比一条塞满的提示词
读得更准。

按以下顺序提取:

1. **画幅:**宽高比、总时长、镜头数。
2. **头三秒**——钩子实际做了什么,用动作描述出来。
3. **逐镜:**入点与出点时码、构图、机位高度、运镜、谁在说话、产品是否
   可见以及以何种方式可见。
4. **声音配方:**对白、旁白、房间底噪、音乐,以及声音是否属于剧内(有源)声。
5. **一段话讲它为什么成立**——讲机制,不讲赞美。

汇报拆解结果。只做分析的需求或用户要求复核时到此为止。已授权重制的,
带着参考结构与新的简报继续。

## 哪些带得过去,哪些绝不行

| 带过去 | 换掉 |
|---|---|
| 剪辑节奏——每个镜头的时长 | 房间、布景、场地 |
| 机位高度与构图 | 服装与选角 |
| 节拍顺序:钩子、演示、结论 | 每一句台词 |
| 声音是否为剧内声 | 产品本身 |
| 宽高比与总时长 | 配色,除非用户要求对齐 |

**绝不把商标元素带过来。**标识、文字标、作为品牌识别的品牌色、广告语、
包装版式,以及参考画面里任何可读的招牌,都不进入重制。在分镜板的
`style` 里写上 `no brand marks other than [PRODUCT]`。如果用户要参考视频
里那个真正的标识,直说重制版只用他们的产品、别无其他,然后继续做剩下
的事。

## 重建

把提取出的每个镜头对应到一条 `add_shot`,时长写进 `duration_seconds`,
构图写进 `camera.framing`——并在 `action` 文本里复述构图与机位高度,
因为只有 `framing` 会进入静帧提示词。

渲染前先选角:角色实体用一张先生成给用户过目的参考图,道具实体用他们的
产品照。把镜头编成 `1a`、`2a`……方便用户对照参考视频自身的编号点名
某个镜头。

然后跑核心循环:静图、选条、剪辑。

## 简报

把这些示例按用户的简报改编。示例交付物、风格选择与审批检查点只在用户
采纳时适用。

```
Read the attached reference video with understand_video (find a model that reads
video via find_model, capability=generate_message — Gemini reads it natively).

Extract: aspect, length, shot count; what the first three seconds do; then per
shot the in/out timecode, framing, camera height, move, who speaks and whether
the product is visible. Then the audio recipe, then one paragraph on the
mechanism that makes it work.

Report that and stop.

Then rebuild it for [PRODUCT] with a new character. Keep the cut rhythm, the
durations and the camera heights. Change the room, the wardrobe and every line.
Carry no trademark from the reference — board style gets "no brand marks other
than [PRODUCT]".

Cast from stills first: generate the character reference, show me, then tag it.
Slug every shot so I can say "fix 2a".
```
