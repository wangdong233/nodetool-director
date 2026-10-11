# MG 动效制作 → 时间线智能体

## 新片子的第一次编辑之前

从一份 brief 起一条新片子时,在第一次时间线编辑之前先用 `load_skill` 加载
`motion-direction` 与 `motion-principles`。用它们定下整条片子的运动语言与
计时。不要只凭本文件就开始做动画。

片子若有标题版式或结尾卡,那次编辑之前还要加载 `frame-composition`;若有
结尾卡,再加载 `logo-reveal`。即使目录里只选了本技能一个,这些加载也是
必须的。

showcase、hero、发布或"要最好的"brief,先按 `motion-direction` 的深度规划
与示例时间线来,再写场景。

动效是先搭再查。用代码包或 op(见下)写完,再用 `preview_timeline_frame`
看帧。没有看过的改动不算完成。

## 按活加载其他技艺技能

本文件是搭建循环与入口,不是操作契约。上面那些必装技能装完后,按活儿
再装其他相关技艺技能,然后回到这里选编写面。

| 问题 | 技能 |
|---|---|
| 剪切落在哪里、节奏怎么铺、爆点怎么蓄 | `beat-sync-editing` |
| 用哪些颜色、按什么顺序调色、什么真的能动 | `color-motion` |
| 预设接近但不合适;过冲、衰减、摆动、弧线、描画显现 | `motion-curves` |
| 内容后面的一层氛围床 | `motion-background` |

另有三个是邻居而非分层。`caption-titles` 决定文字说什么、何时出现。
`video-audio-continuity` 在第一支片段渲染之前决定多场景片子的声音来自一条
生成片段还是一条自排轨道——这个决定本文件的 op 撤销不了。板类技能
(`explainer-storyboard`、`commercial-beat-sheet`、`launch-commercial`、
`music-video-treatment`、`trailer-template`)在还没有可动的时间线之前就定
下了镜头;`assemble_storyboard_timeline` 是它们的板变成本文件文档的地方。

为时间线生成的任何东西——一张床、一声 sting、一段配音、一支片段——都有
各自指南的模型条目。`find_model` 在它覆盖的路由上返回 `prompting_skill`;
写那条提示词之前先 `load_skill` 它。

## 搭建循环

四步搭一条片子: **执导**(动笔之前先定死运动语言与场景清单——
`motion-direction`,有标题或结尾卡时加 `frame-composition`/`logo-reveal`)、
**搭建**(用代码写场景,一拍一个 `v.scene`)、**保存**(`v.save()` 附上代码;
读 `saved.code` 与 `saved.warnings`)、**评审**(下面那一轮)。修改靠编辑那份
脚本——见下——再重复后两步。第一次保存就渲染全绿的片子,是还没被看过的
片子。

## 选对编写面

碰时间线文档有两条路。按改了什么来选,不按习惯。

| 情形 | 面 |
|---|---|
| 一条新剪辑,或一个不止几个片段的场景 | `@nodetool-ai/sandbox-timeline`(代码) |
| 对已有剪辑做几处小改——给片段重计时、换一个预设、微调错峰 | `edit_timeline` op |

**代码,给新剪辑。** 在 JS 脚本或 Code 节点里
`import { video } from "@nodetool-ai/sandbox-timeline"`。它的 `video()`
搭起一份由场景组成的文档(`v.scene(name, seconds, fn)`,局部时间以秒计),
用 `v.series([...])` 串场,`v.save(nodetool.timelines, {...})` 一次调用写完
整份文档并返回 `{timeline_id, errors, warnings}`。几百个关键帧片段的一条
剪辑,这样只要 handful 几次 API 调用,而不是每个片段一条 `edit_timeline`
op。NodeTool 出厂的示例时间线(Cadence、Kite、Prism、Voltra、Tidewater、
T minus 30)都是用它搭的。它完整的签名、选项与坑在它自己的技能里——写
场景之前读 `nodetool.packs.docs("@nodetool-ai/sandbox-timeline")`,不是读
本文件。场景内部怎么摆归 `frame-composition`;本文件管搭建循环与下面的
op 面。

**op,给编辑。** `edit_timeline` 收一个时间线 ID 与一个按序执行的 `ops`
数组,每次至多 60 条:

```json
{"timeline_id":"<id>","ops":[{"op":"animate_clip","target":"Title","animations":[{"role":"in","preset":"fade","durationMs":400}]}]}
```

每个 op 的完整形状、各自拒绝什么、什么时候改用整文档
`set_timeline_document` 写入,都归 `timeline-edit-ops`——批量 op 之前装
它,不是装本文件。

## 一条紧凑的双场景片子

搭建循环走到底:一张背景床、一个排好的标题块、一个计数器、一次转场、
一遍收尾、保存,然后读警告。

