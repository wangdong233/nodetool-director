# Fork 分支架构与迭代规则

> 本文档描述 nodetool-director 私有 fork 的四分支模型、迭代规矩、以及各分支与功能实现的映射。**只存在于 master(私有集成线),永不进入 feat/i18n-zh**(该分支要向 upstream 发 PR,不得携带 fork 治理文档)。
>
> 上游:`https://github.com/nodetool-ai/nodetool` · 远端:`git@github.com:wangdong233/nodetool-director.git`(SSH;本机 HTTPS push 会 sideband 断连)

## 1. 拓扑

```
upstream/nodetool ──(fetch, 只进不出)──▶ main ──(单向合并)──▶ master
                                            └──(单向合并)──▶ feat/i18n-zh(贡献类)
master ──(拉出)──▶ feat/mediagen-nodes(扩展类)
feat/mediagen-nodes ──(独立拆分后)──▶ 合并回 master
feat/i18n-zh        ──(独立拆分后)──▶ 合并回 master(cherry-pick 或 merge)
```

| 分支 | 角色 | 基线 | 推送目标 |
|---|---|---|---|
| `main` | 上游镜像,**纯净**:只跟 upstream,永不携带自己的提交 | upstream/main | 仅自己的 origin(镜像备份) |
| `master` | **集成线(自己的主线)**:i18n + 扩展功能 + 治理文档,日常测试环境 | main | 仅自己的 origin |
| `feat/mediagen-nodes` | **扩展类 feat**:媒体生成渠道节点包 | master | 仅自己的 origin |
| `feat/i18n-zh` | **贡献类 feat**:zh-CN 本地化,**纯净 i18n**,可向上游发 PR | main | 自己的 origin + (未来)upstream PR |

本地另有 `backup/pre-restructure-*`(2026-10-11 分支重构前的旧历史,兜底,勿动勿推)与 `drill/*`、`wt/*`(历史演练/工作树残留,已并入主线,可忽略)。

## 2. 迭代规则(铁律)

1. **main 只进不出**:仅由 upstream fetch → fast-forward 更新;任何自己的提交禁入 main。
2. **单向流入**:main 可以合并进 master;main 也可以合并进贡献类 feat(i18n 缺口按 `web/src/i18n/CONTRIBUTING.md` 规范补译)。反向( feat→main、master→main )禁止。
3. **两类 feat 的基线**:
   - 扩展类(不愿给上游的功能)→ 从 **master** 拉;
   - 贡献类(想推给上游的功能)→ 从 **main** 拉,且**只装该功能本身**(例:feat/i18n-zh 禁携带 mediagen —— 2026-10-12 曾被闭口 agent 污染,63 文件回滚修复)。
4. **feat 独立拆分后合入 master**;合入方式优先 cherry-pick(web 树同源时全干净)或 merge。
5. **变更传播模式**:在归属分支上开发验证 → 提交 → cherry-pick 到 master → 双侧推送。master 上的 web/i18n 改动无需反向同步(i18n 工作统一在 feat/i18n-zh 做再传播过来)。
6. **英文渲染字节不变**:i18n 接线只加 zh,en 侧与上游源码逐字一致(含大小写/省略号)。上游自身大小写不一致时拆独立键,不改共享键。
7. **推送规范**:SSH;重建历史后的分支用 `--force-with-lease=分支:期望oid`;旧历史先落 backup。**`git cherry-pick` 没有 `-q` 标志,加了会静默 usage-error 一次都不执行**(2026-10-13 实测)。

## 3. 标准作业程序

### 3.1 上游同步(周期性)

```bash
# ① 本网络 HTTPS fetch 会挂死,必须带代理
git -c http.proxy=http://127.0.0.1:7890 fetch https://github.com/nodetool-ai/nodetool.git main
# ② main 快进(只许 ff)
git checkout main && git merge --ff-only FETCH_HEAD && git push origin main
# ③ 合并进 master:整体验证(tsc/门禁/受影响测试),出功能变动清单
git checkout master && git merge main
# ④ 若 i18n 有缺口:main 合并进 feat/i18n-zh,按 CONTRIBUTING.md 补译
git checkout feat/i18n-zh && git merge main
# ⑤ 双侧推送
```

冲突原则:上游结构保 + 我们的接线适配(三方);词典冲突用 JSON 并集;**合并后必查"我们自己的修复被整文件回退"**(实测四座:PreviewArea 画质选择器/WorkspaceTabsStore 范围复活/fit-all 复合 tooltip/动词命名条 —— 检测法:对上游改过的文件 `diff <(git show main:path) path` 看 main-only 行数)。

