**先加载 `/storyboard-core`。**它承载本技能所假定的循环、工具契约、
实体规则与门禁。下面只讲带真人出镜的手机实拍作品,做法上有什么不同。

## 这类任务的独特之处

脸就是交付物。一个角色实体要在每个镜头里活下来,而观感要像手机拍的、
不像摄影机拍的。两者都只在板上设一次,绝不在镜头文本里重新争论。

## 选角先行,而且分两轮

这里没有"凭文字直接创建",你没看过的一张脸就是锁不住的一张脸。

1. `find_model`(`text_to_image`)→ 只带角色描述的 `generate_image`:年龄、
   体型、肤质、发型,无服装、无布景,正面光,中性表情。
2. 展示它。用户满意就 `create_entity {asset_id, kind: "character", name,
   descriptor}`。描述词只写脸和头发。
3. 板上第一批静图回来后,如果某一帧比参考图更好,用
   `update_entity {entity_id, asset_id}` 把实体挪到那个裁剪上。这件事
   要在出剪辑**之前**做,不是之后。

给的是照片:存为素材,再从它 `create_entity`。描述词按照片里的脸和头发
写,并且**不带照片里的衣服**——服装属于镜头文本,同一个实体才能在这块
板上穿运动套装,在下一块板上穿大衣。

## 观感一次性写进分镜板风格

把手机感伪装写进 `style`,经 `set_board` 设定,绝不逐镜写:

| 样式 | `style` |
|---|---|
| 前置摄像头 UGC | `handheld front-camera iPhone, mild shake, autofocus hunt, compression grain, window daylight, no beauty filter` |
| 朋友掌镜 | `handheld phone at arm's length, natural wind and room noise, slightly off-level framing` |
| 旧手机仪式感 | `old iPhone 1x, propped static angle, fluorescent tint, heavy noise` |
| Vlog | `chest-height phone gimbal, wide lens, natural light, mild bloom` |

不要音乐、不要配乐、不要烧录字幕。原生声音是这种质感的一部分——在简报
里写明,视频模型才不会自己加音乐底。

## 镜头配比

五到八个镜头。头四秒一个钩子,中段让事情在身体上真实发生,收尾对镜头
下结论。

- **台词是镜头字段**,不是 `action` 的一部分。写进 `dialogue`,用户日后
  想正经配音时,`extract_script_from_storyboard` 才能把字提出来。
- 物理节拍写进 `motion`,带**次数**:`two short spray bursts`、
  `two head turns`、`she lifts one section of hair and lets it fall, once`。
  "她有反应"渲染出来什么都不是。
- 不带人的结尾卡(包装主画面、标识卡)要写自己的 `entity_ids`,只点产品
  ——否则角色的描述词会注入她没出镜的镜头。
- 原生音频的视频模型,最弱的正是图像路径。台词必须看着对口型的镜头,设
  `render_mode: "direct"`,把构图与风格写进 action 文本,因为没有静帧
  替它们携带。

## 服装与状态

一部作品一套衣服,除非剧本在镜头里当众换。同一个人的湿身、沾污或换装
版本是**第二个实体**——用同样的方式选角,并在适用的镜头里点名它。

## 简报

把这些示例按用户的简报改编。示例交付物、风格选择与审批检查点只在用户
采纳时适用。

下面的**简报**有四份按这些规则写就:评测转主打 UGC 广告、Pinterest 翻车
喜剧、更衣室仪式,以及带镜头压缩步骤的夜城 Vlog。替换方括号占位符,在
常规指令之后交付其中一份。

## 简报 — 真人出镜手机实拍

每条消息一份,跟在 `/storyboard-core` 的常规指令之后。替换 `[PRODUCT]`、
`[CITY]`、`[ACTIVITY]`。`Nova` 代表角色实体的**普通名字**——正是它让
实体注入提示词。

---

### 评测转主打 UGC 广告,30s 9:16

