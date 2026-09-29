# B · 风险登记册(useTranslation 全量迁移 · 隔离对抗审计)

> 审计身份:独立对抗审计 agent,未读 `A-迁移方案.md`(隔离要求)。全部结论来自对
> 本仓源码、已安装依赖 dist 源码、守卫脚本与 director/97 事件台账的一手取证。
> 只读审计,唯一产物即本文件。

## 0. 审计基线(实测数字,非声明)

| 项 | 实测值 | 取证方法 |
|---|---|---|
| 分支 | `feat/i18n-zh` | `git branch --show-current` |
| 已装 react-i18next | **17.0.15**(根 node_modules) | `node_modules/react-i18next/package.json` |
| 已装 i18next | **26.4.2**;React 19.2.7 | 同上 / web/package.json |
| `i18n.t(` 调用位(非测试) | **5,375 处 / 858 文件**(tsx 4,949 + ts 426) | grep 排除 `__tests__`/`.test.` |
| 现有 useTranslation 使用 | 仅 1 文件(LanguageSetting.tsx) | grep |
| 原始 `i18n` 实例导入 | **1,090 处** | import 面统计 |
| useAppLanguage 导入 / `languageVersion` 位 | 61 文件 / **87 处**(非测试) | grep |
| 类组件用 i18n.t | **4 个**(见 R6) | grep `extends (React.)?(Pure)?Component` |
| 非组件 .ts 目录分布 | hooks 48 文件、stores 17、lib 10、utils 7、config 4、serverState 3(合计 426 调用位) | 逐目录 grep |
| memo(/forwardRef( 包裹组件的 i18n.t 文件 | **226 文件** | grep |
| 组件起始与首个 i18n.t 之间含 `return` 的作用域 | **~410 处**(早退地雷面,见 R5) | 扫描器 |
| 动态模板键 `` i18n.t(`ns:x.${…}`) `` | **70 处** | grep |
| getByText/toContainText 断言(默认英文不变量) | **1,326 处** | grep src+tests |
| jest 对 i18n / react-i18next 的模块 mock | **0 处**(无 mock 波) | grep `jest.mock` |
| SSR / electron / mobile 引用 web/src/i18n | **0**(无 renderToString/hydrateRoot;electron 无 i18n 导入;mobile 仅注释级"adapted from") | grep |
| 首参缺 ns 前缀的 `i18n.t("…")` | **0 处**(全部全限定 `ns:key`) | 正向+反向 grep |

---

## 1. 库行为裁定(问题 4 的实证答案)

以下结论读自**已安装** react-i18next 17.0.15 `dist/es/` 与 i18next 26.4.2 `dist/esm/` 源码,
非官方文档转述。

### 1a. `changeLanguage` 触发 → 订阅组件重渲染?**是**

- `node_modules/react-i18next/dist/es/defaults.js`:默认 `bindI18n: 'languageChanged'`。
- `useTranslation.js:47-63`:`subscribe` 在 `i18n.on('languageChanged', wrappedCallback)`
  上注册,回调先 `revisionRef.current += 1` 再触发 `useSyncExternalStore` 重取快照。
- `getSnapshot`(65-88 行):`revision` 变化 → 新建 `i18n.getFixedT(currentLng, …)` →
  新 `t` → 返回数组身份变化 → 组件重渲染。
- `node_modules/i18next/dist/esm/i18next.js:2024`:`changeLanguage` 的 `done()` 内
  **无条件** `this.emit('languageChanged', l)`——**同语言再触发也会发射**(无相等性短路)。
  现行 R6-7 再触发机制(`web/src/i18n/index.tsx:95-100`)对 hook 订阅者同样有效。

### 1b. `addResourceBundle` 追加命名空间(无语言变化)→ 重渲染?**否。这是真窟窿**

- `i18next.js:401`(ResourceManager):`addResourceBundle` 只在 **store** 上
  `emit('added', …)`,主实例不发射 `languageChanged`。
- react-i18next 默认 `bindI18nStore: ''`(defaults.js 第 5 行)——**不订阅任何 store 事件**。
- 因此:组件在 zh 包落地前挂载 → 用旧快照(英文回退)渲染 → `addResourceBundle` 静默入包
  → **没有任何事件推动它重渲染**。挂载组件停留在英文,直到下一次 languageChanged 或其它
  状态变化。这与 boot 竞态窗口完全重叠:
  - 恢复 zh 的会话:`i18n/index.tsx:118` 模块作用域发起 `ensureLanguageLoaded`,
    13 个命名空间 `await import` 逐个解析(13 个异步 chunk,窗口=网络往返×13);
    React 在此窗口内挂载(boot splash `index.tsx:676/693` 即在此时渲染)。
- **量化**:858 文件 / 5,375 位全部暴露于该窗口;受影响会话=localStorage 恢复 zh 的全部启动。
- **修复裁定(方案必须采用其一并登记)**:
  1. **保留现行 changeLanguage 再触发**(index.tsx:95-100)——已验证对 hook 订阅者有效,
     是最小改动;**注释必须改写**(R15:现注释称其为 raw-i18n.t 消费者而设)。
  2. 备选/加固:`init({ react: { bindI18nStore: 'added' } })` 使 store 'added' 事件也驱动
     重渲染;代价=测试内 addResourceBundle 清理也会全订阅者重渲染,须专项评估,禁顺手加。
- **"传 ns 数组让 hook 等待"在本仓配置下是无效方案**:i18next.js:2133-2137
  `hasLoadedNamespace` 在「无 backend 且 `options.resources` 已设且未设
  `partialBundledLanguages`」时**恒返回 true** → `ready` 恒真 → hook 从不等待、从不挂起。
  任何以 ns 参数解决 boot 竞态的设计都不成立。

### 1c. 其它库事实

- `useTranslation` 走 `use-sync-external-store/shim`(useTranslation.js:2);该包
  exports `default → shim/index.js`(CJS),jest `transformIgnorePatterns` 无需放行。
- `props` 缺省 `{}` 每渲染新建 → `i18nOptions` memo(33-37 行)deps 含 `props` →
  `subscribe`/`getSnapshot` 每渲染重建(useSyncExternalStore 每渲染重订阅)。快照值经
  `snapshotRef` 缓存比较,不会无限重渲染,但数千订阅点上有每渲染常量开销(见 R10)。
- App 根已包 `<I18nextProvider i18n={i18n}>`(index.tsx:665),hook 经 context 取到
  同一实例;`defaultNS` 回落到 init 的 `'common'`。
- `USE_T_BEFORE_READY` 警告路径因 ready 恒真不会触发。

---

## 2. 风险登记

严重度:P0=可静默产出用户可见破损或构建破坏;P1=特定条件下破损或守卫失效;P2=质量/流程债。

### R1 · 懒加载 zh 包的重渲染依赖(boot 竞态)
- **类**:i18n 运行时 / 迁移语义
- **证据**:`web/src/i18n/index.tsx:86-101`(ensureLanguageLoaded + R6-7 再触发)、
  `index.tsx:118`(模块作用域发起)、boot splash `web/src/index.tsx:676,693,715,730`;
  库侧证据见 §1b。
- **严重度**:**P0**
- **强制缓解**:①迁移不得删除/改写 changeLanguage 同语言再触发;②补一条今天不存在的回归
  验证:zh 恢复会话冷启 → 无任何用户交互 → 懒加载完成后界面变中文(jest 或浏览器脚本);
  ③禁以"hook 自动订阅 languageChanged"为据删再触发——它只覆盖语言变化,不覆盖 addResourceBundle。
- **验证**:专项测试/浏览器时序脚本;删码探针(移除再触发必须红)。

### R2 · 守卫锚点:全限定 `ns:key` 字面量必须原样保留
- **类**:守卫兼容
- **证据**:死键守卫 `web/src/i18n/__tests__/i18n.test.ts:176`
  (`fullLiteralRefs` 正则匹配源中任意位置的 `ns:key` 字面量,与调用形式无关)+
  276-303 行 DYNAMIC_SUBTREES 白名单(模板键);G4 悬空引用守卫
  `web/scripts/i18n-commit-gate.mjs:103`(同样只认带引号的 `ns:path` 字面量)。
  实测现状:0 处缺前缀调用 → `t("editor:ui.foo")` 字面量不动则两守卫原样绿。
- **严重度**:**P0**(改形=守卫整片红或静默弱化)
- **强制缓解**:机械变换**仅** `i18n.t(` → `t(`,键实参逐字节不动;**禁止**
  `useTranslation("editor") + t("ui.foo")` 缩键形(那会让死键守卫把全部 editor:* 叶报死、
  G4 同理);70 处模板键保留反引号形;LanguageSetting.tsx:17-27 是已验证的合法定式
  (`useTranslation("settings")` 且键仍全限定,`useMemo` deps `[t]`)。
- **验证**:迁移每批后死键守卫+parity+G4 全绿且**词典零改动**;若守卫红了,先怀疑键形被改。

### R3 · preflight 守卫对 `i18n.t(` 锚定 → 迁移后失明,而冻结缺陷类以新形态存续
- **类**:守卫兼容 / 缺陷类演化
- **证据**:`web/scripts/i18n-preflight.mjs:126`(useMemo 体 `/i18n\.t\(/` 才检查 deps)、
  `:152-159`(半接线三元臂行过滤 `ln.includes("i18n.t(")`)。
- **机制**:迁移后 memo 体调用的是闭包里的 `t`(旧快照的 fixed-t,**闭包绑定旧语言**)——
  deps 缺 `t` 的 useMemo 依旧冻结在旧语言,与今天缺 `languageVersion` 同构;半接线三元臂
  (`cond ? t(...) : "裸英文"`)同样存续。两守卫因文本锚点失配而**双失明**。
- **严重度**:**P0**(守卫先撤等于裸奔迁移)
- **强制缓解**:守卫升级**先于**第一批迁移落地:①冻结检查扩为
  `/i18n\.t\(|(?<![\w.$])t\(/` 双形,deps 判定加入 `t`(或保留 languageVersion 双认);
  ②半接线臂检查同步扩形;③各配 prove-fail 探针(97 F-07 教训:守卫自身误报会钝化探针)。
- **验证**:prove-fail 红/绿各一次;对已迁文件扫描输出零漏报抽检。

### R4 · 分批期版本计数器退役时序(部分迁移 = 冻结混合语言 UI)
- **类**:迁移时序
- **证据**:61 文件导入 useAppLanguage、87 处 `languageVersion` 依赖(实测);97/F-11
  ("59 文件用版本计数器")、d5 批"32 处新 useAppLanguage().version"。
- **机制**:任何未迁组件若在其 memo 树上失去 version 触发(被提前剥离),又尚未接 hook,
  会话中途切语言后**冻结在旧语言**——正是 F-05/F-06 抓过 37 处的缺陷类,但这次是系统性制造。
- **严重度**:**P0**
- **强制缓解**:①迁移期间 version 机制与 hook 订阅**并存**,不删不剥;
  ②`version` 字段(以及 useAppLanguage 中仅为其存在的重渲染语义)的删除是**独立收尾批次**,
  前置条件=100% 渲染位迁移完成 + 浏览器实测会话中途 zh↔en 切换全路由无冻结;
  ③`useAppLanguage` 本身保留(language/setLanguage 是切换器必需;index.tsx:657 用 language)。
- **验证**:收尾批次前跑中途切换浏览器脚本(页驱动,F-09 法);grep 断言余量与登记册一致。

### R5 · Rules-of-Hooks 插入位地雷(批量工具的高危面)
- **类**:React hooks 法则
- **证据**(全部实测):
  - 组件起始到首个 i18n.t 之间存在 `return` 的作用域 **~410 处**(hook 必须插在守卫
    return 之前;例:`MessageView.tsx:164` `return null`、`Model3DViewer.tsx:434,483`、
    `ConnectableNodes.tsx:471` `if (!menuPosition || !isVisible) {return null;}`);
  - **226 文件**的组件以 `const X = memo(function X() {…})` / `forwardRef(` 包裹
    (如 `ExternalMcpServersSection.tsx:299`)——"在 const 行后插入"会落进**调用实参里**,
    与 F1 导入注入同类;
  - 回调/内嵌组件:map 回调内 i18n.t(hook 必须进**外围**组件)、文件内二级组件
    (`SelectField.tsx:111 SelectFieldInternal`、`ApplicationListPanel.tsx:105` 等);
  - 返回 i18n.t 的**组件内辅助函数**:`MediaChatComposer.tsx:706`
    (`if (!isModelSelected(chatModel)) return i18n.t(…)`)——hook 不能进辅助函数;
  - 递归/泛型组件面未逐一手查,登记为批量工具必须 AST 定界。
- **最危 10 文件**(证据可复核):`src/index.tsx`(boot/provider 根,R6-7 锚,建议最后迁)、
  `components/chat/message/MessageView.tsx`(大跨度+早退+内嵌 ToolIcon:346)、
  `components/asset_viewer/Model3DViewer.tsx`(类组件+早退+动态键+40+ 位)、
  `components/context_menus/OutputContextMenu.tsx`(45-527 跨度)、
  `components/context_menus/ConnectableNodes.tsx`(45-493+守卫 return:471)、
  `components/chat/composer/MediaChatComposer.tsx`(62-461+辅助函数返 i18n.t:706)、
  `components/storyboard/StoryboardBoard.tsx`(84 位+模块表 labelKey 对:181-187)、
  `components/sketch/SketchLayersPanel.tsx`(63 位+模块级辅助函数群)、
  `components/menus/APIKeysTab.tsx`(58 位)、
  `components/timeline/Inspector/ClipMaskMatte.tsx`(45 位+模块函数 versionLabel:407)。
- **严重度**:**P0**
- **强制缓解**:①插入点=**组件函数体第一条语句**(AST 定界:函数声明/memo/forwardRef 包裹体
  内、任何 return 之前),禁按"首个 i18n.t 行"定位;②每文件一个组件一个 hook,
  内嵌组件各插各的;③最危 10 文件人工迁移+双人复核,不进自动批。
- **验证**:每批 lint(react-hooks 规则)+ tsc;抽跑 dev 页面无 hooks 报错。

### R6 · 类组件:useTranslation 不可用,必须豁免
- **类**:React 形态
- **证据(穷举)**:`SearchErrorBoundary.tsx:61`(i18n.t 于 107,110)、
  `common/PanelErrorBoundary.tsx:20`(58)、`timeline/preview/PreviewRecovery.tsx:41`
  (98,172,180,181)、`asset_viewer/Model3DViewer.tsx:294`(ModelErrorBoundary)。
  注:根 `src/ErrorBoundary.tsx` 是 **React.FC**(175 行),非类,不在豁免列。
- **严重度**:**P1**
- **强制缓解**:4 个类保持 raw `i18n.t`(今天它们的字符串在会话中途切换时同样不刷新,
  行为不变),文件头注释登记豁免;禁为迁它们引入 HOC 包裹(范围蔓延)。
- **验证**:豁免登记册与 `grep -L useTranslation` 于这 4 文件一致。

### R7 · 非组件面豁免清单(426 个 .ts 调用位)+ 模块表模式
- **类**:非 React 作用域
- **证据**:stores 17 文件(如 `TimelineStore.ts`、`StoryboardGenerationStore.ts`——
  zustand action 内 i18n.t,常用于通知文案)、lib 10、config 4、utils 7、serverState 3;
  纯函数模块:`chat/message/toolCallPhrase.ts:204+`(8 位)、
  `appbuilder/i18nAttrs.ts:391,404`(tAttr/tAttrTpl)、`costs/costLine.ts:26`;
  **模块级表工厂**:`chat/composer/PermissionSelector.tsx:22`(`const modes = (): ModeItem[] => […]`)、
  `ModeChips.tsx:87`(referenceAudioOptions 同形);
  **labelKey 双表**(禁动):`StoryboardBoard.tsx:181-187`(CLIP_TASK_LABELS/…_KEYS)、
  d1/d2/d4 批已建的目录表(data_types/snippetMetadata/shortcuts 等)。
- **严重度**:**P1**
- **强制缓解**:①store/lib/config/utils/serverState 的 i18n.t **豁免不动**(调用期活解析,
  语言事件由消费端 hook 触发重渲染即可);②48 个 hooks 文件**可**合法迁移(hook 调 hook),
  按文件登记去留;③表工厂保持工厂形或转 labelKey 形,**禁**在模块作用域直呼 hook;
  ④局部包装 helper(vt/act/dm/st/t18/settingsDocsLabel/settingsTabLabel/tabTypeName/
  aspectOptionLabel 等 ≥10 文件)统一裁定:保留全局 i18n.t 并入豁免册(推荐,改动最小),
  或显式传 t(每处调用点都改)。两种形态**只能选一种并逐文件登记**。
- **验证**:迁移完成后余量 `grep "i18n\.t("` 逐文件等于登记册;守卫扫描面与豁免面互洽。

### R8 · 批量机械编辑自伤史(F-01..F-12 实录,本战役已四次踩坑)
- **类**:工艺
- **证据**:97/F-06(导入注入多行 import 花括号内=构建破坏,且错误数凑巧等于基线漏检)、
  F-02(正则改写 4 起自伤:85 处多余 `}`、导入深度错×2、键名复制重复)、F-10(管道吞退出码)、
  F-07(启发式守卫 129 误报+13 漏网)、F-01(jest 全套串行拖垮批次)。
- **严重度**:**P0**(历史已证明会复发)
- **强制缓解**:①**每批必跑** G1(esbuild 逐文件语法,含 untracked)+ G2(tsc 错误**集合**
  对基线快照双向 diff)——两闸已在 `web/scripts/i18n-commit-gate.mjs`,迁移不得绕行;
  ②批量改写用 AST 或锚定校验插入(导入插在 import 块尾、hook 插函数体首句),
  生成后逐文件查杂散控制字符与多余括号(仓库规范既有要求);
  ③验证链 `set -o pipefail` + 显式 echo 退出码(F-10);④扫描器单遍化,禁 per-string×per-file
  双层循环(F-02 的 180s 超时);⑤G2 全量 tsc ~3min/次,按 F-06 待观察项考虑增量但仍不可省。
- **验证**:每批 commit 前闸门输出留档;prove-fail 探针定期回灌(坏语法/坏类型各一)。

### R9 · jest 从未渲染过 useTranslation(jsdom 金丝雀缺口)
- **类**:测试
- **证据**:全仓 **0** 处 `jest.mock("react-i18next")` / `jest.mock("…/i18n")`(无 mock 波,
  是利好);6 个测试文件直接导入 `../i18n` 的 `changeAppLanguage/resetI18nForTest/i18n`
  (模块本体不迁移,不受影响);但**没有任何现存测试渲染过含 useTranslation 的组件**
  (LanguageSetting 无测试覆盖)——React 19 + ts-jest CJS + `use-sync-external-store/shim`
  的组合在本仓 jest 环境从未验证。react-i18next 经 `require` 条件解析到
  `dist/commonjs`(package.json exports),`transformIgnorePatterns` 无需改。
- **严重度**:**P1**
- **强制缓解**:金丝雀批——先迁一个小域(如 ui_primitives 的 2-3 个按钮件)+ 该域 jest 全绿
  + 一个显式渲染断言(中文切换后文案变化),证明 hook 在 jsdom 可跑,再放批。
- **验证**:金丝雀批 PR 内含新测试;全套 `npm test` 于 web 无新增红。

### R10 · 性能:全订阅者同步重渲染 + 每渲染订阅重建
- **类**:性能
- **证据**:useTranslation.js:47-63(每挂载点一个 languageChanged 监听)、89-93
  (useSyncExternalStore)、33-37(props 缺省 `{}` → i18nOptions memo 每渲染失效 →
  subscribe 每渲染重建/重订阅);§1b(每次 languageChanged=全部挂载订阅者一遍同步渲染)。
  频率低(用户切换+boot 再触发各 1-2 次),但编辑器页 ~2000 DOM 行、潜在数千挂载订阅点,
  单次切换=一次全树级同步渲染。现状对照:今天靠 61 个 version 消费者子树重渲染覆盖面
  (且 F-05 证明覆盖不全,37 处真冻结)——迁移把触发面从"59 个根"扩为"每个订阅点",
  单次成本可能上升,冻结类缺陷则结构性消失。bundle 影响为零(react-i18next 已在产物中)。
- **严重度**:**P2**(频率低;需数据而非直觉)
- **强制缓解**:迁移前后各测一次:①语言切换长任务(Performance trace,记录长任务数/时长);
  ②editor 路由 INP 不回退;③初始 JS ≤250KB gz 预算不破。数据落 director/perf-baseline 体系。
- **验证**:对比报告入档,超标即调(如错峰/分域订阅)。

### R11 · G3 声明计数器失锚
- **类**:流程/守卫
- **证据**:`i18n-commit-gate.mjs:75` 只数 `^\+.*i18n\.t\(` 新增;迁移批的 diff 全是
  `i18n.t(` **删除**与 `t(` 新增,G3 输出恒 0——反虚报闸(4 起虚报史的对策)空转。
- **严重度**:**P2**
- **强制缓解**:G3 改锚为「本批 `useTranslation(` 接入文件数 + `t(` 接线数 −`i18n.t(` 余量」
  的机械 grep 三元组,commit message 照贴实数。
- **验证**:prove-fail——虚报声明与 grep 实数不符时流程必须拒绝。

### R12 · 默认英文不变量(1,326 断言 + e2e 选择器 + 品牌词表)
- **类**:回归面
- **证据**:i18n/index.tsx 头注释("默认英文必须保持英文:≈1.5k getByText 断言+e2e 选择器+
  BRAND.md 词表");实测 getByText/toContainText 1,326 处;`web/tests/smoke/pageLoadHelpers.ts`
  依赖英文文案。
- **严重度**:**P1**
- **强制缓解**:迁移是纯重绑定,en 渲染输出必须逐字节不变;每批全 jest;收尾跑页驱动扫
  (classify_sweep.py + expected-english.json,英文行零新发现)+ e2e smoke。
- **验证**:抽 3 个页面迁移前后 innerText diff 为空;e2e smoke 绿。

### R13 · 流程登记同步(95/97)
- **类**:流程
- **证据**:director/95 使用方法明文"变更接线状态必须同步本表(改代码不记=流程违规)";
  97 F-12 立项依据落档。
- **严重度**:**P2**
- **强制缓解**:每批在 95 登记(域/文件数/接线数/commit);97 追加迁移战役条目;
  守卫层裁撤(见验收条件 16)单独留痕。
- **验证**:批 commit 与 95 行一一对应。

### R14 · 动态模板键与局部 helper 的处置一致性
- **类**:模式决策
- **证据**:70 处 `` i18n.t(`ns:x.${…}`) ``(死键守卫靠 DYNAMIC_SUBTREES+templateLeafRefs
  佐证);≥10 文件局部包装 helper(见 R7)。迁移若把模板键改成 `t(prefix + key)` 拼接串,
  守卫的引号感知扫描器会失配。
- **严重度**:**P1**
- **强制缓解**:模板键保持反引号原形仅换函数名;helper 处置按 R7④ 单形态裁定并登记。
- **验证**:守卫全绿 + 模板键 70 处 grep 计数不变。

### R15 · i18n/index.tsx 自身注释与 boot splash 的同步
- **类**:文档/语义漂移
- **证据**:index.tsx:95-100 注释明言再触发"为 raw i18n.t 消费者(boot splash)而设";
  迁移后 boot splash(index.tsx:676-768)成为 hook 订阅者,注释若不改,后续维护者会以
  "raw-t 已不存在"为由删再触发 → 复发 R1。
- **严重度**:**P1**
- **强制缓解**:再触发保留时注释改写为"为 useTranslation 订阅者跨越 addResourceBundle
  静默入包而设(库默认 bindI18nStore='' 不订阅 store)";index.tsx 排最后迁并浏览器双项验证
  (boot 竞态 + 中途切换)。
- **验证**:code review 对照 §1b 结论;R1 专项测试仍绿。

### R16 · 顺手改 init 选项的陷阱
- **类**:配置
- **证据**:§1b——`partialBundledLanguages: true` 会让 hasLoadedNamespace 变"诚实"
  (boot zh 恢复期 ready=false,`notReadyT` 回 defaultValue/raw key);
  `bindI18nStore: 'added'` 放大重渲染面(R10)。
- **严重度**:**P2**
- **强制缓解**:init 选项变更独立于迁移批评审,禁与接线批混提。
- **验证**:迁移 PR diff 不含 `web/src/i18n/index.tsx` init 块(除 R15 注释)。

---

## 3. 方案必须满足的硬性验收条件(执行前逐条核对,任一不满足即方案退回)

1. **字面量不变式**:全部 `ns:key` 全限定字面量逐字节保留(禁 ns 参数化缩键);70 处模板键
   保留反引号形;机械变换仅为 `i18n.t(` → `t(`。校验:死键守卫+parity+G4 全绿且词典零改动。
2. **R6-7 再触发保留**:`ensureLanguageLoaded` 的同语言 changeLanguage 再触发原样保留,
   注释按 R15 改写;并新增"zh 恢复会话无交互冷启→自动变中文"的回归测试(今天不存在)。
3. **ns-await 方案禁用依据落档**:方案文本必须引用 i18next.js:2133-2137
   (resources+无 backend → hasLoadedNamespace 恒真),明确"传 ns 让 hook 等待"不可行,
   防止后续"优化"复活该路线。
4. **preflight 先行升级**:冻结 useMemo 检查与半接线臂检查扩至 `t(`/`i18n.t(` 双形,
   deps 判定认 `t`;两检查各有 prove-fail 探针(红/绿各证一次)后,才允许第一批接线。
5. **G3 改锚**:commit 声明计数改为机械 grep 三元组(接入文件数/t( 接线数/i18n.t 余量)。
6. **豁免登记册先建后迁**:4 个类组件、426 个 .ts 非组件位(stores/lib/config/utils/
   serverState)、模块表/表工厂/labelKey 表、≥10 个局部 helper——逐文件登记"豁免/迁移/
   传 t 改造"三态之一;收尾时余量 grep 与登记册逐文件相等。
7. **插入纪律**:hook 插组件函数体首句(AST 定界:memo/forwardRef 包裹体内、任何早退
   return 之前);内嵌组件各插各的;辅助函数/回调/map 体内禁插。最危 10 文件(R5 清单)
   人工迁移+复核,不进自动批。
8. **每批三闸**:G1 esbuild 语法(含 untracked)+ G2 tsc 错误集合对基线 + lint;
   验证链 `set -o pipefail` 并显式打印退出码(F-10);扫描器单遍(F-02)。
9. **金丝雀批先行**:小域 2-3 文件迁移+jest 全绿+新增 hook 渲染断言,证明 jsdom 下
   useTranslation 可跑(现存 0 测试覆盖该路径)后,方可放批。
10. **批序约束**:`src/index.tsx`(boot/provider 根)最后迁;每批后浏览器 zh↔en 中途切换
    逐路由抽验(页驱动法);英文不变量抽 3 页 innerText diff 为空。
11. **版本计数器退役时序**:87 处 languageVersion 与 61 文件 useAppLanguage 在迁移期原样
    保留;`version` 字段删除为独立收尾批,前置=100% 迁移 + 浏览器实测中途切换全绿;
    `useAppLanguage` 的 language/setLanguage 永久保留。
12. **性能基线**:迁移前后语言切换长任务与 editor INP、初始 JS ≤250KB gz 三项数据落档对比。
13. **流程同步**:每批 95 登记表 + 97 台账留痕;改代码不记=流程违规。
14. **init 选项冻结**:迁移 PR 不改 `web/src/i18n/index.tsx` 的 init 配置块
    (partialBundledLanguages/bindI18nStore 等变更须独立评审,防 notReadyT 回键与重渲染放大)。
15. **错误边界豁免**:SearchErrorBoundary/PanelErrorBoundary/PreviewRecovery/ModelErrorBoundary
    4 个类组件保持 raw i18n.t 并注释登记;不引入 HOC 包裹。
16. **守卫退役后置**:preflight/死键/G4 守卫保留至迁移完成且连续两轮页驱动扫零发现后,
    经独立评审方可裁撤(F-11"删除守卫层"收益不得前置兑现;R3 证明迁移本身会新生冻结形态)。

---

## 4. 审计方法与局限

- 已读:i18n 模块全量、两守卫脚本全量、react-i18next 17.0.15 useTranslation/defaults/utils/
  context dist 源、i18next 26.4.2 相关段、jest.config.ts、95/97 台账、逐目录 grep 取样与
  410/226/858/5375 等机械计数。未读:A-方案(隔离);未逐行审 858 文件(以模式取样+计数定界)。
- 410"早退"计数是启发式上界(含非守卫 return),用于定界批量工具风险面,非精确缺陷数。
- 库行为结论仅对本仓已装版本(17.0.15/26.4.2)负责;升级 react-i18next 需重验 §1。
