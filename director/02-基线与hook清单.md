# 02 · 基线与 Hook 清单

## 1. 基线记录

| 项 | 值 |
|---|---|
| 上游 | `nodetool-ai/nodetool`(https) |
| 私有镜像 | `wangdong233/nodetool-director`(https,private,mirror push 2026-09-24) |
| 基线 commit | `88a9c2798`(Merge branch 'feat/landing-sizzle-and-redo') |
| 基线日期 | 2026-09-24(与实施方案核验基线一致,方案内 file:line 证据仍有效) |
| 上游许可 | AGPL-3.0(LICENSE.txt 核验) |
| Node | .nvmrc=22.22.1(开发机 v24.12.0,待 M1 验证兼容) |
| 包管理 | npm workspaces + turbo(无 pnpm) |

## 2. Hook 清单(自建域之外的合法触碰点;改动此处以外 = 收敛面违规)

> 登记制:每新增一个 hook 须在此登记(文件+理由+上游冲突预期)。M3/M4 研究相后填充初版。

| # | 文件/位置 | 用途 | 预期上游冲突面 |
|---|---|---|---|
| H1 | 根 `package.json` workspaces 数组(:4-76) | 追加 `packages/mediagen-nodes` | 低(纯追加行) |
| H2a | `packages/protocol/src/builtin-packs.ts`(:61-150) | BUILTIN_NODE_PACKS 加 mediagen(id 永不改名) | 低(数组追加) |
| H2b | `packages/websocket/src/node-registry-setup.ts`(:31-43,:94-111) | import+BUILTIN_PACK_REGISTRARS | 低(追加) |
| H2c | `packages/websocket/package.json` | 依赖 mediagen-nodes | 低 |
| H2d | `packages/cli/package.json`+`src/node-registry.ts`(:17-24)+`src/nodetool.ts`(:618-628,:2020-2030) | 单节点 harness/DSL 侧注册(验证必需) | 中(两处临时列表上游常改) |
| H2e | `packages/config/src/package-asset-registry.ts`(:34-44) | manifest 进 PACKAGE_RUNTIME_ASSETS(fail-closed) | 低 |
| H2f | `packages/cli/src/harness/registry.ts` domain-nodes paths(:1586-1626) | harness gate 路径认领(否则 gate FAIL) | 低(追加目录) |
| H2g | `packages/dsl/package.json`+`packages/dsl/src/registry.ts`(loadBuiltinRegistry) | DSL run()/flow API 执行面(M5 实测:nodetool run 经此注册表——C3 非可选!研究04 标"可选"是误判,已实证) | 低(try-import 块+dep 行) |
| H3 | `packages/runtime/src/context.ts` runGenerationWith(:3482 附近,以注入/包裹方式) + `packages/websocket/src/session/job-execution.ts` 准入(:1151-1156) | credit 预算闸(R1 生成缝为主+R2 job 准入为辅;尽量新增文件+最小注入点) | **高**(核心文件,方案相须设计最小侵入形态)。**v1 未用(终审 Y4 注)**:M4 闸实际落在包内 executeMediagenCall 收口(budget.ts),零核心文件触碰;本 hook 留作未来 job 级准入再启用 |
| H4 | `.github/workflows/mediagen-nodes-windows.yml`(新文件) | CI windows lane | 无(纯新增) |
| H5 | `docs/url-egress-inventory.md`+`packages/runtime/tests/url-egress-inventory.ts` | 渠道 URL 出口登记(safeFetch;**每新增 adapter 须同步,审计测试强制**) | 低(表追加) |
| H6 | (可选后续)`web/src/utils/nodeProvider.ts` 两张 namespace 映射 | web 侧 key-gating UX(v1 显式不做:节点常显,缺 key 运行时报结构化错误) | 中;不做则无 |

> 触碰面纪律:凡不在本表的包外改动 = 收敛面违规(飞轮 §6)。上游 merge 冲突只允许出现在上表文件;每次 merge 记录冲突点与解法。

## 3. CI 状态(2026-09-25 终局)

- **Windows lane 实跑 ✅(2026-09-25 08:14,用户授权临时 Public 程序)**:run 36076592872,job `test in 7m24s` windows-latest 全绿(npm ci→turbo 构建→74 测试);跑毕即翻回 PRIVATE(visibility 已验证)。R2 DoD 最后一块证据闭环。
- 已禁用 20 个上游噪音/必败 workflow;保留 test/quality-checks/docs/provider-codegen/flatpak/chat-perf/page-load + 自有 mediagen-nodes-windows。
- 私有仓 Actions 仍受 GitHub billing 阻塞——后续需要 CI 时同一程序(临时 Public→dispatch→回 Private)或修 billing。

## 4. 上游规约要点(对本项目生效,摘自 AGENTS.md)

- 代码变更后四联验证:`npm run test:affected` / `npm run typecheck` / `npm run lint` / `npm run dev:nodetool -- harness gate --base origin/main`。
- **commit 禁加 co-author**;禁无证据宣称完成。
- 装饰器节点包从 dist/ 加载 → 改后必须 `npm run build:packages` 再 `npm run dev`。
- 仓内 skill:`nodetool-custom-node-developer`(节点作者指南,M3 必读)、`code-review`、`tdd` 等。
- 外部 URL fetch 必须走 `safeFetch`/`fetchExternalMedia`(SSRF 边界,mediagen 节点遵守)。
- 资源 ID 原则:32 hex 全 ID 内部保留,agent 面可缩 12 位。
