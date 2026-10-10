# 已存时间线上的后期

素材已经存在,而其中某处必须变。这些工具作用于**已保存**时间线序列的
单个片段,不作用于分镜镜头,也不作用于散落的素材。

执导新作品归 `storyboard-core` 及其用例技能。剪切、动画、转场与标题归
`motion-graphics` 系统技能:第一次 `edit_timeline` 调用之前先用
`load_skill {name: "motion-graphics"}` 加载它,它承载完整的操作清单、
预设与预览契约。

## 选对操作

| 问题 | 工具 | 写入什么 |
|---|---|---|
| 换掉主体身后的东西 | `isolate_subject` | 该片段上的一个 `generatedMatte` |
| 让另一个片段跟随运动主体 | `track_object` | 一条文档级轨迹,供他者 `bind_to_track` |
| 画幅宽高比不对 | `expand_frame` | 一条未生效视频候选 |
| 素材太软或太小 | `upscale_video` | 一条未生效视频候选 |
| 这一镜没有声音 | `video_to_audio` | 一条对齐的未生效音频候选 |
| 实录人声不对 | `recorded_voice_replacement` | 一条未生效音频候选 |
| 嘴形对不上新音频 | `lip_sync` | 一条未生效视频候选 |
| 标题或形状该随音乐动 | `bake_audio_animation` | 目标片段上的一条 `custom` 动画 |

上表除 `bake_audio_animation` 外,每个工具的 `provider` 与 `model` 都来自
`find_model`。没有默认:未设置的模型让调用失败,而不是把钱花在没人选
过的模型上。

## 未采纳前一律不生效

`expand_frame`、`upscale_video`、`video_to_audio`、`recorded_voice_replacement`
与 `lip_sync` 都返回一条带溯源的**未生效候选**。它们谁都不改已采纳条、
序列尺寸或既有构图。应用结果是另一个显式步骤:

1. `inspect_video_production_candidates {candidates, preview?}` 刷新候选
   状态,并可选地按显式的"目标→候选"`selection` 构建预览条或草稿。
   检视不写任何东西。
2. `accept_video_production_candidates {action, batch_id, document_id,
   project_id, candidates, selection, targets}` 应用一份原子清单。
   `action` 为 `use_take` 或 `use_draft`。`targets` 里的每一项都带
   `expected_target_revision`,服务器在应用前复核它——在底下动过的文档
   会被拒绝,而不是被覆盖。

报告候选 id 和每条是什么,然后让用户选。`accept` 返回之前,绝不把候选
说成已应用。

## 为槽位生成新条

需要新素材而非修复的槽位,走"已评审生产"路径,它覆盖全部三种文档:
`timeline_clip`、`storyboard_shot` 与 `script_line`。

`prepare_video_production` → `submit_video_production` → 检视 → 采纳。

`prepare` 不改动任何东西。它解析链接的剧本语音,核验所有者、项目、
目标、参考、能力路由与时序,然后在任何服务商花费**之前**冻结一到三个
稳定的候选身份。它要求 `review: {status: "reviewed", plan_fingerprint}`
——已评审计划读过的每个创作输入的指纹。`route` 是
`reference_to_video`、`text_to_video` 或 `audio_driven_performance`,
出镜台词(`speech_mode: "on_camera"`)必须走 `audio_driven_performance`。
`submit` 重跑预检与授权,并找回既有的请求 id 而不是重复提交,所以断线
后的重试不会付两次钱。

## 逐工具备注

**`isolate_subject`** 送出片段的*完整*源素材,并按片段自己的素材时间读回
遮罩——正因如此,后续的修剪、拆分或变速都能保持抠像对齐。已有当前
抠像的片段会免费拿回它,除非 `regenerate: true`;重新生成失败时,工作
中的遮罩原地保留。用免费的 `set_generated_matte` 操作微调结果(反转、
强度、羽化,或退回早前版本)。要从另一条片段编写锁孔遮罩时改用
`set_matte`。

**`track_object`** 需要 `initial_region`(在源帧上归一化 0..1)加
`start_ms` 与 `end_ms`(绝对素材毫秒)。初始框对 `forward` 和 `both` 坐在
`start_ms`,对 `backward` 坐在 `end_ms`。本构建只支持框追踪。服务商未
实现 `track_object` 时,新运行在保存或花钱之前就被拒绝。

**`lip_sync`** 消费一条**已采纳**的 `recorded_voice_replacement` 候选:
`replacement_audio {asset_id, status, provenance}`。先跑人声替换、采纳
它,再对口型。

**`bake_audio_animation`** 测量一条片段的音频——包络跟随器,或
`mode: "beats"` 下每个起音点一记脉冲——然后把一条锚定素材的 `custom`
动画写到另一条片段的属性上,通常是 `scale`。这次写入是叠加的:同通道
上手写的 `pop` 或 `slide` 与它组合,而不是被替换。重新烘焙只替换它上次
产出的那条曲线。

**`source_asset_id`** 在原生媒体工具上是可选的销,调用前捕获。不匹配即
过期,调用被拒。有别的东西可能在编辑该文档时就传它。

## 检查结果

- 每轮编辑后跑 `validate_timeline {timeline_id}`。
- `preview_timeline_frame {timeline_id, ...}` 合成一个或多个时码并返回
  逐层报告。不渲染就能看到遮罩、烘焙结果或已采纳条,便宜。`model3d`
  层需要无头 Chromium:主机上没有时,该层被略去并报为
  `model3d_unavailable` 降级,绝不变成空片段。
- `compare_timeline_frames` 把前后并排。
- `render_timeline` 是付费的最终一遍。不要为检查编辑而渲染。
- 破坏性操作前用 `create_timeline_version` 拍快照。
  `restore_timeline_version` 会先快照恢复前的状态,并按今天的 schema
  重新校验,所以旧文档可能过不了它当年能过的检查。

## 从 shell 验证

这些是 `nodetool` CLI。在 NodeTool checkout 里,同样的命令以
`npm run dev:nodetool -- <command>` 运行。

```bash
nodetool timeline validate <timeline_id|sequence.json> --json
nodetool timeline debug <id> --interact '[{"tool":"add_track","input":{"type":"audio","name":"Music"}}]'
nodetool timeline versions list <timeline_id> --save-type manual
```

渲染、播放、解码与生成不由 harness 模拟。报告在 `notSimulated` 下写明。

## 参考

- `storyboard-core` 系统技能,其工具契约的时间线一节——板到时间线的
  调用用 `load_skill` 加载它。

在 NodeTool checkout 里,这些仓库源码走得更深:

- `docs/harnesses.md` § nodetool timeline validate / debug
- `docs/harnesses.md` § Generated mattes
- `docs/harnesses.md` § Audio-driven timeline motion