```
Direct a 30s 9:16 UGC-to-hero ad for [PRODUCT].

Cast first. [PRODUCT] as a prop entity from the attached pack shot. Nova as a
character entity: generate the reference still (early 20s, natural skin, no
beauty filter, front-lit, neutral) and show me before you tag it. Descriptor is
face and hair only.

Board style: handheld front-camera iPhone, bedroom or bright bathroom, mild
shake, autofocus hunt, compression grain, window daylight, no beauty filter.
Natural audio only, no music, no burned-in captions.

Seven shots, then stop.
1a 0-4   hook. Nova touches untreated hair. "I wanted lighter hair..."
2a 4-8   she finds [PRODUCT] on the dressing table, autofocus hunts onto the
         label. "...without permanently dyeing it."
3a 8-13  she sections her hair, two short spray bursts. Physical coverage, not
         a magic glow.
4a 13-18 extreme close-up, untreated against treated. "Okay... that is
         actually a huge difference."
5a 18-23 mirror selfie, two head turns. "I actually love it."
6a 23-26 [PRODUCT] held beside her face. "Just spray and switch up your look."
7a 26-30 no talent. Studio hero of [PRODUCT], slow 8cm push-in, cream
         cyclorama, copy space right. Set entity_ids on this shot to the
         product alone.

After I pick a face from the stills, move the Nova entity onto that crop before
any clip renders.
```

### Pinterest 翻车喜剧,30s 16:9

```
Direct a 30s 16:9 friend-shot phone comedy. Nova tries to get a perfect
Pinterest still of [ACTIVITY] with [PRODUCT] in frame; reality ruins every
attempt. Same face and wardrobe throughout.

Cast Nova from text first: generate the reference, show me, then tag it.
Board style: handheld phone at arm's length, natural wind and room noise,
slightly off-level framing. No score — wind and laughter only.

1a 0-5   she arranges the cloth and [PRODUCT]. Wind flips the plate once.
         "...Okay, we'll pretend that didn't happen."
2a 5-10  deadpan, she does not chase it. A friend's laugh jolts the frame once.
3a 10-15 serene profile, a bee, one swat, a whip-pan.
4a 15-20 hair-in-wind walk, cardigan over her head, [PRODUCT] still in one hand.
5a 20-25 thermos pour, a stain spreads, off-camera "That's going to stain—"
6a 25-30 she flops onto the cloth, [PRODUCT] on her stomach. "This is the photo.
         This is the one we're posting." Thumbs up, cut mid-laugh.
```

### 更衣室仪式,19s 16:9

```
Direct a 19s 16:9 everyday phone video of Nova, cast from the attached photo.
Save the photo as an asset, then create the entity from it. The descriptor pins
the face and hair from the photo and does not mention its outfit.

Wardrobe in the shot text: black gym set, hair tied. Locker room, full-length
mirror, bag on the bench, no readable signage.
Board style: old iPhone 1x, propped static angle, fluorescent green tint, heavy
noise. No music bed.

1a 0-4   she walks to the mirror, props the phone, adjusts her straps
2a 4-8   sits, double-knots her laces, bounce-tests the shoes twice
3a 8-11  earbuds in, one at a time
4a 11-14 two shoulder rolls, a quiet "okay... let's get it."
5a 14-17 three arm swings, one glance at the camera
6a 17-19 picks up the phone, walks to the door, freeze mid-stride

Stills from the photo entity, then one clip pass.
```

### 夜城 Vlog,30s

```
Direct a 30s first-person night vlog in [CITY] with Nova in one outfit
throughout. Mix selfie, cockpit, aerial and street-level. Short landmark lines
for [LANDMARK A] and [LANDMARK B]. No text, no logos. Wind in her hair.

Board style: chest-height phone gimbal, wide lens, city sodium and neon, mild
bloom, natural audio.

Board up to ten shots, then — before any render — propose a six-shot collapse
and name the four you would drop. Stop there.

1  rooftop selfie, the vehicle behind her. "I'm getting on this in [CITY]."
2  inside, harness on, a nervous smile
3  lift-off, wide city and water
4  open door. "there's no door."
5  POV, feet over the grid
6  selfie with [LANDMARK A]. "That's [LANDMARK A]."
7  aerial over [LANDMARK B], her feet in frame
8  low pass along a bridge
9  she steps off, same outfit, walks to camera
10 crossing the street. "Alright everyone, bye."
```
