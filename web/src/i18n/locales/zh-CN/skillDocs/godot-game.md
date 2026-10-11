## 这类任务自成一派的地方

一款游戏就是一个每个槽位都被填满、钩子脚本都写完的 Godot 模板。模板就是契约:
`list_game_templates` 返回它需要的槽位(带命名动画与帧数的精灵图集、瓦片集、无缝背景、
音效、一段循环音乐)以及导出后由智能体编辑的脚本。每个槽位过完自己的检查、无头 Godot
把冒烟场景跑绿之前,什么都不算完成。

两样东西在整个运行中不许漂移: **风格**(一个风格实体、一个图像模型、像素尺寸锁定)与
**阵容**(每个角色一个实体)。用与瓦片集不同的模型生成的精灵图集,看起来就是两款游戏。

## 按请求的阶段推进

把阶段当进度检查点。在授权的生成范围与预算内,一直推进到所请求的产物。只在三种情况
停下: 请求过的评审、悬而未决的决定、需要新授权的动作。

先看项目里的工作流。游戏入口卡片会搭一条以 `nodetool.game.ExportGodotProject` 收尾的
填槽工作流,所以当项目里已经有一条时,首次构建是重跑而不是手工走 P0-P2: 整条工作流
跑一遍重新填满每个槽位,或重跑单个槽位的链路替换一件素材,然后从 P3 接手。没有这样的
工作流时,才手工走下面的阶段。

### P0 —— 从简报到设计

1. `list_game_templates`。挑选循环玩法匹配简报的模板,并说明理由。
2. 用 `write_file` 把 `design.md` 写进工作区: 题设、核心循环、玩家的动词、敌人、
   一个关卡的语言版布局、胜负条件。控制在一页以内。
3. 报告模板 id 与它的槽位清单。所请求产物包含素材或可玩游戏时继续。

### P1 —— 定阵容并锁定

1. `find_model {capability: "text_to_image"}` 跑一次。若结果带 `prompting_skill`,
   先 `load_skill` 它再写任何提示词。
2. `create_entity {kind: "style"}`,带上调色板与一段锁定渲染方式的描述词: 像素画、
   manifest 里的单元格尺寸、无抗锯齿、平光、精灵用透明背景。
3. 每个角色(玩家、每个敌人)用 `generate_image` 出一帧参考图,先经 `apply_entities`
   撒上风格实体,再对每个做 `create_entity {kind: "character"}`,描述词写剪影、配色与
   比例。描述词里不写姿势;姿势属于精灵图集。
4. `memory_save` 模板 id、模型 id 与全部实体 id,id 放进 `resources`。

报告实体 id 与模型 id,然后在授权范围内继续。

### P2 —— 填满 manifest

一次一个槽位,按 manifest 顺序。每个槽位先生成,再经 `invoke_node` 由它对应的
`nodetool.game.*` 节点检查,然后采纳或重新生成。失败两次的槽位如实上报,不强推。

| 槽位种类 | 生成 | 检查节点 | 检查证明什么 |
|---|---|---|---|
| `spritesheet` | `generate_image`,每行动画尺寸为 `cell × frames`,一段动画一行,提示词点名每段动画及其帧数,撒上角色与风格实体 | `nodetool.game.SpriteSheet {image, cell_width, cell_height, animations, fps, slot_id}` | 尺寸是单元格的整数倍,每段动画齐全且帧数达标 |
| `tileset` | `generate_image`,尺寸 `cell × columns` 乘 `cell × rows`,提示词按行优先顺序列出每块瓦片 | `nodetool.game.Tileset {image, cell_width, cell_height, count, slot_id}` | 网格吻合,数量达标 |
| 带 `seamless_x` 的 `image` | `generate_image` 按槽位尺寸出图,提示词写明可平铺并点名轴向 | `nodetool.game.SeamlessImage {image, slot_id, check_x, check_y}` | 对边在阈值内匹配 |
| `sfx` | `search_nodes "sound effects"` 一次,然后带提示词与槽位秒数对该节点 `invoke_node` | `nodetool.game.SoundEffect {audio, slot_id, seconds}` | 时长在容差内,尾音淡出 |
| `music` | `generate_music`,`duration_seconds` 取自槽位 | `nodetool.game.MusicLoop {audio, slot_id, seconds}` | 交叉淡化成环,时长在容差内 |

