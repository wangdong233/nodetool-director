# C · 合并裁定(A 方案 × B 风险登记册 → 执行指令)

> 编排者合并文档,2026-09-29。A(迁移方案)与 B(风险登记册)互相隔离产出;本文件裁决冲突、固化执行序。**执行以本文为准。**

## 一、冲突裁决(5 项)

| # | 冲突 | 裁定 | 依据 |
|---|---|---|---|
| 1 | P1 守卫升级时序:A"与 P2 同批或先行" vs B 条件 4"先于第一批" | **B 胜:P1-PRE 先行**——preflight 双形扩锚+G3 改锚+R6-7 回归测试全部 prove-fail 后才放 B1+ | B-R3:迁移后冻结类以"旧 fixed-t 闭包"形态存续,守卫先撤=裸奔 |
| 2 | 类组件:A 改 withTranslation HOC(2 文件)vs B 保持 raw+禁 HOC(4 文件,条件 15) | **B 胜:4 个类组件(SearchErrorBoundary/PanelErrorBoundary/PreviewRecovery/ModelErrorBoundary)保持 raw + 头注释豁免** | B 逐行枚举出 A 漏计的 2 个;HOC=范围蔓延;错误边界今天中途切换本就不翻(行为不变) |
| 3 | 插入定界:A-R7 仅 memo vs B 增 forwardRef(226 文件含两类包裹) | **B 胜:R7 扩为 memo/forwardRef 包裹体内首句** | B-R5 实测;"const 行后插入"落进调用实参与 F1 同类 |
| 4 | 最危文件:A 无特殊处置 vs B"最危 10 文件人工迁+复核,不进自动批" | **B 胜:采纳清单**(MessageView/Model3DViewer/OutputContextMenu/ConnectableNodes/MediaChatComposer/StoryboardBoard/SketchLayersPanel/APIKeysTab/ClipMaskMatte/index.tsx) | B-R5 逐文件证据 |
| 5 | 计数基线:A 816 文件/5600 位(含测试)vs B 858 文件/5375 位(排测试) | **B 口径为准**(排测试、逐行核验类组件) | B 方法更严 |

## 二、固化执行序

```
P1-PRE(先行,prove-fail 全过才放行)
  ①preflight 冻结检查扩双形 /i18n\.t\(|(?<![\w.$])t\(/,deps 认 t;prove-fail 红/绿各一
  ②preflight 半接线臂检查同步扩形;prove-fail
  ③commit-gate G3 改锚:打印三元组(useTranslation 接入文件数/t( 接线数/i18n.t 余量);prove-fail
  ④R6-7 注释改写(B-R15 措辞)+ 新增回归测试:useTranslation 组件渲染后 changeAppLanguage 切 zh
    不重挂载文案翻中文(证明再触发覆盖钩子订阅者)+ 删码探针(移除再触发必红,验后复原)
  ⑤豁免登记册先建(4 类组件+426 .ts 位+模块表/表工厂/labelKey+≥10 局部 helper,三态逐文件登记;
    局部 helper 统一裁定:保留全局)
B0 金丝雀+试点(ui_primitives):先 3 文件 canary + 新增 hook 渲染断言测试(jsdom 首证)→ 域内
  其余 47 文件;全门禁+浏览器中途切换抽验;复盘后才放 B1+
B1-B16 四路并行 worktree(文件集不相交;最危 10 文件扣出)
B17 壳层+最危 10 文件人工迁(src/index.tsx 绝对最后)
P2 版本计数器退役(前置:100% 迁移+浏览器中途切换全路由绿;独立 commit 可回滚)
P3 终验:15 页域页驱动扫+冻结旧案五面实时翻转+性能基线三数据落档+台账闭环
```

## 三、硬性验收条件 = B §3 十六条全文并入(执行前逐条核对,任一不满足退回)

(全文见 B-风险登记册.md §3;此处不复制,以 B 文件为准。)

## 四、关键不变式(两 agent 一致,执行期冻结)

1. `ns:key` 全限定字面量逐字节不动;70 处模板键保持反引号形;词典 JSON 全程零改动
2. R6-7 同语言 changeLanguage 再触发**承重墙**,迁移期禁删禁改逻辑(仅注释改写)
3. init 配置块冻结(partialBundledLanguages/bindI18nStore 变更独立评审)
4. 事件相位(useCallback/useEffect 体)保留全局——钩子只进渲染相位
5. version 机制迁移期与钩子并存,退役独立收尾
