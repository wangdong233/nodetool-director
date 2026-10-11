# FLUX.2 [klein] → 结构优先,然后快速迭代

klein 是 FLUX.2 家族里小而快的一员:4B 或 9B,亚秒级推理,出片写实度与文字渲染都超出它的速度档。速度本身就是意义。当一次生成要 30 秒,提示词打磨就停摆;在这里你可以改一个子句再看一眼,所以下面的工作方法比任何单条提示词都值钱。

用 `find_model` 查 `text_to_image` 或 `image_to_image`,再走 `generate_image` / `edit_image`。

## 提示词层级

klein 按此顺序读提示词,而且内容词(名词)比修饰词更能推动输出。按同样的顺序写:

1. **主体** — 具体胜过抽象。"A woman in her mid-30s with shoulder-length
   auburn hair"(三十多岁、齐肩赤褐色头发的女性)胜过 "a person"(一个人)。
2. **环境** — 光线、氛围、空间关系。"First light filtering through morning
   mist"(晨光滤过晨雾)给出 "morning scene"(早晨场景)给不出的渲染线索。
3. **风格与情绪** — 引导而不压场的方向:"documentary photography"(纪实
   摄影)、"studio lighting"(影棚布光)、"cinematic"。
4. **技术** — 构图("rule of thirds",三分法)、景深("shallow focus on
   the foreground",前景浅焦)、色板("warm earth tones",暖大地色)。

> Professional headshot of a male architect in his 40s, salt-and-pepper beard,
> black-rimmed glasses, charcoal blazer. Modern office background with
> architectural models visible but softly blurred. Natural window light from
> the left creating gentle shadows. Corporate photography style, sharp focus on
> the eyes, neutral grey backdrop.

## 参数

| 参数 | 它权衡什么 | 该坐在哪 |
| :--- | :--- | :--- |
| `guidance_scale` | 提示词遵从对创作自由 | 2–4 给艺术演绎,5–8 给产品摄影与技术插图 |
| `num_inference_steps` | 质量对时间 | 打磨提示词期间调低,交付印刷级输出时调高 |
| `acceleration` | 细节对吞吐 | 生产用 `regular`,极限速度用 `high` |
| `seed` | 无——它只是把噪声从对比里拿掉 | 测试提示词变体时钉住它 |

宽高比跟着用途走:演示与网页用横版,社交与手机用竖版,头像与均衡构图用方版。

## 技法

- **强调靠自然语言,不靠权重。**没有权重语法。"Prominently featuring"
  (醒目呈现)、"with particular attention to"(特别关注)与 "especially
  detailed"(格外细致)就是提高一个元素优先级的方式。
- **反向提示词瞄准失败模式,不瞄准"质量"。**人像:"distorted features,
  unnatural proportions, extra limbs"(五官扭曲、比例失真、多余肢体)。
  风景:"oversaturated colours, artificial lighting, lens distortion"(过
  饱和颜色、人工光、镜头畸变)。一份泛泛的质量清单什么都买不到。
- **写清楚的文字渲染得很好。**给出文案、字体大类、颜色、位置与大小写:
  "a white coffee mug with the text 'GOOD MORNING' in bold sans-serif black
  letters, centred on the mug"。换句话说,是本来就属于设计的文案——要进
  时间线的静帧上的标题或叠印字,事后作为文字片段加上(`caption-titles`),
  不进渲染。
- **多参考图条件化是这一家族的杀手锏。**"The subject from the first image
  wearing the jacket from the second image, photographed in the environment
  from the third image."(第一张图里的主体,穿着第二张图里的外套,拍在第
  三张图的环境里。)

## 五个错误

- **过载的提示词。**大约过 100 词,模型就开始丢子句。每个词都该在干活。
- **空泛的风格引用。**"Make it look good"(弄好看点)不是方向。"Shot on
  Hasselblad medium format"(哈苏中画幅拍摄)或 "impressionist painting
  technique"(印象派绘画技法)才是。
- **缺构图。**提示词把主体描述得面面俱到,却从不说它坐在哪。加上
  "centred composition"(居中构图)、"rule of thirds with the subject on
  the left vertical"(三分法、主体落左竖线)或 "bird's eye view"(鸟瞰)。
- **自相矛盾的指令。**同一条提示词里 "Photorealistic portrait"(照片写实
  人像)与 "watercolour painting style"(水彩画风)两头都不落。
- **被忽略的布光。**光让图像有体积。永远点名它:黄金时刻、影棚柔光箱、
  勾出剪影的轮廓光。

## klein 生来适配的循环

从主体、环境与风格开始。生成。钉住种子。改一个元素——加布光细节、细化主体、挪构图——再生成。一次一个变量,你才说得出哪个子句推动了哪个变化;亚秒级回转才让这件事付得起。

留下管用的提示词。一套按用途分档的公式库,连同各自合适的引导强度与步数值,和图片一样都是这个循环的产出。

改编自 fal 的 FLUX.2 [klein] 提示词指南:
https://fal.ai/learn/devs/flux-2-klein-prompt-guide