生成的素材以 `{type, uri: "asset://<id>.<ext>", asset_id}` 传入。每个检查节点把输出存
为携带填充印记的新素材并返回那个 `asset_id`;导出取的是这个 id,不是裸生成的那份。边做
边维护一张 `slot_id → asset_id` 表,每填完一个槽位就 `memory_save` 一次。

报告一张包含每个槽位、素材 id 与检查结果的小样图。可玩游戏请求继续到导出,素材包请求
到此为止。

**图路径。** 当用户想让素材包可重跑——换第二种风格、加第二个角色、换新模板——就建
一条工作流替代上面的循环。`nodetool.game.LoadGameTemplate` 按 manifest 逐条流式给出
`slot`;`nodetool.game.SlotPrompt {slot, style, cast}` 把每个槽位变成 `prompt`、
`width`、`height`、`kind`、`checker` 与 `seconds`,生成器与检查器的数字因此取自
manifest 而不是取自你;每个 `slot.kind` 一个 `nodetool.control.FilterCode` 路由到该
种类的生成器与 `nodetool.game.*` 检查器;最后
`nodetool.game.ExportGodotProject {template, name, fills, directory, verify}` 写出
工程。把检查器的 **`output`** 句柄接进 `fills` —— `fill` 句柄不携带素材,导出会拒绝
它。此后换皮就是换掉 `SlotPrompt` 上的实体再跑一遍。随产品附带的示例是
**Platformer Asset Pack**(`get_example_workflow`)。

### P3 —— 导出并写钩子

1. `export_godot_project {template, name, slots: [{slot_id, asset_id}, …]}`。
   被拒绝的导出会点名槽位与问题;回 P2 修那个槽位再导。不要改 manifest。
2. 读 `design.md` 与模板的钩子脚本(`read_file`),然后用 `edit_file` 在其中实现设计:
   移动常数、敌人行为、`level_01.tscn` 里用瓦片集摆出的关卡布局。仅限 Godot 4.3
   GDScript。钩子清单之外一律不动,除非某个钩子需要新场景。
3. 每轮编辑后 `verify_godot_project {dir}`。读失败脚本的 stderr 并修好。导入、全部
   脚本与冒烟场景全绿时收工,报告目录。

### P4 —— 试玩循环

用户来玩并反馈。手感反馈("跳跃轻飘飘")是钩子脚本里的一个常数: 改、验证、报告。
美术反馈则回 P2 重新生成那一个槽位,再用同一个 `name` 与完整槽位表调一次
`export_godot_project`;结果报告 `mode: "refresh"`,钩子改动原样保留。这里绝不传
`overwrite: true`,它会把钩子重置回模板。

## Godot 跑不起来的时候

`verify_godot_project` 会说明原因: 没有二进制,或是虚拟工作区。把原因报告一次,照样
交付导出的目录,并告诉用户在 Godot 4.3 里打开它,或在服务器上设置 `GODOT_BIN`。验证
被跳过的导出,绝不能报告成绿灯。

## 花费

P2 开始前报告槽位数量。一份平台跳跃 manifest 大约是八次生成加重试;过不了单元格检查
的精灵图集是最常见的重试原因。事后 `get_cost_summary` 给出这款游戏花了多少。

## 可选的分阶段评审简报

仅当用户希望逐阶段批准时才用这个示例。它的暂停不适用于已授权一次做完的请求。

```
Make a [platformer / top-down / shoot-em-up] about [premise]. Stop after each
phase and wait for me.

P0. Pick the template and write design.md.
P1. Style entity: [16-bit pixel art, warm palette]. Character entities for
    [player] and [enemy]. One image model from find_model. memory_save ids.
P2. Fill every slot in the manifest, check each with its nodetool.game node,
    regenerate on failure, at most twice. Show me the contact sheet.
P3. Export, implement the hooks from design.md, verify_godot_project until
    green. Give me the directory.
P4. I play, you fix.
```
