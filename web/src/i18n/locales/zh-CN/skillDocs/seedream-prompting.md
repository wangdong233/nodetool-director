# Seedream → 一份生产简报,不是一句图注

Seedream 回报按"递给修图师"的方式写的简报:交付物是什么、里面有谁、一切各就其位、光怎么打、上面写什么、长什么样。图注得到图注级的结果。

用 `find_model` 查 `text_to_image` 或 `image_to_image`,再走 `generate_image` / `edit_image`。

## 六层,按此顺序

靠前的子句权重更大,所以顺序本身就是指令的一部分。

1. **形态** — 交付物。"Fashion editorial magazine cover"(时尚编辑刊物
   封面)、"packshot on plain white"(纯白底产品照)、"streaming
   poster"(流媒体海报)。
2. **主体** — 身份、着装、材质、造型。具体胜过恭维:"a woman in her 40s,
   close-cropped grey hair, oversized charcoal wool coat"(四十多岁的女
   性、利落的灰色短发、超大廓形炭灰羊毛大衣)胜过 "a stylish woman"
   (一位时髦女性)。
3. **构图** — 东西坐在哪、框怎么裁。"Subject on the left vertical third,
   product centred at the lower edge, generous headroom"(主体落左竖三分
   线、产品居中压下缘、头部留白大方)。
4. **布光** — 方向与质地。"Hard key from camera left, deep falloff, one
   bounce card filling the shadow side"(机位左侧硬主光、深衰减、一块反
   光板补暗部)。
5. **画面文字** — 确切文案,放引号里,并说明位置。
6. **风格** — 美学锚点。"Editorial photorealism, 85mm, shallow focus,
   muted film grade"(编辑级照片写实、85mm、浅焦、低饱和胶片调色)。

省掉一层,就是把一个决定交给模型的默认值,而它的默认值居中、布光均匀、平庸。

## 字数预算

Seedream 4.x 上瞄准 30–100 词。Seedream 5 接受长得多的简报,但大约过 600 个英文词后注意力开始散。具体性买到的比长度多:超预算后模型丢子句,丢哪几个不由你选。

## 画面里的文字

把字面文案放进引号,并说明去处。凡是你描述而不是引用的,模型都会替你写。

> Fashion editorial cover, 3:4. Masthead "ATRIUM" in tall thin capitals across
> the top edge, one cover line "The Quiet Season" in small italics at the lower
> left. A model in a raw-edged linen coat against a bare plaster wall, three-
> quarter turn, looking off-frame right. Soft north light from the left, long
> shadow across the plaster. Editorial photorealism, medium format, muted
> palette. No other text.

结尾一句 "no other text"(别无其他文字)正是拦住模型往页边空白里填自造字迹的东西。只有当文案属于交付物本身才引用它;给时间线打底的关键帧或视频片段,标题与叠印字不进画面,事后作为文字片段加上(`caption-titles`),保持可编辑。

## 编辑:先钉住,再改动

参考图引导的编辑最多收十张图——多传则只用最后十张。失败模式不是编辑本身,是你没提到的一切在漂。把钉子说出来:

> Change only the bottle's label to matte black with "SERIES 04" in white
> sans-serif capitals. Keep the exact bottle silhouette, the exact camera
> angle, the exact backdrop and the exact studio lighting from the reference.

按内容称呼参考图,不按序号:"the tan leather journal"(那本棕褐色皮面手账),不是"第二张图"。内容描述在重排后依然成立,也能区分两张长得像的参考图。产品身份要喂白底产品照——生活方式照片带着一个模型会试图保住的场景。

Seedream 5 Pro 增加了区域级精确编辑与图层分离,这正是"一处必须变、其余画面必须可证明未动"时选它的理由。

## 尺寸与档位

`image_size` 从 1024×1024 到 2048×2048 总像素,宽高比 1:16 到 16:1,默认 `auto_2K`。迭代时在小档位磨构图,交付时以 2K 渲染。比例跟着简报走,别默认方图:封面 3:4,海报 9:16,静物 4:3。

## 症状

| 出了什么问题 | 改什么 |
| :--- | :--- |
| 主体与你描述的不符 | 把主体描述前移,把它的辨识特征写具体 |
| 混入了不想要的插画风 | 点名你要的风格,并明确反向掉你得到的那个 |
| 元素落错位置 | 陈述空间关系;减少画面里的东西数量 |
| 文案被改写或自造 | 逐字引用、安排位置,并以 "no other text" 收尾 |
| 编辑中未触碰的区域变了 | 补上钉子——轮廓、角度、背景、布光 |
| 结尾的子句被无视 | 你超预算了;砍到要紧的那几层 |

给结果打分而不是眯眼看:`critique_image` 与 `score_image_adherence`;在候选之间挑选时用 `compare_images`。

改编自 fal 的 Seedream v4.5 提示词指南与 Runware 的 Seedream 5.0 Pro 提示词指南:
https://fal.ai/learn/devs/seedream-v4-5-prompt-guide
https://runware.ai/docs/models/bytedance-seedream-5-0-pro/guides/prompting
