# 字幕与标题 → 时间线智能体

直接用时间线能力与开放时间线工具干活。不要搭工作流、不要编造剪辑、不要
渲染视频。

`motion-graphics` 承载这里点名的每个调用的操作契约。`motion-principles`
给出各档预设背后的入场与出场时长及缓动,`frame-composition` 定安全边距
与各档落位,`color-motion` 管字读不出来时的压暗层与对比修法,`logo-reveal`
管片头或片尾的品牌标。

## 文字属于后期,永远不是渲染提示词

每一篇板类技能、每一篇视频提示词技能都把屏幕文字送到这里来。标题卡、
叠印字、歌词或 CTA 是时间线上的文字片段,不是 `generate_video` 或
`generate_image` 提示词里的词:生成器写字不可靠,而且烤进像素的文案没法
改、没法翻译、没法重对时码。当某镜的 `action` 里带着 `Text: …` 时,那就
是字幕映射表的输入,渲染提示词根本不该要它。

## 硬门禁

先列出并读选中的时间线。它必须已有画面片段。缺失或为空就停下,要一条
真实的剪辑;把用户引到分镜或剧本转时间线的工作上去。动手前用
`create_timeline_version` 给时间线拍快照。

设字号之前先从 `get_timeline` 读 `fps`、`width` 和 `height`:`fontSizePx`
按序列分辨率编写,下面各档尺寸都是 `height` 的分数。

## 加文字前先锁定一套字系

先解定字体族与各档字重、以画面高度分数表示的五档字号、文字/强调色/
压暗配色、安全边距与最大宽度、各档动效预设。优先用随件的品牌套件,
其次用时间线上已有的文字,最后才是平台安全的通用方案。各档保持一致:
T1 标题/片尾卡,T2 下三分之一字幕条,T3 字幕,T4 标注,T5 CTA。

字体族要用 NodeTool 内置的——`Inter`、`Space Grotesk`、`Bebas Neue`、
`Playfair Display`、`Lora`、`JetBrains Mono`——否则每台主机都会按自己装
的字体解析它,编辑器与渲染算出的行宽对不上,`validate_timeline` 会报
`font_not_portable`。低于画面高度 2.5% 的字号报 `text_illegible`;正文
文案落在 2.5–4%。`motion-direction` 对整条片子持有同一条规则,所以已有
运动语言时,直接沿用它的字体族,不要另挑第二套。

各档动效遵循 `motion-principles`:`fade` 或 `slide` 入场 300–500ms、出场
200–300ms,按角色取默认缓动。只在 T1 或五个词以内的动态 T3 行上用错峰,
并把时长(`durationMs + offsetMs × (words − 1)`)对着片段算清——装不下
的错峰会被静默压缩,只有 `stagger_compressed` 会说出来。

每一档都有出厂构图。用 `{"op": "insert_composition", "composition_id":
"<id>", ...}` 插入并覆写它的 `params`,不要从裸片段搭架子——构图内部的
时序与动效已经调平。

| 档位 | 构图 id |
|---|---|
| T1 标题 | `title-card` |
| T2 下三分之一字幕条 | `lower-third` |
| T3 字幕 | `caption-bar` |
| T4 标注 | `callout` |
| T5 CTA / 片尾卡 | `cta-end-card` |

片头或片尾的品牌标是 `logo-sting`。

每一个压在实拍画面上的 T2–T4 元素都配一个对应的压暗层,除非底板确凿
可控。

## 字幕映射表

动手前先写定时程表:档位、确切文字、起止、位置、压暗层。字幕时长至少
`max(1200ms, words × 350ms)`。标题与片尾卡至少停留 2000ms。下三分之一
字幕条在人出现约 500ms 后进场,停留 2500–4000ms。一帧一个文字点子。
未知事实写 `[INPUT NEEDED: …]`。

## 让字母和它们的内容动起来

文字片段里会变的数字,在动画上存 `textAnimator`,配 `kind: "ticker"`、
`from` 和 `to`。它还收 `decimals`、`padTo`、`prefix` 和 `suffix`。
`groupSeparator` 设为 `","` 就把千位显示成 `2,847`;省略它则已有的
计数器保持不分组。要确定性解码到片段写好的文字,用
`kind: "scramble"` 配固定的 `seed` 和可选的 `charset`。它们都在动画
时窗上运作,所以定格的尾帧显示的是完成的值。

```json
{"id": "count-in", "role": "in", "preset": "fade", "durationMs": 900,
 "textAnimator": {"kind": "ticker", "from": 1, "to": 7,
  "padTo": 2, "suffix": " / 07"}}
```

要逐单元的运动,把 `stagger.unit` 设为 `character`、`word` 或 `line`,
并给它 `offsetMs`。带文字错峰时,`styleTracks` 可以指向 `glyph.color`、
`glyph.blurPx` 或 `glyph.trackingPx`。颜色用 CSS 颜色值;模糊与字距用
序列像素。整行用 `text.color` 或 `text.fill.stops.0.color`。文字渐变
填充还暴露 `text.fill.angle` 和渐变档位。目标必须指向已存在的样式
字段;设了渐变填充时 `text.color` 被隐藏。

要让标题沿曲线排布,把 `textStyle.path` 设为归一化画布坐标下的 SVG
路径。它把基线放到路径上,不会让每个字符沿路径行进。形状与遮罩路径
可以在 `shape.d` 与 `mask.d` 样式轨之间变形,前提是两条路径的命令与
点数一致。整条片段要沿路径移动时用 `followPath`。

`edit_timeline` 的 `animate_clip` 输入收预设和自定义数值曲线,但不收
`textAnimator` 或 `styleTracks`;这两个字段会从该调用中丢弃。要写它们,
读当前文档,把动画字段放进片段后用 `set_timeline_document` 写回。该
调用校验完整文档并快照前一状态。文档里其余的轨道与片段都要保留。
完整的工具契约归 `motion-graphics` 管。

## 构建与验证

加独立的叠加轨与字幕轨。映射表逐项:先铺压暗层再上文字,套用锁定的
档位样式,再用该档的入场与出场预设做动效。不用硬切进场。错峰只用于
调性匹配的动态字幕。全部文字留在安全边距内,避开人脸与产品时刻。

两条关于叠层的事实决定文字到底能不能被看见。轨道 `index` 最低的画在
最上层,所以压暗层的轨道索引要夹在画面与文字之间——画面、压暗层、
文字,索引递增。而从旁白片段生成的词级字幕会无视那条片段所在的轨道、
合成在所有真实轨道之上,任何标题都盖不住它:T1 的时码要绕开旁白,别
压在它上面。

验证分两遍,它们回答不同的问题。`validate_timeline` 读文档:
`text_illegible`(字号,或与文字自己的 `background` 底板或其后的全画面
形状对比不足 3:1)、`font_not_portable`、`stagger_compressed`、
`animation_exceeds_clip`、重叠、短于一帧的片段。它的对比检查拒绝瞎猜——
半透明压暗层、渐变文字、或一块无法证明在文字后面的底板,都不会产生
任何发现——所以静默通过不算通过。然后用 `preview_timeline_frame` 看每
一项的入场中点、一个驻留时刻和出场:文字压在花哨底板上、压暗层盖住了
本该挨着的脸、字幕拖到片段结束还没走完,都在这里现形。拿着帧再核一遍
映射表:时码、阅读时长下限、压暗层顺序、结尾只有一个 CTA。没被要求
渲染就停在文字层作者这一步。
