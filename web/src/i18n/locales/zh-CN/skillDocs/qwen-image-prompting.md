# Qwen-Image → 画面里有字,就找这个模型

Qwen-Image 渲染其他图像模型会画糊的文字:原生支持十二种文字,小到约 10 px 仍可读,长版式指令也被遵守。这是选它的理由,提示词也该把篇幅花在文案与版式上,而不是形容词上。

用 `find_model` 查 `text_to_image` 或 `image_to_image`,再走 `generate_image` / `edit_image`。提示词可写到 5000 字符;反向提示词上限 500。

## 引用文案

引号里的任何内容都被当作字面文案。凡是你改成描述的,模型都会替你写——通常写得貌似有理,且永远不是你想要的那个。

> A vertical science poster. Title "轨道力学" in large bold characters across the
> upper third, subtitle "Orbital Mechanics" in small widely-spaced capitals
> directly beneath. Three labelled diagram panels down the centre, captions
> "近地点", "远地点", "转移轨道" under each. A thin rule separates the diagram block
> from a footer reading "第三版 · 2026". Flat editorial illustration, two-colour
> palette. No other text.

三个习惯让它落得住:

- **写字符本身,永远不要描述字符。**把中文、日文、韩文或西文串连同变音
  符号一起贴进去。"The Chinese word for orbit"("轨道"的那个中文词)产出
  的不是那个词的东西。
- **双语版式里声明两种文字的关系** — "on the same line"(同一行)、
  "stacked directly beneath"(紧贴其下正着堆叠)— 并让它们的大小与轻重
  相称,否则其中一种语言读起来像事后补的。
- **以 "no other text"(别无其他文字)收尾。**放任不管,模型会用自造
  字迹填满空白的页边。

文案属于画面本身时——海报、标签、场景里的招牌——用这个模型。要进时间线的静帧上的标题或叠印字不属于:那要事后作为文字片段加上(`caption-titles`),可以改字,也可以重新对时。

## 排版工作先关掉提示词扩写

在托管档位——Qwen-Image-2、Max 与 3——`enable_prompt_expansion` 默认开启,会先用一个 LLM 过一遍你的提示词。它救得了三词提示词,毁得了排版提示词:它会改你引用的字符串,还会加你没要的招牌。凡确切文案要紧,就设为 false。

开源权重版(`fal-ai/qwen-image`、各 `qwen-image-edit-*` 版本)没有这个开关,提示词按写下的执行。它们暴露的是 `guidance_scale`、`num_inference_steps` 与 LoRA——版式被解读得太松时调高引导;步数等提示词定稿前别动。

## 版式是相对的,不是度量的

字号点数和像素坐标在这里毫无意义。纵向次序、相对大小与相对轻重才有意义。"Large bold capitals across the top, small widely-spaced capitals directly beneath, body copy in two columns below the rule"(顶部大号粗体大写、正下方小号疏排大写、分隔线下双栏正文)是模型执行得了的版式。"24pt heading at x=120" 不是。

标注密集时,加结构记号——细线、边框、分格。没有它们,一块标注渲染成一张清单。

## 尺寸

在 Qwen-Image-3 上,文生图跑 512×512 到 2048×2048 总像素,编辑跑 512×512 到 1440×1440;其他检查点各有上限,先读端点。小字要像素:小图打构图,交付靠近上限渲染;小字必须存活时选更竖长的画布。

## 编辑

Qwen-Image-3 Edit 收一到三张参考图,且**顺序有讲究** — 提示词以 "image 1"、"image 2"、"image 3" 称呼它们。参考图每边 384–2048 px,每张 10 MB,JPEG/PNG 无透明通道或 WEBP。更早的编辑检查点也收列表,同样的 "image N" 惯例适用。

> Place the bottle from image 1 on the marble surface from image 2, keeping the
> bottle's label, proportions and cap exactly as they are. Match the lighting
> direction of image 2. Replace the label copy with "SERIES 04" in white
> sans-serif capitals.

不动的要说得和要动的一样明白。给产品照换色、把产品带进新场景、把两件产品摆到一起,都是同一种指令形状:哪张图出什么,什么不许动。

## 症状

| 出了什么问题 | 改什么 |
| :--- | :--- |
| 文字接近你要的但不是你的 | 逐字引用,并把 `enable_prompt_expansion` 设为 false |
| 页边出现自造词 | 加 "no other text" |
| 非拉丁文字渲染成乱码 | 贴字符本身,不要描述 |
| 小字不可读 | 靠近像素上限渲染,或用更竖长的画布 |
| 主体来自错误的参考图 | 明说 "image 1" / "image 2",并核对发送顺序 |
| 层级是平的 | 给每行一个相对大小与轻重,而不是点数尺寸 |

用 `critique_image` 与 `score_image_adherence` 给结果打分——你会先知道文案是否照写渲染,再看画面。

改编自 Runware 的 Qwen-Image-3.0 文字与排版指南:
https://runware.ai/docs/models/alibaba-qwen-image-3-0/guides/text-and-typography