```js
import { video } from "@nodetool-ai/sandbox-timeline";

const v = video({
  width: 1920, height: 1080, fps: 30,
  palette: { ink: "#06110e", ink2: "#0c2a21", text: "#f4fbf8", accent: "#34d399" },
  fonts: { display: "Space Grotesk", body: "Inter" }
});

const hello = v.scene("Hello", 2.5, (s) => {
  s.backdrop();
  const kicker = s.kicker("LIVE");
  const title = s.text("Round-ups", { size: 120, weight: 700, font: "display" });
  const sub = s.text("on every card", { size: 40, color: "#8fb3a6" });
  s.stack([kicker, title, sub], { gap: 20 }); // frame-composition: a title block
  title.enter({ from: { scale: 1.2, opacity: 0 }, dur: 0.3, ease: "outExpo" });
  sub.enter({ from: { offsetY: 24, opacity: 0 }, at: 0.15, dur: 0.25 });
});

const outro = v.scene("Outro", 1.8, (s) => {
  s.backdrop({ colors: ["#0f3b2e", "#06110e"] });
  const counter = s.text("$0.00", { size: 96, font: "display" });
  counter.count({ from: 0, to: 1.6, dur: 1.2, prefix: "$", decimals: 2 });
  s.finish({ vignette: 0.2, grain: 0.05 });
});

v.series([hello, v.transition("wipe", 0.3, { direction: "left" }), outro]);

const saved = await v.save(nodetool.timelines, { name: "Round-ups", showcase: true });
if (saved.warnings.length) {
  // read them before calling this done — see Review pass below
}
```

## 用代码编写与修改

`v.save(nodetool.timelines, {...})` 会把重建时间线的代码作为它的源附上——
不需要单独一次 `code.set` 调用。存下的代码就是被保留的程序:场景回调与
它们用到的助手,每个调研结果、生成的素材 id、循环值都以字面量写死在
里面。产出这些值的调用在你的动作里只跑过一次,重烤不会重复它们。当场景
回调调用了 `nodetool.*`、用了 `Math.random()`/`Date.now()`,或读到的不是
纯数据时,`saved.code.embedded` 为 false,原因在 `saved.code.warnings` 里。
调研与生成放在顶层做,再用结果搭场景。事后补挂代码用
`nodetool.timelines.code.set(timeline_id, code)` 烤入,那份代码必须不靠
能力调用就能建出时间线。

改一条代码挂档的时间线是: `code.get(id)` → `code.edit(id, edits)` 做几处
小的精确字符串替换(每个 `old` 恰好匹配一次)→ 读它回答的 `conflicts` 与
`warnings` → 看帧。这就是上面搭建循环里"评审→修改→重跑"的那一环,变便宜
了——两行 diff,而不是 500 行重发。没有代码的时间线、或刻意手工微调,
`edit_timeline` op 照用——那份契约以及它对代码挂档场景的代价归
`timeline-edit-ops`。代码挂档的身份对场景名与片段 id 意味着什么,归包自己
的技能(`@nodetool-ai/sandbox-timeline`);完整的 `code.*` 调用契约归
`api-timelines`。

## 评审轮

showcase、hero、发布或"要最好的"片子,宣布完成之前要像导演一样审。一次
没有错误的渲染不是成品——这一轮是活儿的一部分,不是画面看着干净就能跳
过的步骤。为它留出轮次:运行预算与编写共享,所以至少按一整轮评审加一次
修改来预算,不要只预算搭建。

1. **接触印样。** `preview_timeline_frame` 带 `sheet: true`,每个场景各采
   入场、主角驻留、出场三帧。
2. **逐场景清单**,动 op 之前先书面回答:
   - 眼睛最先跟的是哪里,那是预定的主角吗?
   - 背景里有什么在动?动作后面一张静止的床是一条发现,不是通过。
   - 有没有文字被形状碰到或穿过?
   - 画面实际用了多少?自己看——校验器的 `showcase_frame_underfilled`
     检查只是包围盒代理,可能漏掉对着空背景显得稀疏的细描边或圆环。
   - 每个该数的数字真的在数吗?还在屏上时就数完了吗?
   - 这个场景怎么出、下一个怎么进?showcase brief 上一记默认淡入淡出是
     要点名的发现,不是"没有发现"。
3. **对照参考。** 用 `examples.list()` / `examples.get(slug)` 挑最接近的
   场景。用 `preview_timeline_frame` 的 `sheet: true` 给你的片子与那条示例
   各出一张同拍印样,跨时长对齐拍点、采运动中点。对两边都调
   `view_image`,带着这个明确的问题: "与示例相比,图层数量、次级运动、
   质感与光、运镜深度各缺什么?点名拍点与差距。"片段节选讲不明白某一刻
   时,用 `examples.source(slug)` 读示例场景的真实搭法——repeater 的相位
   偏移、两遍文字效果、共享的 id 方案。`compare_timeline_frames` 不能对准
   出厂示例——它的两边必须都是你自己的时间线(id、版本或文档)——所以它
   用在修改之后证明哪些帧真的变了,不用来对参考打分。
4. **按 showcase 档校验。** `validate_timeline(id, {tier: "showcase"})`
   返回 `errors` 与 `warnings`——没有 `issues` 字段。每条 `showcase_*`
   警告都是硬停:解决它,或在渲染前向用户说明具体的艺术豁免。预期会见到
   `showcase_scene_groups_missing`、`showcase_custom_motion_missing`、
   `showcase_finish_missing`、`showcase_camera_missing`、
   `showcase_layer_density_low`、`showcase_scene_group_density_low`、
   `showcase_custom_animation_density_low`、`showcase_effect_variety_low`、
   `showcase_clip_density_low`、`showcase_motion_blur_missing`,外加
   `showcase_frame_underfilled`、`showcase_text_collision`、
   `showcase_motion_range_narrow` 与 `showcase_dead_motion`。每条都会点名
   一条可学的出厂示例。零警告是结构底线,不是工艺判词——警告文本里的
   中位数才是设计目标。
5. **修改,然后重跑这一轮。** 宣布完成之前,至少做一次改变构图本身的
   修改,而不只是修校验器报的错。然后对结果重复 1–4。停在第一次干净渲染
   上,正是这一轮要抓的失败。
