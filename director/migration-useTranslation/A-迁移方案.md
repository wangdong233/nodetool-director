# A · useTranslation 全量迁移方案(Plan Author 产出,2026-09-29)

> 立项依据:97 F-11/F-12(用户裁决全量迁移)。本方案是唯一计划文档;调查为只读实跑,所有计数来自本机 grep/python 字符串感知扫描(2026-09-29,HEAD=1a75481d3,分支 feat/i18n-zh)。
> 配套文件:本目录后续将接收 B-批次执行台账(每批登记,同 95 纪律)。

## 0. 基线实测(全部本机实跑,非声称)

| 项 | 实测值 | 方法 |
|---|---|---|
| `i18n.t(` 总出现次数(src,含测试) | **5600**(其中测试文件 8) | `grep -ro "i18n\.t("` |
| 含 `i18n.t` 的源文件总数 | **860** | `grep -rl` |
| 迁移主面:components 759 文件 / 5321 处;studio 5 / 28;hooks 48 / 112;src 根 3 文件 / 14 处;utils/MarkdownRenderer 1 / 2 | **816 文件** | 逐目录 occurrence 计数 |
| useMemo 体内 i18n.t | **170 处 / 40 文件** | 字符串感知括号扫描 |
| useCallback 体内 i18n.t | **272 处 / 127 文件** | 同上 |
| useEffect 体内 i18n.t | **10 处 / 8 文件** | 同上 |
| 模块级(花括号深度 0)i18n.t | **15 处,全部是箭头/函数助手**(消费端渲染期求值),零"一次求值"常量冻结面 | 深度扫描+逐文件人工核验 |
| React.memo 组件文件含 i18n.t | **367 文件** | grep 组合 |
| 类组件 render 内 i18n.t | **2 文件 3 处**(SearchErrorBoundary 2 / PanelErrorBoundary 1) | 逐文件核验 |
| labelKey 模式(不迁移) | **535 处 / 85 文件** | grep |
| `languageVersion` 依赖引用 | **87 处 / 40 文件** | grep |
| useAppLanguage 消费文件 | **60**(不含 i18n/index.tsx 自身) | grep |
| 多组件文件(≥2 个组件声明) | **~79 文件** | 启发式 |
| t 名遮蔽风险文件(文件内已有 `t` 绑定) | **16 文件**(清单见 §6 R2) | grep 组合 |
| 测试面 | 1516 个测试文件;`getByText(` 1281 处;**零** i18n/useTranslation mock;无测试包 I18nextProvider | grep |
| preflight | `scanned 2250 files / preflight OK`,exit 0 | 实跑 |
| tsc 基线 | `scripts/i18n-tsc-baseline.txt` 3 行(ConnectableNodes TS2339 ×1 + 两测试 TS2739 ×2) | 实跑 |
| 已装版本 | **react-i18next 17.0.15 / i18next 26.4.2**(根 node_modules 提升;web/package.json 声明 ^17.0.15 / ^26.4.2) | package.json 实读 |
| LanguageSetting.tsx | 现存唯一 useTranslation 消费者(零 i18n.t),证明钩子在 Vite+jest 双环境可用 | 实读 |

## 0.1 版本裁定(令状要求显式给出)

**VERDICT:react-i18next 17.0.15 支持 `react.useSuspense:false` 下的 addResourceBundle/changeLanguage 重渲染,且无需改 i18n/index.tsx 任何一行即可迁移。** 依据(实读 `node_modules/react-i18next/src/useTranslation.js`):

