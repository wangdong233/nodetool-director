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
| H1 | 根 `package.json` workspaces 数组 | 追加 `packages/mediagen-nodes` | 低(纯追加行) |
| H2 | (待研究相确认)节点目录/catalog 注册点 | mediagen 节点进画布 catalog | 待定 |
| H3 | (待研究相确认)job/Runner 调度处 | credit 预算闸 | 待定 |
| H4 | `.github/workflows/`(新增自有文件,不改上游文件) | CI windows lane | 无(纯新增) |

## 3. 上游规约要点(对本项目生效,摘自 AGENTS.md)

- 代码变更后四联验证:`npm run test:affected` / `npm run typecheck` / `npm run lint` / `npm run dev:nodetool -- harness gate --base origin/main`。
- **commit 禁加 co-author**;禁无证据宣称完成。
- 装饰器节点包从 dist/ 加载 → 改后必须 `npm run build:packages` 再 `npm run dev`。
- 仓内 skill:`nodetool-custom-node-developer`(节点作者指南,M3 必读)、`code-review`、`tdd` 等。
- 外部 URL fetch 必须走 `safeFetch`/`fetchExternalMedia`(SSRF 边界,mediagen 节点遵守)。
- 资源 ID 原则:32 hex 全 ID 内部保留,agent 面可缩 12 位。
