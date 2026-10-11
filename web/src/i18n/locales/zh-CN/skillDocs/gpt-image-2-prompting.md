# GPT Image 2 → 五个槽位,按顺序

该模型吃结构:场景、主体、具体细节、预期成品、约束,按此顺序;提示词超过一小段后,节与节之间加换行。其余一切都搭在这根脊柱上。

用 `find_model` 查 `text_to_image` 或 `image_to_image`,再走 `generate_image` / `edit_image`。

## 模板

```
Scene:
[where this happens, time of day, background, environment]

Subject:
[who or what is the main focus]

Important details:
[materials, clothing, texture, lighting, camera angle, lens feel, composition, mood]

Use case:
[editorial photo / product mockup / poster / UI screen / infographic / concept frame]

Constraints:
[no watermark / no logos / no extra text / preserve face / preserve layout]
```

五个槽位,对应人们通常混在一起的五个问题:图像存在于何处、它关于什么、什么必须可见、你要哪种成品、什么不许漂。第五项正是平庸提示词无声失败的地方——只描述想法而不给它设界,模型就会朝你事后后悔的方向自由发挥。

填好的样子:

```
Scene:
A quiet classical museum gallery in soft afternoon light.

Subject:
A woman in her 30s standing casually in front of a large oil painting.

Important details:
Natural smile, realistic skin texture, beige knit sweater, dark jeans, white
sneakers, eye-level full-body framing, marble floor reflections, warm neutral
colour balance, shallow depth of field, believable indoor ambient light.

Use case:
Editorial lifestyle photograph.

Constraints:
No watermark, no logos, no extra people in the foreground, no heavy retouching.
```

## 规则

1. **视觉事实胜过空泛赞美。**扔掉 stunning、incredible、epic、masterpiece、
   insane detail。改用 overcast daylight(阴天光)、brushed
   aluminium(拉丝铝)、chipped paint(剥落的漆)、clean kerning(干净字
   距)、50mm feel(50mm 感)、soft bounce light(柔和反弹光)、worn
   canvas(磨旧帆布)。
2. **风格标签要有视觉落点。**"Minimalist brutalist editorial luxury
   premium" 是噪声。"Cream background, heavy black condensed sans serif,
   asymmetrical type block, one hero object, generous negative space, studio
   tabletop lighting"(米白背景、厚重黑色窄无衬线、不对称字块、一件主打
   物、大方留白、影棚台面光)是一份版式。
3. **说真东西。**Transit kiosk(公交候车亭)。Boarding pass(登机牌)。
   Preserve the face(保住这张脸)。氛围语言会埋掉简报。
4. **编辑时把"改"与"保"分开。**"Change only X"(只改 X)、"keep
   everything else the same"(其余全部保持原样),并且每一轮都重述保留
   清单。
5. **把文字当排版对待。**字面文案放引号里或全大写,标上 EXACT
   TEXT(精确文字),并指定字体大类、字号、颜色与位置。加上 "no extra
   words"(不加多余的字)与 "no duplicate text"(不重复文字)。
6. **一轮只改一处。**小的迭代编辑胜过一次大改写。

## 三种模式

**从零生成** — 用上面那套五槽模板。提示词一旦锁住布光、镜头行为与环境细节,一遍干净的生成就能落地可信的日常写实。

**编辑一张图** — 两栏,外加一行物理写实:

```
Change:
Replace the parked car with a vintage bicycle.

Preserve:
The house, fence, driveway concrete, landscaping, lighting direction, and time
of day, exactly.

Constraints:
Match the bicycle's scale and shadow pattern to the existing scene. No extra
objects, no redesign, no watermark.
```

保留清单决定编辑的成败。盘点必须留下的一切——雨棚、砖立面、窗棂、反光、人行道、上面的每一个人——编辑就守在界内。

**合成多图** — 给每张输入按角色标注,并在指令里引用这些标签。该家族最多收 16 张参考图。

```
Image 1: base scene to preserve.
Image 2: jacket reference.
Image 3: boots reference.

Dress the person from Image 1 using the jacket from Image 2 and the boots from
Image 3. Preserve the face, body shape, pose, background, lighting, and framing
from Image 1. Fit the garments naturally with realistic folds, drape, occlusion
and contact shadows. No extra accessories.
```

不加标注的输入会让模型去猜哪张是内容、哪张是参考,而它猜错。

## 它擅长什么

- **照片写实编辑片。**描述那张照片,而不是幻想:镜头、取景、时段、光源、
  表面磨损、一个平常的背景细节、一处可信的不完美。
- **产品。**材质准确、布光一致、标签忠实。一份实物的平实清单,加一件必须
  保持可读的印刷品,就是全部配方。
- **UI 与截屏。**点名屏幕类型、层级、确切文案、状态与布局逻辑。"Clean
  survival HUD along the bottom, believable UI spacing"(底部一条干净的
  生存 HUD、可信的 UI 间距)就把版式活干了;删掉这些子句,HUD 就塌成噪声。
- **图中文字。**先给逐字文案,再给排版,再给布局,最后 "render the text
  verbatim / no extra words / no duplicate text"(逐字渲染文字/不加多余
  字/不重复)。要坐上时间线或给视频片段打底的静帧,文案不进画面,事后
  作为文字片段加上(`caption-titles`),保持可编辑。
- **风格迁移。**"Same style"(同风格)不够。点名各个部分:chunky pixel
  forms(粗像素形体)、limited arcade palette(街机限色)、bright glow
  accents(亮辉光点缀)、clean silhouette edges(干净剪影边缘)。
- **画转照片。**说清那张画是建议还是契约:"preserve the exact layout,
  horizon line, proportions, river path, mountain placement, tree placement,
  and overall perspective"(保留确切版式、地平线、比例、河道走向、山的
  位置、树的位置与整体透视)。
- **角色一致性。**第一条提示词立锚。第二条提示词逐字重复锚点细节,并加
  "do not redesign the character"(不要重新设计这个角色)。

透明通道:背景设为透明时 PNG 与 WebP 输出支持透明;JPEG 会悄悄回落为不透明。

检查渲染而不是默认它没事:`critique_image`,或提示词里有要守住的文案或版式时用 `score_image_adherence`。

改编自 fal 的 GPT Image 2 提示词指南:
https://fal.ai/learn/tools/prompting-gpt-image-2