### 3.2 日常开发环境

```bash
# API 7777 + Vite 3100(3000 是 new-api Docker,绝不能动)
node scripts/dev-server.mjs          # 后端(tsx watch)
cd web && npx vite --host 0.0.0.0 --port 3100 --strictPort
# 日常测试 checkout master(集成线含 mediagen;feat/i18n-zh 无扩展包)
```

## 4. 分支 ↔ 功能映射(快速续作索引)

### feat/i18n-zh —— zh-CN 全站本地化(贡献类)

- **覆盖**:13→15 个命名空间(common/nav/settings/home/editor/timeline/sketch/storyboard/ui/ui2/appbuilder/catalog/tools + 新建 game/setup);catalog.json zh-only 数据覆盖层(nodes/nodeDocs/skills/apps/styles/hfTask/scriptFormats/imageUseCases/workflowTemplates 等);skillDocs/ 一技能一篇显示层覆盖;terminology.json ~200 机械术语锚;镜头词汇表存储值/标签分立。
- **操作手册**:`web/src/i18n/CONTRIBUTING.md`(判定树/接线工作流/keep-English 裁定)· 覆盖地图 `web/src/i18n/COVERAGE.md` · 术语 `web/src/i18n/glossary.md` + `terminology.json`。
- **门禁**(web/ 下):`npm run i18n:gate`(G1-G4,G3 元组逐字进 commit)/ `i18n:preflight`(冻结模式)/ `i18n:audit`(裸串清单=事实源)。
- **续作要点**:新上游串进来 → audit 找到 → 按 CONTRIBUTING 接线;**每串接线前 `git show main:<路径>` 核对上游原文**(两真实翻车:凭空多 "this"、大写徽章键拼进句子);F-41(useTranslation 只在组件体第一层)/插值占位符 en 齐全/复数 en `_one+_other` zh `_other`。
- **浏览器验证范式**(lasso 链式):navigate → wait 英文标题 → `window.__nodetoolI18n.change('zh-CN')`(dev-only 钩子)→ 断言中文 + pageerror=0;合成 KeyboardEvent 不可信,按键走 press 管线。

### feat/mediagen-nodes —— 媒体生成渠道节点包(扩展类)

- **覆盖**:`packages/mediagen-nodes`(16 类节点):zhipu/agnes/cloudflare/siliconflow/hfspaces 图+视频、hfspaces TTS、pixvue Submit/Confirm 计费确认对、gemini web(CDP 9225)、dummy 冒烟;manifest 工厂 + 每渠道自包含目录;预算闸(executeMediagenCall 唯一收口,FIFO 信号量+日限额,env `MEDIAGEN_*`)。
- **挂载面**:目录 + package.json workspaces + base-nodes `BUILTIN_PACK_REGISTRARS.mediagen`(漏注册即 API 启动崩"No registrar")+ protocol pack 声明 + websocket/cli/dsl 注册 + config 运行时资产 + url-egress 台账。**改任一处须跑** `packages/websocket/tests/node-registry-setup.test.ts`(19 测,CLI/服务端对账)。
- **测试**:`npm run test --workspace=packages/mediagen-nodes`;真实 E2E 走智谱渠道。
- **红线**:本包只存在于 master / feat/mediagen-nodes,**永不进 feat/i18n-zh 与 main**。

### master —— 集成线

- 上游全部 + 上述两者之和 + 本文档等 fork 治理;`mediagen` pack 注册表接线(master 专属提交)。
- **验证基线**:web 全量 jest(灰了先单套复跑判环境)、`npx tsc --noEmit -p web/tsconfig.json`、i18n 门禁、websocket registry 套件。

### main —— 上游镜像

- 无自己的内容;唯一动作是 3.1 的 fetch/ff/push。

## 5. 变更日志锚点

| 日期 | 事件 |
|---|---|
| 2026-09-24 | mediagen-nodes 交付,origin 建仓 |
| 2026-10-11 | 四分支重构(backup 兜底);上游 1467 commit 合并 |
| 2026-10-12 | feat/i18n-zh 去污染;master registrar 修复(API 启动崩根因) |
| 2026-10-12~13 | 覆盖扩展轮 B1-B8:审计 1,315 条全清;揪出 4 座存量合并丢失 |
| 2026-10-13 | 四分支首推;四尾巴清零(blockers/FORMAT_LABEL/报告 sections/键形漂移) |