1. **订阅机制** = `useSyncExternalStore(subscribe, getSnapshot)`。默认 `bindI18n: 'languageChanged'`,`bindI18nStore: ''`(store 的 added/removed 事件**默认不订阅**)。事件到达时 `wrappedCallback` 先递增 revisionRef 再触发 React 重读快照——快照缓存键含 revision,因此事件必然产出**新 t 函数**。
2. **懒加载 zh 的传播路径已存在**:`ensureLanguageLoaded`(src/i18n/index.tsx:98-100)在 addResourceBundle 后对同 lng **重发 changeLanguage**——这正好发出 `languageChanged`,钩子订阅面完全吃到。R6-7 的补丁对钩子形态同样成立,**保留不动**。
3. **useSuspense:false 已在 init 设置**(src/i18n/index.tsx:68)。en 资源 init 内联、无 backend → `hasLoadedNamespace` 恒真 → `ready` 首渲即 true → 不抛 Promise、无 `USE_T_BEFORE_READY` 告警、无 loadNamespaces effect 空转。
4. **PartialRenderer 不存在于 v17**——那是 pre-v13 类组件时代的内部实现,现代实现是 useSyncExternalStore + 每组件快照缓存。单组件订阅成本 = 1 个 `languageChanged` 监听器 + 1 个快照对象;**t 的身份仅在语言事件间变化**,普通重渲染下 t 引用稳定,useMemo/useCallback 依赖数组不会因迁移而抖动。~4900 站点的规模化订阅成本可忽略;语言切换时全部挂载组件各重渲染一次——这正是期望行为(也是本迁移的目的)。
5. **完全限定键与钩子参数正交**:`useTranslation()` 不带参 → 固定 ns='common',但键内的 `ns:` 前缀在 i18next 键解析中**覆盖**固定 ns。全站 5600 处键均为完全限定形,统一 `useTranslation()` 裸调用即可。
6. jest 环境:react-i18next `main: dist/commonjs/index.js`,ts-jest require 条件下解析 CJS,**无需** transformIgnorePatterns/moduleNameMapper 改动;i18n 模块经 `initReactI18next` 调用 `setI18n` 注册全局实例,无 Provider 包裹的测试组件经 `getI18n()` 回退拿到同一实例——与今天的全局 `i18n` 导入行为等价。

## 1. 目标形态 spec

**统一目标代码形**(唯一合法形态,1:1 保留 defaultValue 与完全限定键):

```tsx
import { useTranslation } from "react-i18next";

export function ShotCard(props: ShotCardProps) {
  const { t } = useTranslation();          // 组件体第一条语句,无条件、无嵌套
  // ...
  return (
    <EditorButton tooltip={t("ui2:attrs.retryPreview", { defaultValue: "Retry preview" })}>
      {t("editor:ui.output", { defaultValue: "Output:" })}
    </EditorButton>
  );
}
```

**为什么保留完全限定键 `t("ns:key")`(设计决策,必须遵守)**:

