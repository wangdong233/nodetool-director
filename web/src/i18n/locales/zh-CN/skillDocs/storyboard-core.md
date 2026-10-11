每个 NodeTool 视频任务共用的那一半。用例技能负责风格、镜头范式与简报;本技能负责它们全部假定的那套机器。

视频直接在**分镜**上执导,再到**时间线**收尾。用户点名要节点图、或需要可
复用的模板时才用图,见 `video-workflow`。

在某个工具族里发起第一次调用之前,先读下面**工具契约**的对应部分。示例与
线上工具 schema 不一致时,以 schema 为准。其余章节等任务走到再读。

## 选对用例技能

| 任务 | 技能 |
|---|---|
| 有人出镜的手机拍摄:UGC 广告、证言、喜剧、一日记录、vlog | `/ugc-video` |
| 产品片:产品照、主视觉、品牌短片,有无艺人皆可 | `/product-commercial` |
| 真实截图与产品照做的静音动效广告,不用生成素材 | `/motion-ad` |
| 复刻拿到手的既有广告或片段 | `/video-clone` |
| 旁白驱动画面:解说片、无人出镜视频、旁白作品 | `/script-video` |
| 带对白、配乐与片名的叙事:短片、预告片、单场戏 | `/short-film` |
| 一次发布战役而非一条视频:实体表、静帧套图、多条成片 | `/launch-kit` |
| 换新输入重跑的模板 | `/video-workflow` |
| 素材已存在、需要修复:抠像、超分、扩图、对口型、生成声音 | `/nodetool-video-post` |
| 一个有人会去点的界面,罩在作品背后的工作流上 | `/nodetool-app-builder` |

都对不上时,直接跑下面的循环。

那组技能讲画面长什么样。另一组讲节拍落在哪里,两组可叠用:用例技能管
观感,结构技能管骨架。

| 结构问题 | 技能 |
|---|---|
| 广告节拍:钩子、递进、时码、旁白纪律 | `/commercial-beat-sheet` |
| 进一个产品页 URL,出一条成片和它的成本 | `/launch-commercial` |
| 30–120 秒讲解,每个节拍一个论点 | `/explainer-storyboard` |
| 一份按曲目段落编排的创意阐述 | `/music-video-treatment` |
| 八个声音优先的节拍,drop 落在约 65%,一张片名卡 | `/trailer-template` |

它们各自携带自己的简报与节拍预算。`/commercial-beat-sheet` 承载另外四篇
引用的板契约;它与本技能都描述某个调用时,本技能是更全的版本。

## 两个工具族,同一块板

| | 无头 | 浏览器 |
|---|---|---|
| 工具名 | `create_storyboard`, `get_storyboard`, `edit_storyboard`, `render_storyboard_stills`, `render_storyboard_clips`, `revise_storyboard_clip`, `assemble_storyboard_timeline` | `ui_storyboard_` + `get_state`, `set_screenplay`, `add_shot`, `update_shot`, `generate_keyframe`, `generate_clip`, `revise_shot`, `assemble_timeline`, `select_shot` |
| 前提 | 什么都不用开 | 板作为标签页打开,列在 `ui_context` 系统块里 |
| 镜头目标 | id、从 0 起的序号,或 **slug** | id、从 0 起的序号,或 `"selected"`——**不认 slug** |
| 权限门禁 | 有 | 无(客户端工具绕过它) |

两个族里的每个工具都要显式的 `storyboard_id`。没有"作用于当前打开的那
个"这种回退。

优先无头。用户正看着板一点点填上时、或需要为 `title`、`logline`、
`style_bible` 调 `set_screenplay` 时才动 `ui_storyboard_*`。无头侧的
`edit_storyboard` → `set_board` 会写入剧本级的 `narration` 与 `music_prompt`,
同时保留剧本上的其他字段。用
`ui_open_document {type: "storyboard", id}` 在两族之间搭桥。

## 循环

1. **找到板。** `list_storyboards`,或读 `ui_context`。还没有板 →
   `create_storyboard {name, brief, style, aspect_ratio}`。
2. **给实体选角。** 先 `list_entities`。新实体需要一张图像素材——
   `generate_image` 或用户的上传——然后
   `create_entity {asset_id, kind, name, descriptor}`。**没有从文本建实体这回事。**
3. **把阵容挂上板:** `edit_storyboard` → `{op: "set_board", entity_ids: [...]}`,
   板开着时也可 `ui_storyboard_set_entities {storyboard_id, entity_ids}`。
   不在板上的实体不生效,镜头文本写什么都没用。
