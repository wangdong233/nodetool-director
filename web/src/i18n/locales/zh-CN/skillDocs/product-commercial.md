**先加载 `/storyboard-core`。**它承载本技能所假定的循环、工具契约、
实体规则与门禁。下面只讲一部够得上摄影级的产品片,做法上有什么不同。

## 这类任务的独特之处

没有需要守住的一张脸,所以会漂移的是**包装**:标签几何、瓶盖、比例、
颜色。产品实体就是为这个而生的,也是参考图在这里比描述词更重要的原因。

另一个不同:产品片的镜头大多是在打**光**,而光住在分镜板风格里,不住
在镜头里。

## 给包装选角

用户的产品照就是实体。把附图存为素材,然后
`create_entity {asset_id, kind: "prop", name, descriptor}`。描述词写几何
与工艺——`squat 200ml amber glass cylinder, brushed gold screw cap,
single centred cream label, serif wordmark`——不写营销文案。

绝不发明标识、标语或标签版式。如果标签必须可读,在该镜头的 `action`
里写明,并给这个镜头微距构图。渲染剪辑前先检查静图。如果标签仍然
不可读,只在用户授权的重试与花费限额内重试。未授权重试时,报告缺陷,
继续完成余下所要求的阶段,且不声称标签可读。

给了多个角度(正面、四分之三、背面、顶面)时,把最好的一张主打角度
标为实体,其余留作普通素材——只有第一张参考图会进入提示词。

## 观感一次性写进分镜板风格

| 样式 | `style` |
|---|---|
| 奢华影棚 | `black cyclorama, one warm key, gold rim, volumetric mist, 85-100mm, 24fps, no grain` |
| 电商白底 | `white sweep, soft top light, even fill, 50mm, no shadow detail loss` |
| 外景生活方式 | `90s print / 35mm commercial, hard noon sun, mild bloom, no other brand marks` |
| 暗色科技感 | `graphite surface, hard side key, specular edges, controlled falloff` |

在风格里加上 `no on-screen type`。视频模型写字很糟,标题字应作为文字
片段放在时间线上(`edit_timeline` → `add_text_clip`),在那里才可编辑。

## 镜头配比

按要求的镜头数执行。简报没定的话,五到七个镜头是起手配比。每个剪切
给一个明确的目的。光在动而包装不动,产品片看起来才贵——直接这么写:
`the light streak crosses the glass, the bottle stays still`。

- 运镜写进 `motion`,带距离或角度:`slow 8cm push-in`、
  `low 30-degree orbit`、`rack focus from cap to liquid`。
- 给最后一个镜头一个**定格**:`last 1.2s dead hold`——模型在尾部会漂,
  定格才让结尾卡可用。
- 数清物理事件:`two condensation beads run`、`one ripple, then still`。
- 外景广告里有真人出镜时,按 `/ugc-video` 的选角流程把人选为角色实体,
  但包装镜头要用明确的 `entity_ids` 把人排除在外。

## 静帧是错的选择单元的地方

微距玻璃、雾气与高光反射正是 `keyframe` 模式回本的地方——静图便宜,
可以在为运动花钱之前先判断光。保持默认。

只有当重运动会被首帧拖僵时才把镜头切到 `render_mode: "direct"`:快速
环绕、倒酒、爆点揭示。此时构图与风格必须写进 action 文本,因为没有
静帧替它们携带。

## 简报

把这些示例按用户的简报改编。示例交付物、风格选择与审批检查点只在用户
采纳时适用。

下面的**简报**有两份:一份 10 秒无真人出镜的奢华产品照,一份 30 秒带
角色的街头快消漫步。替换方括号占位符,在常规指令之后交付其中一份。

## 简报 — 产品片

每条消息一份,跟在 `/storyboard-core` 的常规指令之后。替换 `[PRODUCT]`
与 `[CITY]`。`Nova` 代表角色实体的**普通名字**。

---

### 奢华产品照,10s 16:9

```
Direct a 10s 16:9 luxury commercial. [PRODUCT] only, no talent, no type.

Cast the pack from the attached shot: save it as an asset, then tag it as a prop
entity. Descriptor is geometry and finish, not copy.

Board style: black cyclorama, one warm key, gold rim, volumetric mist, 85-100mm,
24fps, no grain, no on-screen type.

1a 0-2  macro. A light streak crosses the glass, two condensation beads run.
        The light moves, the pack does not.
2a 2-4  the bottle rises onto black acrylic, key holds.
3a 4-6  low 30-degree orbit, label readable at the midpoint.
4a 6-8  rack focus from cap to liquid, one ripple, then still.
5a 8-10 pull back to a centred hero, key lifts ten percent, last 1.2s dead hold.

Stop after the board. Stills before clips.
```

### 街头快消漫步,30s 16:9

```
Direct a 30s 16:9 street commercial in [CITY] for [PRODUCT] with Nova.

Cast both: the pack from the attached shot as a prop entity, Nova as a character
entity from a generated reference you show me first.

Board style: 90s print / 35mm commercial, hard noon sun, mild bloom, no other
brand marks, no on-screen type.

1a 0-4   fisheye on a boom, Nova walking cobbles, [PRODUCT] in hand, long shadow
2a 4-8   shoulder track, one bite or sip
3a 8-12  POV from inside the cup or wrapper, a building cornice behind
4a 12-16 low wide at a crosswalk, one unbranded taxi crosses
5a 16-22 she stops and turns once, the pack reads
6a 22-27 she leans to the lens, a small late smile. One line, this shot only.
7a 27-30 the pack alone on a cafe table, street bokeh, one-second push, dead
         hold on the tail. entity_ids: the product only.
```
