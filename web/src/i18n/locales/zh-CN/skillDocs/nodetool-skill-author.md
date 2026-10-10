# 编写 NodeTool 技能

技能是一组带名字的指令,当它的描述匹配任务时由智能体加载。当同样的指示否则每个会话
都要重复一遍时,就写一个技能。为一次性工作写技能是不对的: 直接把活干了。

## 选哪种

| | 用户技能 | 系统技能 |
|---|---|---|
| 住在哪 | 用户账号里的一行记录 | 构建产物里的 `packages/system-skills/<name>/SKILL.md` |
| 怎么写 | `create_skill`、`update_skill`、`delete_skill` | 一次 pull request 里的一个文件 |
| 范围 | 仅该用户 | 每个安装开箱即有,无需播种迁移 |
| 运行时可编辑 | 是 | 否。不可变,且名字保留,用户记录无法遮蔽 |

`.claude/skills/` 下的仓库技能是第三种东西: 它指导在 NodeTool 仓库上干活的编码智能体,
而不是产品内的智能体——是工程循环,不是产品表面。它的维护规则在 checkout 的
`.claude/README.md` § Maintaining skills。

教产品表面的技能是系统技能,哪怕编码智能体也想要它。`packages/system-skills/<name>`
持有唯一副本,`.claude/skills/<name>` 是指向它的符号链接,产品与仓库因此读同一份文档。
在 `.claude/skills/` 下再写一份副本,两边就会漂移;`npm run check:agents-docs` 会在其中
一份上失败。

## 契约

两种是同一种文档。

```markdown
---
name: my-skill
description: When to use this
---

The instructions.
```

- `name` 是小写 slug,只许 `a-z0-9-`,至多 64 字符。不能含 `anthropic` 或 `claude`。
  同一用户的名字必须唯一。
- `description` 是一行有界文本,至多 1024 字符,不带标记。**它是唯一始终在上下文里的
  部分**,所以要写成*何时用它*,而不是技能里有什么。不点明触发条件的描述意味着技能
  永远不会被加载。
- 正文必须非空。frontmatter 按标量 `key: value` 对解析,不是完整 YAML,围栏是开头
  `---` 之后的第一条 `---` 行,所以正文里出现 `---` 分隔线也能存活。
- `##` 标题把正文切成加载器可以逐段取的小节。智能体只在某一步才需要的材料,放这里。

用回读确认解析无误: `list_skills` 显示名字与描述,`load_skill {name}` 返回完整指令。

## 写得让它触发,也立得住

- **先给结果,再给循环。** 读者正处在任务中途,会照第一条像指令的话行动。
- **工具名一字不差。** 技能里写错的工具名是模型无法自救的失败。落笔前对照实时 schema
  或能力注册表核对每个调用。
- **写明工具拒绝什么**,而不只写它接受什么。多数技能失败是一次带着工具会丢弃的字段
  的调用。
- **指向邻居**,不要复述。手艺技能引用调用,契约技能拥有它。
- **不要加用户没要的检查点或交付物。** 技能里的示例只是示意,不是对下一次
  请求的要求。

## 发布一个系统技能

一个目录,内含一份 frontmatter `name` 与目录同名的 `SKILL.md`。没有代码 import 这些
文件,所以 `packages/system-skills` 不是 workspace: `scripts/bundle-backend.mjs` 的
`stageSystemSkills` 把每个目录复制进 bundle `server.mjs` 旁的 `_skills/`,而
`scripts/verify-backend-bundle.mjs` 会让漏掉一个的构建失败。新目录随构建直接发布,
无需其他改动。

发现顺序是 bundle 旁的 `_skills/`,否则一路向上找 `packages/system-skills`,
否则 `NODETOOL_SYSTEM_SKILLS_DIR`。只读 `SKILL.md`: 技能以单文档形态发布,原本会
做成 `references/` 文件的材料应放进正文的 `##` 小节。

仓库的编码智能体也要用到时,把新目录符号链接进 `.claude/skills/<name>`。

一个新系统技能通常还欠两笔后续:

- 工具名方面什么都不用做: `packages/agents/tests/shipped-skill-names.test.ts`
  会从每份已发布技能里读出全部 snake_case 调用并对照注册表检查,新目录一存在即被
  覆盖。正文点到了 timeline 调用的技能,还可以进该测试的 `SKILL_NAMES`,那里会拿
  能力规格与 `edit_timeline` 的操作清单做精确匹配。
- 指导某一条模型线的技能要进 `MODEL_PROMPTING_SKILLS`
  (`packages/agents/src/model-prompting-skills.ts`),让 `find_model` 把它挂到匹配的
  路由上。`packages/agents/tests/model-prompting-skills.test.ts` 会拿那张表对照磁盘上
  的技能、已发布服务商清单点名的模型 id,以及能力注册表。

## 参考

在 NodeTool checkout 里,这些仓库源码走得更远:

- `packages/system-skills/README.md` —— 已发布技能全集,以及一项任务如何在其中路由。
- `packages/agents/src/system-skills.ts` —— 加载器与发现规则。
- `packages/protocol/src/skill-document.ts` —— 解析器与校验器。