4. **锁定模型。** 先 `find_model` 按 `capability` 查 `text_to_image`,再查
   `image_to_video` 或 `text_to_video`;两个都经
   `{op: "set_board", image_model, video_model}` 写入。没有默认值——未设置的
   模型只会让渲染失败,而不是把钱花在没人选过的模型上。
5. **执导。** 每镜一条 `{op: "add_shot", ...}`。报告镜头数与所选模型。只在
   请求授权的阶段内继续。仅要一块板的请求到这里为止。用户要求的检查点
   一一遵守。
6. **静帧。** `render_storyboard_stills {storyboard_id}`——省略 `targets` 即
   选中所有还缺静帧的镜头。每次调用上限 24 镜。
7. **选条,仅在用户要求时。** 每次渲染都会把旧静帧留在 `keyframe_versions`
   里。换选另一张要靠板上的选条区,没有工具能做。用户保留了选条权就停在
   那里;否则带着当前条继续。绝不在没有支撑动作的情况下声称已换条。
8. **片段。** 在请求的生成范围与预算内跑
   `render_storyboard_clips {storyboard_id}`。先前的授权直接复用,不再问一遍。
9. **修单镜:** `revise_storyboard_clip {target, instruction}`。需要有已有
   片段;它是视频到视频,不碰其他镜头。
10. **出剪。** `assemble_storyboard_timeline`,然后 `validate_timeline`。重跑
    会原地重建同一条序列,并保留板不拥有的轨道。
11. **收尾**用 `edit_timeline` 各操作(见下面**工具契约**的时间线一节)。
    完整操作清单、预设与预览契约,用 `load_skill` 加载 `motion-graphics`
    系统技能。交付片段上的修复归 `nodetool-video-post`。

**纯静帧模式。** 用户要一块板和一批帧、但不要运动——规格广告、提案片、
观感测试——跑到第 7 步为止。日后补运动只需 `update_shot` 单独改
`motion`:动作、服装、布景与阵容原封不动,已认可的静帧仍然描述最终成片。

## 真正到达模型的是什么

提示词由具名字段拼装,不是整镜直接进:

- **静帧:** `action`,然后是 `"<camera.framing> shot"`,然后是板的 `style`。
  `camera.lens`、`camera.angle` 与 `camera.movement` **到不了它那里**。
- **片段(keyframe 模式):** `motion`,然后 `action`。风格到不了它那里——
  选中的静帧已携带观感。
- **片段(direct 模式):** `action`、`"<framing> shot"`、`motion`、`style`。

所以焦段、角度或运镜只有写进 `action` 或 `motion` 才会真正生效。结构化的
`camera` 对象照留——那是用户在镜头卡上读的东西。

**实体按明文名字生效。** 带 `entity_ids` 的镜头只用列出的那些。否则:风格
与场地实体作用于每一镜;角色或道具只在其**名字出现**于该镜的 `action`、
`motion`、`dialogue`、`narration` 或 `slug` 时生效。写
`Nova reaches for the bottle`,不写 `@Nova reaches...`。`@` 是聊天输入框的
交互件,它往*你的消息*里塞 `entity://<id>` 令牌;它永远不会变成镜头文本。

## 锁定项

- 每个实体只留一条 `descriptor`,让它干全部的活。不要在镜头文本里重新
  描述一张脸。
- 状态变化(湿发、脏衬衫、第二套服装)是**第二个实体**,不是一条提示词
  里的指令。
- 产品几何、标签与颜色来自产品实体的描述语与参考图。绝不凭空造 logo。
- 建镜时就给每镜一个稳定的 `slug`(`1a`、`2a`,…)。无头侧的目标认它,
  "修 3a"从此指的就是那一镜。
- 渲染模式按镜设置。`keyframe`(默认)迭代更便宜,观感也稳。`direct`
  跳过静帧——大运动量值得用它,因为首帧条件化会让结果发僵;原生音频的
  视频模型也值得,它们最弱的正是图像路径。
- 原生音频模型逐片段写声音,所以一镜一片的板在每个接缝处都切断音频。
  渲染之前先用 `load_skill` 加载 `video-audio-continuity` 系统技能:要么
  整条片子是一镜承载全部剪切,要么连贯性来自一条旁白轨或音乐轨、镜头
  音频静音。没要求声音时,静音剪辑同样成立。再生成会超出授权范围时,
  复用既有音频或保持静剪。

## 模型做不到成片所求的地方