- **三道守卫全部按字面 `ns:key` 扫描源码,与调用包装器无关**——实测确认:死键守卫(src/i18n/__tests__/i18n.test.ts:124-200,单遍引号感知扫描器建 fullLiteralRefs/quotedLiterals/objectKeys/templateLeafRefs 四 Set)匹配的是**引号字面量内容**;G4(i18n-commit-gate.mjs:103)正则 `["'`]([a-z0-9]+):([a-zA-Z0-9_.]+)["'`]` 同样不关心是 `i18n.t(` 还是 `t(`。改成裸键 + `useTranslation(["editor"])` 会让两道守卫对全部 5600 键失明,还要逐文件推断命名空间(4002 文件的机械变换复杂度爆炸)。**完全限定键 = 零守卫改动 + 零命名空间推断**。
- `defaultValue` 逐字保留:en 是词典真源,defaultValue 是渲染兜底;两态(en 直出 / 缺键回退)输出不变,1281 处 getByText 英文断言与 e2e 选择器零漂移。
- 不使用 `keyPrefix`(会改变键书写形,破坏守卫);不使用 `nsMode: fallback` 需要的多 ns 参数。

**useAppLanguage 终态**:仅 LanguageSetting.tsx(language + setLanguage)与 src/index.tsx:657(language 驱动主题切换)两个消费者;`version` 导出走 §7 退役流程。

## 2. 遗留豁免清单(迁移后仍用全局 `i18n.t` 的合法集合)

| 类 | 文件 | 站点量 | 逐类理由 |
|---|---|---|---|
| **c 类组件** | `src/components/SearchErrorBoundary.tsx`(2)、`src/components/common/PanelErrorBoundary.tsx`(1) | 3 | useTranslation 是钩子,类组件不可用。**裁定:改 `withTranslation` HOC**(react-i18next 对类组件的原生形态,1 行包装即可获得订阅;比"全局 t + version-key 包一层"少一个自造机制)。注:Model3DViewer.tsx 的 ModelErrorBoundary 与 PreviewRecovery.tsx 的 PreviewErrorBoundary 类体内**无** i18n.t(实核),同文件的 FC 部分照常迁移 |
| **d 模块表(labelKey)** | 85 文件 535 处 labelKey 引用 + 消费端 `t(option.labelKey, { defaultValue: option.label })` 形 | 0(不迁移) | 模块作用域不能调钩子。d1-d4 批已把模块表全部 labelKey 化;实测模块深度 0 的 15 处 i18n.t 逐文件核验**全部**是"消费端渲染期求值的函数助手"(DefaultModelsMenu.tsx:14、VaultsSettings.tsx:7/9、settingsSearch.ts:24、StorageHistorySettings.tsx:17、MobileDocumentSelector.tsx:34、tabTypeIdentity.ts、aspectOptions.ts:20、SlashCommandNode.tsx:64、TypeFilterChips.tsx:66、ToolsListProperty.tsx:87、TriggerActivationButton.tsx:89、bugReportBundle.ts、LookStep.tsx 助手、SettingsMenu.tsx:74)——**零一次求值冻结面**,preflight OK 佐证。这些助手连同其调用方(已在组件渲染期内执行)由消费组件的订阅覆盖,保持全局 |
| **e 非 React 模块** | stores 17 文件 44 处(AssetStore/GlobalChatStore/TimelineStore/WorkflowManagerStore/workflowUpdates/useAuth 等);lib 10 文件 20 处(GlobalWebSocketManager、workflow/*、storyboard/*);utils 8 文件 ~38 处(bugReportBundle、fileExplorer、format*、identifierValidation、modelFormatting.tsx——`prettifyModelType` 是渲染期调用的普通函数非组件、modelNormalization);config 4 文件 8 处(data_types.ts 862/883 的 displayLabelForType 等 labelKey 解析器、codeGenPaletteMetadata、snippetMetadata、shortcuts);serverState 3 文件 5 处(useAssets/useAssetDeletion/useAssetUpdate——mutation 回调,渲染期外触发) | ~117 | 在订阅组件渲染期外求值(toast/错误透传/动作回调),或本身是被 FC 调用的纯函数。全局单例在求值瞬间读当前语言,语义正确且**无捕获陈旧 t 风险** |
| **e' 组件文件内的事件相位** | useCallback 体 272 处/127 文件、useEffect 体 10 处/8 文件 | ~282 | 见 §3 变换规则 R4——回调在渲染后触发,保留全局 = 读求值瞬间的语言,零 deps 改写风险。文件因此保留 `i18n` 导入(与钩子共存,合法) |
| **f 启动面** | `src/index.tsx` 8 处(boot splash :676-768) | 8 | 启动/错误屏在 Provider 树装配期与最坏路径(路由失败)渲染,不依赖钩子机制;该组件已经 useAppLanguage(:657)订阅重渲染 |

豁免面合计 ~440 处,全部保留 `import { i18n } from ".../i18n"` 现状。**每处豁免在 B-批次台账逐文件登记理由**(同 95 §3 可辩护纪律)。

## 3. 迁移变换规则(按类,机械可脚本化)

**总原则:迁移渲染相位(JSX、渲染体、useMemo 体);事件相位(useCallback/useEffect 体、异步回调、store 动作)保留全局。** 分界理由:钩子的职责是让**渲染输出**订阅语言;回调在触发瞬间求值,全局单例读到的永远是当前语言——把回调迁到捕获 t 反而引入陈旧闭包风险(语言切换后触发的 toast 用旧 t),这正是要消灭的冻结类的变体。

| 规则 | 内容 |
|---|---|
| R1 组件插入 | 对每个**体内含迁移位点的组件声明**(function/const-箭头/React.memo 包装的 function),在函数体开花括号后第一语句位插入 `const { t } = useTranslation();`。**只允许插在函数体第一语句**——早返回/条件分支之前,天然满足钩子规则。多组件文件(79 个)逐组件判断:无位点的组件不插 |
| R2 调用替换 | 仅在"组件体 span"内把 `i18n.t(` → `t(`。span 计算:字符串感知括号/花括号扫描(prelude:复用 preflight 已验证的 matchForward/matchBackward,F-07 教训——禁行级正则),先取模块顶层组件/自定义钩子声明 span,再**减去** useCallback/useEffect 子 span 与模块助手函数 span |
| R3 useMemo 依赖改写 | 迁移的 memo 体:deps 里 `languageVersion` 词元 → `t`(87 处/40 文件);deps 无 `t` 的追加 `t`。改写后 memo 冻结类结构性消失(t 身份随语言事件变化) |
| R4 事件相位不动 | useCallback/useEffect 体内 `i18n.t(` 原样保留(272+10 处),文件保留 i18n 导入 |
| R5 导入处理 | 文件内 `i18n` 引用归零 → `import { i18n } from ".../i18n"` 替换为 `import { useTranslation } from "react-i18next"`(位置:原导入行原位替换,F1 花括号注入教训的根治形态);仍有引用(e' 类共存)→ 原行保留 + 新导入插在**最后一个完整 import 语句之后**(锚定"语句"而非"行",对每个产物跑 G1 esbuild 解析断言)。注意 web tsconfig 关闭了 noUnusedLocals、oxlint 关 unused-vars——**残留未用导入不会被门禁抓**,脚本必须机械判定后清理,批次验证加一条 `import { i18n }` 但零 `i18n\.` 引用的 grep 检查 |
| R6 钩子文件 | 48 个 hooks 文件等同组件处理(自定义钩子体首句插钩子);体内仅事件相位位点的文件不插,归 e' 豁免 |
| R7 memo 形态 | 367 个 memo 文件:钩子插在**被 memo 包装的函数体内**(如 `memo(function MarkdownBody({...}) {` 花括号后),不是 memo 调用外。这一类**结构性修复 memo 穿透冻结洞**(97 F-11 点名的未覆盖洞) |
| R8 类组件 | 2 文件改 `withTranslation()(Component)` 导出形;render 内 `i18n.t(` → `this.props.t(` |
| R9 t 遮蔽 | §6 R2 清单 16 文件**脚本跳过、人工逐文件迁移**(文件内已有名为 t 的绑定,错误替换不产生 tsc 错误——唯一无编译网形态) |

**批处理脚本形态**(每批 agent 自带,入库到 `director/migration-useTranslation/` 供审计,不进 web/src):
1. 单遍字符串感知扫描(读写同一遍,遵循 95 §5 规则 6 单遍纪律)计算:组件声明 span、memo/callback/effect 子 span、i18n 导入行、`i18n.` 残留计数。
2. 按 R1-R8 产出变换后源码;**t 遮蔽清单文件直接跳过输出**。
3. 产物逐文件过 esbuild `transformSync`(G1 同款)——解析失败即中止该文件,不落盘。
4. 打印实际遍历根目录清单 + 每文件变换计数(95 §5 规则 1/3:walk 范围显式声明、计数以 diff 机械数为准)。

## 4. 批次划分(并行 worktree,叶子先行、壳最后)

词典 JSON 全程零改动 → 无 d1-d5 式词典隔离需求;按目录切分文件集天然不相交,零合并冲突。**每批一个 commit,消息格式 `i18n-mig: <批号> <域> — G3-CLAIM: N t( replacements / M useTranslation insertions`(机械数,禁手估)**。

| 批 | 内容(文件数) | 说明 |
|---|---|---|
| **B0 试点** | ui_primitives(50) | 叶子+高扇入+memo 密集;全门禁 + 1 个页域浏览器验收打通后才放行 B1+ |
| B1 | properties 42 + inputs 4 + color_picker 6 + widgets/buttons/audio/audio_editor/content 等 ≤4 文件小目录(~54) | |
| B2 | node_types(43) | |
| B3 | node(55) | |
| B4 | node_menu 18 + node_editor 9 + inspector/graph_view/execution(30) | |
| B5 | menus 19 + panels 18 + context_menus 13(50) | |
| B6 | assets 19 + asset_viewer 3 + collections 6 + content/search/preview(~34) | |
| B7 | projects 10 + workspaces 6 + workflows 11 + applications 4 + portal 6 + packages 6 + version 6(49) | |
| B8 | costs/workers/entities/memory/skills/oauth/support/tutorials/dialogs/common/model_editor/audio*/video/onboarding/provider_onboarding(~39) | |
| B9 | chat(35) | MediaChatComposer 等冻结旧案集中地 |
| B10 | hugging_face 22 + model_menu 16(38) | ModelList 冻结旧案 |
| B11 | sketch(41) | |
| B12 | storyboard(20) | |
| B13 | setup(60) | 引导流,IdeaStep 族 |
| B14 | timeline(85) | 最大单目录;d4 先例 331 文件单批,85 无压力;必要时按 Inspector/Tracks/preview/transcript 二分 |
| B15 | workspace 28 + textEditor 6 + jsScript 7 + script 7 + chain_editor 8 + compositor 4(60) | |
| B16 | hooks 全域(48) | |
| **B17 壳层收尾** | studio 5 + 组件根 4(Login/Inspector/InspectorTabs/SearchErrorBoundary)+ PanelErrorBoundary + ErrorBoundary.tsx + GraphViewerApp.tsx + utils/MarkdownRenderer(13) | 路由壳与错误面最后动,任何前批的回归此时已清 |

**合计 18 个迁移批(816 文件)+ 3 个后置阶段(P1 守卫扩展 / P2 版本计数器退役 / P3 浏览器终验与台账回写,见 §7-§9)。** 并行度 4 个 worktree agent(用户机器资源与 d 批先例):B0 单飞 → B1-B16 四路并行(B14 建议独占一波)→ B17。

## 5. 每批验证门(全部实跑留输出)

提交前(串行必过,秒级-分钟级,F-01 分层纪律):
1. `node scripts/i18n-commit-gate.mjs --base <上一批 commit>` — G1 语法(esbuild,含 untracked)/ G2 tsc 集合对基线(基线 3 行不变;**G2 是本迁移的主编译网**:任何 span 计算错误导致 `t` 泄漏到无钩子作用域,即刻 `Cannot find name 't'`)/ G3 机械计数 / G4 悬空引用(字面 `ns:key` 不变,天然免疫本迁移)。
2. `node scripts/i18n-preflight.mjs` — 冻结/半接线守卫(豁免面的存量 i18n.t 仍受它管,继续 OK)。
3. `npx jest src/i18n` — 20 用例:奇偶 + 死键 + 切换语义(与组件迁移正交,必须保持绿)。
4. `npx tsc --noEmit -p tsconfig.json` 与基线集合逐行一致。
5. `npm run lint`(oxlint)——**react-hooks/rules-of-hooks 已是 error 级**(.oxlintrc.json:17),钩子插入位置违规在此被抓;exhaustive-deps warn 补充暴露 R3 依赖改写遗漏。
6. 本批目录 grep 自检:零残留渲染相位 `i18n.t(`(人工抽读 3 文件佐证);零"导入 i18n 但零引用"文件。

提交后(异步,红则前向修复):`npx jest <本批目录>`——**迁移后每个组件测试自动成为钩子测试**(jsdom 下走 getI18n() 回退),这是钩子在测试环境的大规模证明;重点盯 1281 处 getByText 英文断言零漂移。

浏览器验收(每 3-4 批对已覆盖页域跑一次 §8 协议,B0 后首跑)。

## 6. 风险清单

| # | 风险 | 缓解 |
|---|---|---|
| R1 | **钩子规则违规 = 运行时崩溃**(插入条件体/嵌套函数后) | R1 只插函数体第一语句;oxlint rules-of-hooks error 级门禁;jest 组件套件秒级暴露(React 立即抛错) |
| R2 | **t 名遮蔽静默错绑**(16 文件已有 t 绑定:MessageView、CompositorEditorCanvas、NodeInfoPanel、ExternalMcpServersSection、PropertyInput、OutputNode、PreviewNode、AdsrPreview、SynthKnob、ClipTimeRemap、ClipAdjustments、ClipCustomCurves、TranscriptEditor、TrackEffectsPanel、LayerItem、SketchLayersPanel)——错误替换**不产生 tsc 错误**,是唯一无编译网形态 | 脚本硬编码跳过清单,B 批人工逐文件迁;迁移后 grep 断言旧 t 绑定与钩子 t 无同名冲突(必要时局部重命名旧绑定) |
| R3 | **memo deps 改写漏网 → 陈旧 t 冻结**(R3 的反面) | 87 处 languageVersion 词元机械替换;tsc 抓"languageVersion 未定义"残留;P1 阶段新增 preflight 规则(见 §7)兜底 |
| R4 | 多组件文件(79)/ memo 包装形态插错层 | span 扫描器以声明为单位;G2+jest 双网;t 遮蔽外的错误均编译可见 |
| R5 | 导入处理回归 F1(注入花括号)与残留未用导入(noUnusedLocals 关闭,门禁盲) | R5 原位替换为主;插入锚定完整语句;每批 grep 自检第 6 条 |
| R6 | 事件相位误迁(把回调体也换成 t)→ 切语言后触发的 toast 用旧 t | R2 的 span 减法;豁免登记;P1 后 preflight 可加"t( 出现在 useCallback 体内"反向提示(观察项,不强门) |
| R7 | en/测试回归 | 语义等价论证(§0.1-5:同实例、同键解析、同 defaultValue 路径)+ 1281 getByText 全量异步回归;LanguageSetting 先例 |
| R8 | 规模订阅性能 | §0.1-4 实读结论:快照缓存 + t 身份仅语言事件间变化;B0 后跑 `npm run test:e2e-runner` 一次与 perf 基线(director/perf-baseline.md)对照 |
| R9 | e2e_runner/preview 旁路渲染面无 Provider | getI18n() 全局回退,行为与今日全局导入等价;B0 验证含 e2e-runner 冒烟 |
| R10 | 与在途 i18n 接线批次互踩 | 迁移战役期间冻结 95 登记表新接线批(词典冻结);本迁移零词典改动 |

## 7. 版本计数器退役阶段(P2,最后执行)

前置:B0-B17 全合并 + §8 浏览器验收全绿(订阅机制被真机证明)。
1. 机械剥离:40 文件 87 处 `languageVersion` 引用已在 R3 随批清零,此处断言 grep=0;60 个 useAppLanguage 消费文件中,58 个的导入移除(其重渲染职责已由钩子接管),仅保留 LanguageSetting.tsx 与 src/index.tsx:657(主题切换)。
2. `src/i18n/index.tsx`:`useAppLanguage` 返回值删 `version` 字段(导出签名收窄);保留 language/setLanguage。**不删函数**——它是应用自己的切换 API(ensureLanguageLoaded/持久化/html lang 都在里面)。
3. preflight 裁定:**保留冻结检查**(i18n.t+languageVersion 规则)——豁免面(§2 的 ~440 处全局调用)仍在它的管辖下,且若未来有人在组件里重新写全局 i18n.t 进 memo,它是唯一拦截;半接线臂检查同理保留。新增规则见 P1。
4. **P1 守卫扩展(与 P2 同批或先行)**:preflight 增第五检查——useMemo 体内含裸 `t(` 且 deps 无 `t` → 旗标(迁移世界的 F-05 等价物);commit-gate G3 增打印 `+.*useTranslation\(` 与 `-.*i18n\.t\(` 两数。两者均 prove-fail 后上岗(97 纪律)。

## 8. 浏览器验收协议(P3 终验 + 每 3-4 批抽验)

**通过判据:会话中切 zh 不刷新页面,全部挂载面实时翻转**——这是冻结类首次成为可测的一等验收项(迁移前该场景结构性不可修)。

逐页域(路由实取自 src/index.tsx:204-464):`/`(工作台)、`/dashboard`、`/chat/:id`、`/welcome`、`/settings`(含集成/远程子页)、`/costs`、`/login`、`/editor/:workflow` + editor 子路由(assets/collections/examples/tutorials/models/packages/workspaces/graph/chain)、`/timeline/:id`、`/sketch/:id`、`/studio*` 五页、miniapp `/miniapp/:id`、`/a/:token`、`/share/:token`、`/oauth/consent`。

每域步骤(lasso 真实浏览器,遵循 [[browser-ops-via-lasso]] / [[lasso-real-browser-test-mandatory]]):
1. en 态进入页面,截图留档。
2. Settings→Language 切 zh-CN(**不 reload**);等懒加载落地。
3. 页面 innerText 提取 Latin 行(95 §F-09 页驱动法,精确可 grep)对照 §2 豁免台账——非豁免英文行 = FAIL。
4. **重点冻结旧案面**:timeline Inspector / chat composer placeholder / ModelList / setup IdeaStep 选项表 / ExportVideoDialog——必须实时翻转。
5. 控制台零错误(钩子违规 = 立即崩溃,此处兜底)。
6. 切回 en 复原确认。结果按批登记 B-台账。

## 9. 回滚策略

- 每批独立 commit、目录集不相交 → **单批回退 = `git revert <批 commit>`,零跨批耦合**(无词典/共享文件)。
- B0 试点若暴露变换器缺陷:仅 50 文件,revert 后修脚本重跑,不影响主仓。
- P2(计数器退役)单独 commit,浏览器验收若发现订阅漏洞可独立 revert 恢复 version 机制(60 个消费文件的重渲染兜底回归)。
- 全战役在 feat/i18n-zh 分支推进,main 合并前整体可弃。

## 10. 工作量估计

- 变换本体:脚本秒级/批(95 §5 规则 6 单遍先例 2250 文件 2.7s);人工集中在 R2 十六文件、多组件文件抽检、导入清理——每批 0.5-1h。
- 每批门禁墙钟:G2 全量 tsc ~3min(F-06 已记录)+ preflight 秒级 + jest src/i18n ~24s + 异步本批 jest 5-15min(不阻塞)。
- **单批 agent 时间 1.5-2.5h**(含台账登记);18 批 × 4 并行 agent ≈ 5 波 ≈ **8-13h 墙钟**;加 B0 试点复盘、P1-P3 后置阶段(守卫 prove-fail + 计数器退役 + 15 页域浏览器终验 ~3-4h)→ **全程约 2 个工作日**。参照先例:d4 单 worktree 331 文件/920 站点、d3 249 文件均单批完成。

## 附:与守卫/台账的衔接承诺

- 95 登记表:每批完成后登记(commit+文件数+机械计数+豁免增量),改代码不记=流程违规。
- 97 台账:本迁移 = F-11 偏差的根治项;P1 守卫扩展、preflight 保留裁定均回写 97;F-12 处置段补"迁移完成"闭环。
- 守卫零改动承诺:死键守卫、G4、奇偶校验全程不改(完全限定键的收益,§1);改动仅限 P1 的**增项**。