四条限制:不是 bug,也没有工具能修。每条都有可行的工作形状。

**视频模型返回固定时长。** 它不理 `duration_seconds`——镜头按 1.5 秒还是
5 秒执导,同一个模型都给 5.184 秒。快剪时,把一段短节拍(*run*)交给一次
生成,提示词里用方括号时码标注,再用 `covered_by` 记录切分。**工具契约**
的"镜头合并"一节(见下)有这个调用。

**审核读的是字面,不是故事。** 点名建制暴力的提示词——警察抓人、突击
搜查、束缚——会触发安全过滤器,而拍出同样威胁的镜头不会。换用不触发
审核的措辞、保住利害关系:"two uniformed city officials approaching with a
clipboard and caution tape"(两名制服市政人员拿着写字板和警戒带走近)能
过,"two aggressive police officers grabbing her arms"(两名粗暴的警察抓住
她的手臂)不能。重写一次;不要重试被拒的提示词。

**音乐模型留不出空白。** 要它在 00:19.5 留 1.5 秒静音,解码器会用混响
尾巴和环境声把空白填上——提示词里没有包络门。改在时间线上剪出这段
静默:配乐分两段生成,作为两个片段铺下、中间留缝,第一段淡出(约
300ms)、第二段淡入(约 100ms),接缝处才不会有咔哒声。

**台词塞不进 1.5 秒的镜头。** 一句有表现力的台词要跑 4 秒,压进画面节拍
会让它一听就是处理过的。让台词跨过剪切:旁白片段留在自己的轨道上,要么
从上一镜下面就开始(J 切),要么越过剪切延伸进下一镜(L 切)。画面卡在
拍点上切;台词说到哪算哪。剧本链接的板上是自动的——每镜的时长就是它
覆盖的那些台词的时长——所以在未链接的板上、或画面必须留在拍点上的
场合才用这招。

## 门禁与花费

权限模式决定什么不经询问就能跑。`read` 工具永远直接跑。

| 模式 | write / execute / external |
|---|---|
| `auto` | 直接跑 |
| `default` | 询问用户 |
| `plan` | **阻断** |

`plan` 连 `create_storyboard` 和 `edit_storyboard` 也拦,所以在该模式下板
写不进去。尊重当前权限模式与工具审批结果。仅要板的请求,写完板、省掉
渲染调用。不要切换模式、也不要借浏览器工具绕开被拒的无头动作。工具
可调,不等于授权超出用户请求的花费。

**你算不出渲染的价格。** 没有工具做估算,`Shot.cost_estimate` 也不填值。
报告镜头数与模型,不要编美元数。用户给的预算若无法在花钱前核对,先解决
这个约束。事后用 `get_cost_summary` 报实际花费。缺授权时,把板备好,并
说清需要批准的具体渲染动作。

## 记忆

`memory_save` 跨一切会话持久——风格圣经、阵容与调色都存它,实体与板的
id 放进 `resources`。`share_result` / `read_shared` 是**运行级且即弃**;它们
用于在同一轮里传值,不是用来跨会话锁观感的。

## 这个循环已能处理的后续指令

```
Fix 3a only. Leave the rest.
Drop the contre-jour across the whole board — soft even daylight. Update the
  board style, do not rewrite the shots.
New still on 2a. Keep the old take.
revise_storyboard_clip 5a: darker, add rain, same blocking.
Add a reaction shot after 3a and re-slug from there. Do not re-render 1a-3a.
Collapse 8, 9 and 10 into one 8s shot, keeping the lean-in as the last second.
The face drifted on 4a. I picked take 2 in the gallery — regenerate the clip.
The label is unreadable on 2a. New macro still, then a clip from it.
Cut it. Assemble, validate, narration on its own track, mute Shot Audio on 1-6.
```

## 下文内容

- **工具契约**——每个工具、它的参数,以及它拒绝的字段。
- **常设指令**——一份可选简报,给明确要求各阶段之间审批的用户。其中
  的示例检查点不给别的请求加要求。

## 工具契约

参数逐一精确。这里点名的每个字段都在实现里被校验;不认识的字段会
**报错拒绝**,不是悄悄丢弃。

### 分镜——无头

编辑器不开也能干活。镜头 `target` = 镜头 id、以字符串传的 0 起序号,或
slug。

| 工具 | 参数 |
|---|---|
| `list_storyboards` | `limit?` → id、name、shots、with_keyframe、with_clip、timeline_id、updated_at |
| `create_storyboard` | `name`(必填)、`brief?`、`style?`、`aspect_ratio?`(默认 `16:9`)、`project_id?`、`id?` |
| `get_storyboard` | `storyboard_id` → brief、style、宽高比、旁白、music_prompt、image_model、video_model、剧本链接,以及每镜的 id/index/slug/action/camera/motion/duration/status/has_keyframe/has_clip/covered_by |
| `edit_storyboard` | `storyboard_id`、`ops[]`——见下 |
| `render_storyboard_stills` | `storyboard_id`、`targets?`、`provider?`、`model?`、`style?`、`concurrency?` |
| `render_storyboard_clips` | `storyboard_id`、`targets?`、`provider?`、`model?`、`resolution?`、`mode?`(`keyframe`\|`direct`)、`concurrency?` |
| `revise_storyboard_clip` | `storyboard_id`、`target`、`instruction`、`provider?`、`model?` |
| `assemble_storyboard_timeline` | `storyboard_id`、`name?`、`fps?`(默认 30) |
| `extract_script_from_storyboard` | `storyboard_id`、`name?`、`relink?` |
| `delete_storyboard` | `storyboard_id` |
| `get_storyboard_one_take` | `storyboard_id` → `prompt`(创作者写的)、`compiled`(来自板上的 REFS、STEPS、AUDIO)、`full_prompt`、带 `[Image N]` 的参考图(镜头静帧,按镜头顺序)、镜头窗口、时长、`settings`(存下来的 `duration_seconds`、`aspect_ratio`、`resolution`、`model`)、`effective`(经板级回退后的生效值)、警告 |
| `update_storyboard_one_take` | `storyboard_id`、`prompt?`、`duration_seconds?`、`aspect_ratio?`、`resolution?`、`model?` `{provider, id, name?}`(传 null 清除)、`shots?` `[{shot_id, end_state?, sound?}]`、`expected_revision?` |

渲染上限:**每次调用 24 镜**,`concurrency` 默认 3、最大 8。

省略 `targets` 会选中所有还缺这一步的镜头。静帧是指所有没有关键帧、又没
设为直出的镜头;片段是指所有还没有画面的镜头——自己的或被合并覆盖的
都算(见"镜头合并"一节)。keyframe 模式的镜头若到 `render_storyboard_clips`
时还没有静帧,只会在结果里报告、不会渲染——先渲它的静帧,或把它的
`render_mode` 设为 `direct`。每次渲染都会追加进 `keyframe_versions` /
`clip_versions`,并把新条设为选中。

#### `edit_storyboard` 操作

`{"op": "add_shot", ...}` · `update_shot {target, ...}` · `remove_shot {target}` ·
`reorder_shot {target, index}` · `set_board {...}`

镜头字段(新增与更新通用):`action`、`slug`、`camera`、`motion`、`graphics`、`dialogue`、
`narration`、`notes`、`duration_seconds`、`duration_source`(`audio`\|`manual`)、
`render_mode`(`keyframe`\|`direct`\|`reference`)、`entity_ids`、`location_id`、`covered_by`、
`index`。`graphics` 是语义化的设计意图(`mode`、`direction`,以及 `elements` 里
确切的文字/素材),不是 Timeline 关键帧;`update_shot` 传 `null` 即清除。

`camera` 即 `{framing?, lens?, angle?, movement?}`。

`covered_by` 即 `{shot_id, start_seconds?, end_seconds?}`——本镜的画面是
另一镜片段上的一扇窗。见下面"镜头合并"一节。`null` 撤销。

板字段(仅 `set_board`):`brief`、`style`、`aspect_ratio`、`entity_ids`、
`image_model`、`video_model`、`narration`、`music_prompt`。两个模型字段收
`find_model` 返回的模型**对象**,或 null。`narration` 与 `music_prompt` 收
字符串并写入剧本。空字符串清除该方向。

**编辑操作设不了 `keyframe`、`clip` 或 `status`。** 它们归渲染工具;传了会
报错并点名正确的工具。唯一的例外是 `covered_by`:覆盖是一张未经渲染就
到位的画面,所以设置它会把镜头标为 `rendered`,清除它则把镜头放回
`keyframe_ready`/`planned`。

**编辑操作在板级设不了 `title`、`logline` 或 `style_bible`。** 这些字段
用 `ui_storyboard_set_screenplay`。单*镜*的 `narration` 仍是镜头字段。板级
旁白与音乐是剧本上的独立字段:`assemble_storyboard_timeline` 在未关联的
板上把它们变成草稿音频片段。

#### 镜头合并

视频模型返回固定窗口——5.184 秒、6 秒、8 秒——无论镜头执导的目标时长
是多少。节拍在 1.5-2.5 秒之间的剪辑,一次生成罩住一段镜头、之后再切分,
比一镜一生成便宜:十五个 1.5-2.5 秒的节拍逐条买,等于为一条 30 秒的
片子买约 77 秒素材。

把整段写成一个带方括号时码的提示词(`[00:00 to 00:02.5] Event …
[00:02.5 to 00:05.2] Reception`),在这段的第一镜上渲染,再告诉板每个
后续镜头用哪一片:

```json
{"op": "update_shot", "target": "06",
 "covered_by": {"shot_id": "05", "start_seconds": 2.5, "end_seconds": 5.184}}
```

被覆盖的镜头此后读作 `has_clip: true`、`status: "rendered"`,被
`render_storyboard_clips` 跳过(所以绝不重复生成),而
`assemble_storyboard_timeline` 会把它作为覆盖片段的那个时间窗铺进序列、
而不是跳过它,覆盖镜头则在第一个被覆盖镜头接手处收尾。不写
`end_seconds` 时,被覆盖镜头一路跑到覆盖片段末尾。

只允许一跳:`shot_id` 必须指向真正拥有片段的镜头,不能指向另一个被覆盖
镜头。删除覆盖镜头会清掉覆盖关系,并报告它解出了哪些镜头。

### 分镜——浏览器(`ui_storyboard_*`)

板必须作为工作区标签页打开;它的 id 来自 `ui_context` 系统块。没打开 →
`edit_storyboard` 照样编辑已保存的板;用 `ui_open_document {type: "storyboard", id}`
把它展示给用户。Target = 镜头 id、
字符串形式的序号,或 `"selected"`。**这里不解析 slug。**

| 工具 | 参数 |
|---|---|
| `ui_storyboard_get_state` | `storyboard_id` |
| `ui_storyboard_set_screenplay` | `storyboard_id`、`screenplay` |
| `ui_storyboard_set_entities` | `storyboard_id`、`entity_ids`(整体替换阵容;`[]` 清空) |
| `ui_storyboard_add_shot` | `storyboard_id`、`action`、`camera?`、`motion?`、`durationSeconds?`、`index?` |
| `ui_storyboard_update_shot` | `storyboard_id`、`target`、`action?`、`camera?`、`motion?`、`status?` |
| `ui_storyboard_generate_keyframe` | `storyboard_id`、`target` |
| `ui_storyboard_generate_clip` | `storyboard_id`、`target` |
| `ui_storyboard_revise_shot` | `storyboard_id`、`target`、`instruction` |
| `ui_storyboard_assemble_timeline` | `storyboard_id` |
| `ui_storyboard_select_shot` | `storyboard_id`、`target`(可空) |
| `ui_storyboard_extract_script` / `_relink_script` / `_reproject_shots` | `storyboard_id`(+ `targets?`) |
| `ui_storyboard_set_duration_source` | `storyboard_id`、`targets`、`source` |

`ui_storyboard_add_shot` 与 `update_shot` **不收** `slug`、`dialogue`、
`narration`、`entity_ids` 或 `render_mode`。浏览器侧这些只能经
`set_screenplay` 到位;无头侧经 `edit_storyboard`。

生成是异步的:`generate_keyframe` / `generate_clip` 启动任务并返回镜头。
轮询 `ui_storyboard_get_state` 看 `status`。

状态流:`planned` → `keyframe_generating` → `keyframe_ready` →
`clip_generating` → `rendered`,或 `failed`。(`approved` 是遗留值,读作
"静帧就绪";没有任何东西会设置它。不要拿它当门禁。)

#### `set_screenplay` 的 `screenplay`

```json
{
  "type": "screenplay",
  "title": "…",
  "logline": "…",
  "brief": "…",
  "styleBible": "…",
  "aspectRatio": "9:16",
  "narration": "…",
  "musicPrompt": "…",
  "entityIds": ["<asset id>"],
  "shots": [
    {
      "slug": "1a",
      "action": "Nova touches untreated hair, front-camera close",
      "camera": { "framing": "close-up", "lens": "26mm", "angle": "eye", "movement": "handheld" },
      "motion": "she lifts one section of hair and lets it fall, once",
      "dialogue": "I wanted lighter hair…",
      "durationSeconds": 4,
      "entityIds": ["<asset id>"]
    }
  ]
}
```

id、序号与状态会自动补齐。`style` 可作为 `styleBible` 的别名。每镜只有
`action` 必填。

顶层的 `entityIds` 把这些实体选角到**板**上——正是这份阵容让每镜的静帧
与片段提示词生效。要换角而不换镜头,用 `ui_storyboard_set_entities`;
`ui_storyboard_get_state` 把当前阵容报成 `entityIds`。镜头自己的
`entityIds` 会为该镜覆盖板级选角(`[]` 表示"此镜不带实体");没有的话,
风格与场地作用于每一镜,角色与道具作用于文本点到名字的镜头。

### 实体

| 工具 | 参数 |
|---|---|
| `list_entities` | `kind?`(`character`\|`location`\|`style`\|`prop`)、`query?`、`limit?` |
| `get_entity` | `entity_id` |
| `create_entity` | `asset_id`、`kind`、`name`、`descriptor`(全部必填)、`description?`、`voice_id?`、`tags?`、`lora?`、`palette?` |
| `update_entity` | `entity_id` + 任意字段,含 `asset_id`(换到一张新照片) |
| `delete_entity` | `entity_id`——清掉标记,保留图像 |
| `apply_entities` | `text`、`entity_ids?` → 生效后的提示词 + 参考素材 id |

实体**就是**一张带着标记的图像素材。它的 id 就是素材 id。凭空造一个:
`find_model`(`text_to_image`)→ `generate_image` → 拿返回的素材 id 去
`create_entity`。用用户附来的照片造一个:先用 `asset_search` /
`list_assets` 找到它,再 `create_entity`。

`apply_entities` 用于给你自己即将发出的提示词做实体生效(`generate_image`、
`generate_video`)。分镜渲染工具在内部自己完成这一步——不要拿它预先处理
镜头文本。

### 时间线

`assemble_storyboard_timeline` 把渲染好的片段首尾相接铺开,给每个片段盖上
板 id 与镜头 id,并为每镜片段在**"Shot Audio" 轨上配一个孪生音频片段**
(各界面都会静音视频元素、只混音频片段)。板级旁白与音乐变成各自轨道上
的草稿片段。

**每镜时长以其渲染结果为准**,不是以 `duration_seconds` 为准——按 1.5 秒
执导、回来却是 5.184 秒的镜头,在成片里占 5.184 秒。回来时长偏离执导值的
镜头会列在 `retimed_shots` 里并给出警告,片子比计划长不用播就能看出来。
`duration_seconds` 只决定素材测不出时长的镜头。链接了剧本的板是例外:
那里由台词决定,`trimmed_shots` 点名素材填不满台词所给槽位的镜头。

`edit_timeline {timeline_id, ops[]}` 的操作:`get_state`、`add_track`、
`add_media_clip`、`add_text_clip`、`add_shape_clip`、`split_clip`、`trim_clip`、
`move_clip`、`duplicate_clip`、`delete_clip`、`set_clip_params`、
`set_clip_binding`、`animate_clip`、`clear_animations`、
`list_animation_presets`、`select_clip`、`seek`。先 `get_state` 拿 id。

要把镜头自带声音压到旁白之下:对 Shot Audio 片段 `set_clip_params` 设
`muted: true`,或 `volumeDb: -18`。`set_clip_params` 还收 `name`、`opacity`、
`speedMultiplier`、`fadeInMs`、`fadeOutMs`、`blendMode`、`borderRadius`、
`hidden`、`locked`、`textStyle`、`shapeStyle`。

每个字段都直接放在操作上。`params` / `props` 包装会被解开,但扁平形式才是
契约:

```json
{"op": "set_clip_params", "target": "clip_1",
 "textStyle": {"fontFamily": "Space Grotesk", "fontWeight": 800}}
```

`textStyle` 会**合并**覆盖到片段自己的样式上,所以只发改动的部分——把
整个对象再发一遍,就是没打算碰的字段被覆盖的成因。`fontWeight` 是数字,
CSS 关键字(`bold`、`semibold`、`extrabold`)也接受,并按数字存储。

**要么用内置字体族,要么干脆不设。** `sans-serif`、`serif`、`system-ui` 等
CSS 通用族在片段编写处会被拒绝:它们不指名任何字体,编辑器预览、渲染与
`preview_timeline_frame` 会各挑各的。NodeTool 内置 Inter(默认)、Space
Grotesk、Bebas Neue、Playfair Display、Lora 与 JetBrains Mono。指名的系统
字体仍允许,`validate_timeline` 会把它报成 `font_not_portable`。

每一轮编辑后跑 `validate_timeline {timeline_id | document, fps?}`。它抓
重叠、比片段还长的淡入淡出、未知预设与不完整的绑定。

其他时间线工具:`list_timelines`、`create_timeline`、`get_timeline`、
`delete_timeline`,以及版本族(`list_`/`get_`/`create_`/`restore_`/
`delete_timeline_version`)。浏览器孪生是 `ui_timeline_*`。

### 剧本

台词驱动剪辑时用剧本。`extract_script_from_storyboard` 把一块板的对白与
旁白投影成剧本并把两者链接:每镜保留它覆盖的台词行 id,从此文字归剧本
管。`derive_storyboard_from_script` 反着来,一行台词一镜,还可选地在
脚手架上过一遍导演 Pass。

`voice_script_lines` 用各角色自己的声音合成每一行;`assemble_script_timeline`
把各条首尾相接铺好。

**先给阵容配好声音,再不带覆盖地配音。** 声音是三元组
`{provider, model, voice}`,其中 `voice` 是声音自己的名字(`Aoede`、
`Charon`、`alloy`)——只有服务商和模型选不出声音,所以
`voice_script_lines {provider, model}` 会被拒绝。每个说话人设一次:

```json
{"op": "set_speaker_voice", "target": "MOM",
 "provider": "gemini", "model": "tts-hd", "voice": "Aoede"}
```

这三个键直接放在操作上;`voice: {provider, model, voice_id}` 对象——
`get_script` 报告声音用的形态——也会被摊平到操作上。然后不带任何覆盖
调用 `voice_script_lines {script_id}`,每个说话人各自解析。链接了剧本的
板上,`assemble_storyboard_timeline` 会把台词与画面剪在一起:每镜时长
就是它覆盖的那些条,每行配好音的台词都有自己的旁白片段。

其余:`list_scripts`、`get_script`(行状态:`draft`、`stale`、`voiced`、
`no_voice`)、`create_script`、`edit_script`、`delete_script`。浏览器孪生是
`ui_script_*`。

#### 写台词

`create_script` 建一个空剧本。`edit_script {script_id, ops[]}` 的操作:
`set_setup`(简报、体裁、长度、节奏、语言、阶段)、`add_speaker`、
`set_speaker`、`set_speaker_voice`、`add_section`、`add_line`、
`set_line_text`、`set_line_speaker`、`remove_line`、`remove_speaker`。先
`get_script` 拿台词行与说话人的 id。

`write_script {script_id, rewrite?, imported_text?}` 按设定起草台词,并把
它产出的阵容与台词行存下、替换原有内容。先用 `set_setup` 写简报。
`rewrite: true` 会保留它保留的那些行的 id,它们的条与分镜链接因此存活。
经 `imported_text` 传入的文字只会被切成台词行并归属说话人,绝不改写。
它不记录条:结果用 `voice_script_lines` 配音。

重写一行后,它已有的条原地保留并标记为 **stale**,随后一次
`voice_script_lines` 恰好重录这些、不多录一行。

### 模型

`find_model {capability, query?, task?, provider_hint?, model_hint?,
prefer_local?, limit?}` 是指名模型的唯一方式。**`capability` 必填**,取值为
`text_to_image`、`image_to_image`、`text_to_video`、`image_to_video`、
`text_to_speech`、`text_to_music`、`automatic_speech_recognition`、
`generate_embedding`、`generate_message` 之一。`query` 是搜索框
(`"flux schnell"`);`task` 是与模型所支持任务比对的提示,不是搜索。

NodeTool 在 `nodetool` 服务商下内置了一批精选 id,用户无偏好时它们是
稳妥的默认:

| Id | 用途 |
|---|---|
| `nodetool/flux-schnell` | 最便宜的静帧,只吃文字提示词 |
| `nodetool/nano-banana` | 更锐的静帧,吃参考图 |
| `nodetool/seedream` | 细节最多,最慢 |
| `nodetool/hailuo-fast` | 最便宜的片段,用来粗排一条剪辑 |
| `nodetool/kling-turbo` | 运动更稳,中档价 |
| `nodetool/kling-standard` | 运动最忠实 |
| `nodetool/kokoro` | 八个 TTS 声音 |

### 板外的媒体

`generate_image {provider, model, prompt, negative_prompt?, width?, height?,
quality?, output_file?}`,外加 `edit_image`、`generate_video`、
`animate_image`、`generate_speech`、`generate_music` 与 `transcribe_audio`——
每个都收一个 `find_model` 的服务商+模型,并存成 `asset://` 结果。`model`
也接受整条 `find_model` 命中或其 `.ref`,此时 `provider` 可省。

`understand_video {provider, model, video, prompt?, max_tokens?}` 用多模态
模型读整段视频(Gemini 原生读视频);拿它拆解参考片。`video` 收素材 id、
`asset://` URI、URL 或 data URI。`view_image` 把像素放进你自己的上下文;
`read_media_bytes` 返回字节。

### Director 节点

`nodetool.creative.Director` 是**工作流节点**,不是聊天面。它把简报变成
`Screenplay`(属性:`model`、`brief`、`style`、`shot_count`;输出
`screenplay`、`narration`、`music_prompt`、`title`)。只在可复用的图里才
用它。聊天里,用 `edit_storyboard` 自己写镜头——产物相同,却不用搭图也
不用校验。

## 常设指令

这份可选模板只在用户想要分阶段评审——板、静帧、片段、成片之间各有一次
批准——时使用。其中的检查点表达的是那位用户选定的工作流,不适用于其他
请求,也不推翻已经给出的完成授权。

尊重会话当前的权限模式。Plan 模式拦截写入。不要切换模式、也不要换一个
工具族绕开拒绝。用户可以调整简报来授权想要的阶段,并设定预算。

```
You are directing on the storyboard surface, then finishing in the timeline.
Do not build a node graph unless I ask for a reusable template.

SURFACES
Headless: create_storyboard, get_storyboard, edit_storyboard,
render_storyboard_stills, render_storyboard_clips, revise_storyboard_clip,
assemble_storyboard_timeline, extract_script_from_storyboard.
Browser (only for a board open as a tab): ui_storyboard_get_state,
ui_storyboard_set_screenplay, ui_storyboard_generate_keyframe,
ui_storyboard_generate_clip, ui_storyboard_revise_shot,
ui_storyboard_assemble_timeline. Use ui_open_document to open a board.

LOOP
1. list_storyboards, or read ui_context. No board -> create_storyboard.
2. Cast before anything renders. list_entities first. A new entity needs an
   image asset: generate_image (or my attachment), then create_entity with
   {asset_id, kind, name, descriptor}. There is no create-from-text.
   Each entity: one name, one kind, one canonical descriptor sentence.
3. edit_storyboard set_board {entity_ids, image_model, video_model,
   brief, style, aspect_ratio, narration, music_prompt}. Models come from find_model — there is no
   default and an unset model fails the render.
4. Direct with edit_storyboard add_shot, one op per shot. Give every shot a
   slug (1a, 2a, ...). Fields: action, slug, camera {framing, lens, angle,
   movement}, motion, dialogue, narration, duration_seconds, render_mode.
5. STOP after the board. Report shot count and the two model ids. Do not
   estimate dollars — no tool prices a render. Wait for "stills".
6. render_storyboard_stills. I pick takes in the board's takes gallery; you
   cannot select a take and must not claim you did. Wait for "clips".
7. render_storyboard_clips. revise_storyboard_clip touches one shot only.
8. On "cut": assemble_storyboard_timeline, then validate_timeline.

WRITING THE SHOTS
Only these reach the image model: action, camera.framing, and the board style.
Only these reach the video model: motion and action (plus framing and style on
a direct-mode shot). So put lens, angle and camera move into the action or
motion text as well as into the camera object.
Name entities in plain text — "Nova reaches for the bottle", never "@Nova".
Entities season a shot when their name appears in its action, motion, dialogue,
narration or slug; styles and locations season every shot. A shot's entity_ids,
if set, overrides that entirely.

LOCKS
- The descriptor is the face. Do not re-describe an entity in shot text.
- Product geometry, label, cap and colour come from the product entity. No new
  logos.
- A state change (wet, stained, new outfit) is a second entity, not a morph
  instruction inside one prompt.
- Slugs stay stable. "Fix 3a" edits 3a and renders 3a.
- UGC: handheld phone, grain, natural audio, no score, no beauty filter.
  Hero: locked grade in the style, smooth camera, score allowed.
- render_mode "keyframe" (default) for anything where the look must hold;
  "direct" for heavy motion or a native-audio video model.

MEMORY
memory_save the style, the cast and the grade, with the entity and board ids in
`resources` — that survives into later threads. share_result/read_shared are
run-scoped and get discarded; do not use them to lock a look.

If the shot count looks expensive, propose a collapse before rendering clips.
```
