# E — i18n.t 残留逐文件对账(B-6 收口条款,终审条件 4,2026-09-30)

> 复核人:residual-reconciliation agent(只读源码,仅写本文件)。
> 逐文件表见 §6;SUSPECT 清单见 §3;§9/注释位抽检结论见 §4/§5。

## 0. 结论(TL;DR)

- 非测试 `i18n.t(` 共 **640 行 = 注释 38 + §9 参数默认 33 + 代码位 569(220 文件)**。
- 569 个代码位**全数落入 D 登记册豁免类**,余 **6 处 SUSPECT(2 文件)** 为渲染相位全局读、无豁免类覆盖,待编排者接线(§3)。
- 脚手架机械口径 641/570/221 与本复核差异 3 项,全部定位到 file:line(§1)。

## 1. grep 基准与脚手架对账修正

独立复算(非测试 = 排除 `*.test.*` 与 `__tests__/`;按"含 `i18n.t(` 的行"计,与脚手架同口径):

| 口径 | 脚手架 | 本复核 | 差异 |
|---|---|---|---|
| 总行数 | 641 | 640 | 见下 ① |
| 注释位 | 38 | 38 | 一致 |
| §9 参数默认 | 33 | 33 | 数量一致,组成互换 1 对(②③) |
| 代码位 | 570 / 221 文件 | 569 / 220 文件 | 见下 ①②③ |

① `src/components/timeline/SourceViewerPanel.test.tsx:47` — 测试 mock(`VideoPlayer` 桩的 aria-label),脚手架误计入非测试总量;剔除(测试域,不适用 B-6)。
② `src/components/ui_primitives/RunModelButton.tsx:77` — forwardRef render 参数解构默认(`({ label = i18n.t(...) })`,tsc 可证参数列表先于函数体求值),脚手架表行计为代码位,实为 **§9**;归位后该文件代码位 0,不进 §6 表。
③ `src/components/chat/utils/threadUtils.ts:26` — 模块函数体内赋值(`text = i18n.t(...)`,非参数位),脚手架误入参数桶,实为**代码位 §2e**;补进 §6 表。
②③ 数量相抵,故 §9 总数两端同为 33。219 个共有文件逐文件计数**零差异**。

## 2. 代码位分类汇总(569 处 / 220 文件)

| D 类 | 含义 | 处数 | 文件数 |
|---|---|---|---|
| §1 | 类组件(ErrorBoundary/extends Component) | 4 | 3 |
| §2e | 模块域/模块助手(stores·lib·utils·serverState 目录豁免 + 组件目录内模块函数) | 192 | 65 |
| §3 | 模块表/表工厂/labelKey 双表 | 74 | 15 |
| §4 | 局部包装 helper(vt/act/dm/st/t18/settingsDocsLabel/tabTypeName 等,消费组件订阅覆盖) | 19 | 16 |
| §5 | 事件相位(useCallback/useEffect/handler/async/catch 体) | 264 | 126 |
| §6 | 启动面(src/index.tsx boot splash) | 8 | 1 |
| §10 | P2 永久保留(StoryboardBoard captionsByShotId / TimelineEditor tabs memo) | 2 | 2 |
| **SUSPECT** | 渲染相位全局读,无豁免类 | **6** | **2** |
| 合计 | | **569** | **220 去重文件**(混类文件每类各计一次,列内相加 230) |

另有:§9 参数默认 33 处/32 文件(§4);注释位 38 处/25 文件(§5)。§2e 内 serverState 3 文件的实测相位为 TanStack 变更回调(事件相),与 D§2 目录豁免双重成立。
登记册计数勘误:D§9 "ui_primitives 实测 17 处/15 文件" 为 B0 期估算,当前精确值 **18 处/17 文件**(§9 总量 33 不变)。

## 3. SUSPECT 清单(渲染相位全局读,编排者接线)

| 文件:行 | 证据 | 影响 |
|---|---|---|
| `web/src/components/setup/image/LookStep.tsx:280,289,291,306` | `ModelListState: React.FC`(L272-312)渲染 JSX 直读全局;该子组件自身无 `useTranslation`(文件内 L106/L320 两个组件有,均不在 ModelListState 作用域) | 未 memo,父级重渲染顺带重求值,zh 大概率落地;但覆盖靠偶然,登记册外。低危,应补接线 |
| `web/src/components/panels/PanelLeft.tsx:915(同行 2 读),927` | `MobilePanelLeft`(L860-985)渲染 JSX ariaLabel 直读全局;全组件无任何语言订阅(useTranslation/useAppLanguage 均无) | 语言切换不触发重渲染,aria-label 冻结在旧语言直至无关状态变化。应接线 |

两处均不满足 §1/§9/§10,消费组件订阅覆盖(§4 判据)亦不成立,故按审计口径列 SUSPECT。

**边界项(不计 SUSPECT,报编排者知悉)**:`web/src/components/timeline/TimelineEditor.tsx:353` — `InspectorRegion`(memo 组件)渲染体直读 INSPECTOR_TABS labelKey;该组件 **L344 已持有 `useTranslation()` 订阅**(L361 即用 `t`),语言切换必触发重渲染、L353 随之重求值,行为等价 §3/§4"订阅覆盖"族;代码内注释(L349-350)记录 r21 F-1 裁定。D§10 只登记了同文件的 memo 位(现 L436,登记册写 430/440 系行号漂移)。归类 §3,如需可并入 §10 正式登记。

## 4. §9 参数默认位(33 处/32 文件,全量核对通过)

判定:参数列表先于函数体求值,钩子 `t` 不可见;每次调用重求值,冻结风险=现状(D§9 裁定,豁免不重构)。

- src/components/appbuilder/puck/fields.tsx: L153(源码带显式 D§9 注释)
- src/components/chat/containers/ChatPanelHeader.tsx: L56
- src/components/common/LogsTable.tsx: L415
- src/components/compositor/CompositorEditorModal.tsx: L58
- src/components/costs/CostEstimateSummary.tsx: L148
- src/components/dialogs/FileBrowserDialog.tsx: L147
- src/components/entities/EntityAssetPickerDialog.tsx: L53
- src/components/model_menu/shared/ModelMenuDialogBase.tsx: L170
- src/components/node_menu/CategorySearchBar.tsx: L66
- src/components/properties/LanguageModelSelect.tsx: L38
- src/components/search/SearchInput.tsx: L146
- src/components/sketch/SketchModal.tsx: L143
- src/components/sketch/SketchRenderer.tsx: L95
- src/components/support/ReportBugButton.tsx: L24
- src/components/timeline/TimelineRenderer.tsx: L66
- src/components/ui_primitives/AudioPlayback.tsx: L48
- src/components/ui_primitives/AutocompleteTagInput.tsx: L63
- src/components/ui_primitives/CloseButton.tsx: L88
- src/components/ui_primitives/CopyButton.tsx: L102
- src/components/ui_primitives/DeleteButton.tsx: L95
- src/components/ui_primitives/DialogActionButtons.tsx: L88,89
- src/components/ui_primitives/DownloadButton.tsx: L97
- src/components/ui_primitives/EditButton.tsx: L89
- src/components/ui_primitives/HelpButton.tsx: L80
- src/components/ui_primitives/RefreshButton.tsx: L95
- src/components/ui_primitives/ResizableDock.tsx: L71
- src/components/ui_primitives/RunModelButton.tsx: L77
- src/components/ui_primitives/SearchInput.tsx: L130
- src/components/ui_primitives/SettingsButton.tsx: L90
- src/components/ui_primitives/TagInput.tsx: L147
- src/components/ui_primitives/UploadButton.tsx: L102
- src/components/ui_primitives/VideoPlayer.tsx: L202

## 5. 注释位(38 处/25 文件,全量核对通过)

37 处位于 ui_primitives(24 文件)+ `src/components/hugging_face/onboarding/onboardingCatalog.ts:144`,全部为 af89c0d38 落盘的豁免注释标记,逐条复核确为注释行(位于 JSDoc 块内),无执行语义。清单与脚手架逐条一致(38/38)。

## 6. 逐文件表(220 文件 / 569 代码位)

行号为本复核实读行号(HEAD=2238cee77)。混类文件按"类×数"展开。

| 文件 | 代码位 | D 类归属 | 行号 |
|---|---|---|---|
| src/GraphViewerApp.tsx | 1 | §5 | L288 |
| src/components/SearchErrorBoundary.tsx | 2 | §1 | L109,112 |
| src/components/appbuilder/i18nAttrs.ts | 2 | §2e | L391,404 |
| src/components/applications/ApplicationListPanel.tsx | 1 | §5 | L137 |
| src/components/audio_editor/AudioSampleEditor.tsx | 1 | §5 | L258 |
| src/components/chain_editor/ChainEditorPage.tsx | 2 | §5 | L30,38 |
| src/components/chain_editor/useChainEditorStore.ts | 1 | §2e | L357 |
| src/components/chat/ChatListPanel.tsx | 3 | §5 | L43,79,185 |
| src/components/chat/composer/ModeChips.tsx | 4 | §3 | L90,91,96,97 |
| src/components/chat/composer/PermissionSelector.tsx | 5 | §3 | L25,26,31,32,37 |
| src/components/chat/composer/voice/useVoiceInput.ts | 1 | §5 | L109 |
| src/components/chat/containers/ChatPanelHeader.tsx | 1 | §5 | L123 |
| src/components/chat/containers/ChatView.tsx | 1 | §5 | L374 |
| src/components/chat/containers/WelcomePlaceholder.tsx | 2 | §5 | L173,174 |
| src/components/chat/message/SecretRequestCard.tsx | 1 | §5 | L120 |
| src/components/chat/message/toolCallPhrase.ts | 8 | §2e | L208,209,212,213,216,217,219,221 |
| src/components/chat/utils/threadUtils.ts | 1 | §2e | L26 |
| src/components/common/PanelErrorBoundary.tsx | 1 | §1 | L58 |
| src/components/context_menus/AssetItemContextMenu.tsx | 3 | §5 | L110,112,113 |
| src/components/costs/costLine.ts | 1 | §2e | L26 |
| src/components/dialogs/FileBrowserDialog.tsx | 1 | §5 | L546 |
| src/components/dialogs/SearchProviderSetupDialog.tsx | 1 | §5 | L99 |
| src/components/graph_view/WorkflowGraphView.tsx | 1 | §5 | L156 |
| src/components/hugging_face/onboarding/HardwareCard.tsx | 4 | §2e | L51,53,55,57 |
| src/components/menus/APIKeysTab.tsx | 6 | §5 | L716,734,746,759,783,792 |
| src/components/menus/AboutMenu.tsx | 4 | §5 | L178,194,248,257 |
| src/components/menus/CommandMenu.tsx | 7 | §5 | L234,252,305,323,361,710,737 |
| src/components/menus/DefaultModelsMenu.tsx | 1 | §4 | L15 |
| src/components/menus/FoldersSettingsMenu.tsx | 1 | §5 | L175 |
| src/components/menus/GoogleWorkspaceCard.tsx | 1 | §5 | L87 |
| src/components/menus/MCPSettingsMenu.tsx | 1 | §5 | L149 |
| src/components/menus/PackagesMenu.tsx | 1 | §5 | L375 |
| src/components/menus/RemoteSettingsMenu.tsx | 3 | §3×1+§4×1+§5×1 | L196,352,511 |
| src/components/menus/SettingsMenu.tsx | 3 | §4×1+§5×2 | L75,293,313 |
| src/components/menus/VaultsSettings.tsx | 2 | §4 | L8,10 |
| src/components/menus/settingsSearch.ts | 1 | §4 | L24 |
| src/components/model_editor/Model3DEditor.tsx | 2 | §5 | L474,622 |
| src/components/model_menu/ModelList.tsx | 4 | §5 | L294,296,298,300 |
| src/components/node/ApiKeyValidation.tsx | 1 | §5 | L23 |
| src/components/node/DataTable/TableActions.tsx | 4 | §5 | L272,351,377,411 |
| src/components/node/DynamicComfySchemaNode/ComfyWorkflowLoader.tsx | 2 | §5 | L74,94 |
| src/components/node/DynamicFalSchemaNode/FalSchemaLoader.tsx | 2 | §5 | L49,121 |
| src/components/node/DynamicKieSchemaNode/KieSchemaLoader.tsx | 2 | §5 | L52,124 |
| src/components/node/DynamicReplicateNode/ReplicateSchemaLoader.tsx | 2 | §5 | L46,117 |
| src/components/node/ModelSetupCallout.tsx | 1 | §5 | L85 |
| src/components/node/OutputNode/OutputNode.tsx | 3 | §5 | L311,325,331 |
| src/components/node/PreviewNode/PreviewActions.tsx | 1 | §5 | L85 |
| src/components/node/PreviewNode/PreviewNode.tsx | 3 | §5 | L362,376,382 |
| src/components/node/WorkflowNode/WorkflowLoader.tsx | 1 | §5 | L153 |
| src/components/node_editor/RuntimeInstallDialog.tsx | 1 | §5 | L79 |
| src/components/node_menu/FavoritesTiles.tsx | 1 | §5 | L258 |
| src/components/node_menu/NodeItem.tsx | 1 | §5 | L202 |
| src/components/node_menu/SearchResultItem.tsx | 1 | §5 | L258 |
| src/components/node_menu/TypeFilterChips.tsx | 1 | §4 | L67 |
| src/components/node_types/ContentCardBody.tsx | 1 | §5 | L515 |
| src/components/panels/ConversationOverlay.tsx | 1 | §5 | L350 |
| src/components/panels/PanelBottom.tsx | 1 | §4 | L137 |
| src/components/panels/PanelLeft.tsx | 2 | SUSPECT | L915,927 |
| src/components/panels/TriggerActivationButton.tsx | 1 | §4 | L90 |
| src/components/portal/DashboardTemplates.tsx | 4 | §2e | L208,211,218,219 |
| src/components/portal/entryCompatibility.tsx | 11 | §2e | L154,161,162,163,164,254,255,258,261,263,269 |
| src/components/projects/NewProjectSurface.tsx | 9 | §5 | L638,646,660,684,730,875,1006,1026,1118 |
| src/components/projects/projectStatus.ts | 14 | §2e | L48,50,56,58,64,66,72,76,119,121,123,208,229,234 |
| src/components/properties/AudioListProperty.tsx | 1 | §5 | L323 |
| src/components/properties/DataframeProperty.tsx | 1 | §5 | L237 |
| src/components/properties/ImageListProperty.tsx | 1 | §5 | L359 |
| src/components/properties/TextListProperty.tsx | 2 | §5 | L325,327 |
| src/components/properties/ToolsListProperty.tsx | 1 | §4 | L88 |
| src/components/properties/VideoListProperty.tsx | 1 | §5 | L298 |
| src/components/provider_onboarding/CostGuide.tsx | 4 | §3 | L29,34,39,44 |
| src/components/provider_onboarding/ProviderOnboardingCard.tsx | 5 | §5 | L186,201,203,220,222 |
| src/components/script/ScriptLineRow.tsx | 1 | §5 | L416 |
| src/components/script/ScriptListPanel.tsx | 1 | §5 | L37 |
| src/components/script/StoryboardLinkControl.tsx | 1 | §5 | L57 |
| src/components/settings/StorageHistorySettings.tsx | 1 | §4 | L18 |
| src/components/setup/entity/EntitySetupHost.tsx | 1 | §5 | L145 |
| src/components/setup/entity/ReferenceStep.tsx | 1 | §5 | L113 |
| src/components/setup/game/GameLandingChecklist.tsx | 12 | §3 | L216,220,225,226,231,232,235,236,240,241,245,246 |
| src/components/setup/game/GameLandingPanel.tsx | 1 | §5 | L109 |
| src/components/setup/game/LookStep.tsx | 8 | §2e | L196,197,202,203,209,210,219,229 |
| src/components/setup/game/useGameCustomStyle.ts | 5 | §5 | L89,93,122,134,141 |
| src/components/setup/image/ContactSheet.tsx | 4 | §5 | L188,202,203,211 |
| src/components/setup/image/ImageSetupOverlay.tsx | 1 | §5 | L132 |
| src/components/setup/image/LookStep.tsx | 4 | SUSPECT | L280,289,291,306 |
| src/components/setup/image/useImageSetupFlow.ts | 1 | §5 | L100 |
| src/components/setup/script/useScriptFileImport.ts | 1 | §5 | L147 |
| src/components/setup/script/useScriptSetupFlow.ts | 1 | §5 | L196 |
| src/components/setup/storyboard/useCustomStyle.ts | 5 | §5 | L84,90,124,136,147 |
| src/components/setup/storyboard/useShotlistImport.ts | 2 | §5 | L68,97 |
| src/components/setup/video/IdeaStep.tsx | 1 | §5 | L156 |
| src/components/setup/video/LookStep.tsx | 2 | §5 | L382,386 |
| src/components/setup/video/productionAuthoring.ts | 25 | §3 | L100,102,104,106,109,118,122,123,124,125,126,127,128,141,145,146,147,148,149,162,173,182,206,219,222 |
| src/components/setup/workflow/ReviewStep.tsx | 1 | §5 | L155 |
| src/components/setup/workflow/WorkflowLandingChecklist.tsx | 3 | §2e | L107,110,121 |
| src/components/sketch/Inspector/CreateGeneratedLayerDialog.tsx | 2 | §5 | L221,223 |
| src/components/sketch/Inspector/LayerActions.tsx | 3 | §5 | L192,228,241 |
| src/components/sketch/SelectionActionBar.tsx | 3 | §5 | L231,234,237 |
| src/components/sketch/SketchListPanel.tsx | 2 | §2e×1+§5×1 | L78,182 |
| src/components/sketch/SketchModal.tsx | 1 | §3 | L134 |
| src/components/sketch/SketchToolbar.tsx | 1 | §3 | L98 |
| src/components/sketch/hooks/useSegmentation.ts | 2 | §5 | L272,351 |
| src/components/sketch/selection/magicWandWorker.ts | 1 | §2e | L60 |
| src/components/sketch/sketchKeyboardShortcuts.ts | 1 | §2e | L31 |
| src/components/skills/SkillListPanel.tsx | 3 | §5 | L44,208,212 |
| src/components/storyboard/ShotEditPanel.tsx | 1 | §5 | L560 |
| src/components/storyboard/ShotEditViewer.tsx | 4 | §2e×1+§5×3 | L104,336,369,372 |
| src/components/storyboard/ShotScriptPanel.tsx | 1 | §5 | L98 |
| src/components/storyboard/ShotStatusPill.tsx | 8 | §3 | L62,66,79,85,96,102,105,110 |
| src/components/storyboard/StoryboardBoard.tsx | 1 | §10 | L273 |
| src/components/storyboard/StoryboardListPanel.tsx | 3 | §5 | L40,47,95 |
| src/components/storyboard/aspectOptions.ts | 1 | §4 | L20 |
| src/components/support/BugReportDialog.tsx | 2 | §5 | L157,244 |
| src/components/textEditor/AssistantQuickStarts.tsx | 4 | §3 | L33,38,43,48 |
| src/components/timeline/AddClipMenu.tsx | 3 | §5 | L484,515,565 |
| src/components/timeline/Inspector/ClipActions.tsx | 2 | §5 | L71,89 |
| src/components/timeline/Inspector/ClipAudioDrive.tsx | 1 | §4 | L103 |
| src/components/timeline/Inspector/TimelineInspector.tsx | 1 | §5 | L200 |
| src/components/timeline/Inspector/useModel3DSessionNames.ts | 2 | §5 | L71,104 |
| src/components/timeline/TimelineEditor.tsx | 3 | §10×1+§3×1+§5×1 | L353,436,841 |
| src/components/timeline/TimelineListPanel.tsx | 3 | §2e×1+§5×2 | L83,182,240 |
| src/components/timeline/TimelineShortcutsDialog.tsx | 1 | §4 | L156 |
| src/components/timeline/TopBarPrompt.tsx | 3 | §5 | L222,223,251 |
| src/components/timeline/Tracks/TrackLane.tsx | 6 | §5 | L277,300,301,303,598,603 |
| src/components/timeline/Tracks/useClipMenuActions.ts | 3 | §5 | L82,91,100 |
| src/components/timeline/preview/Model3DLayerSource.ts | 1 | §2e | L339 |
| src/components/timeline/preview/PreviewCompositor.tsx | 1 | §5 | L500 |
| src/components/timeline/preview/PreviewRecovery.tsx | 1 | §1 | L102 |
| src/components/timeline/preview/gpu/canvas2dCompositor.ts | 1 | §2e | L62 |
| src/components/timeline/preview/gpu/compositor.ts | 3 | §2e | L104,110,134 |
| src/components/timeline/preview/gpu/createCompositor.ts | 1 | §2e | L48 |
| src/components/timeline/preview/rasterClipFrames.ts | 1 | §2e | L56 |
| src/components/timeline/transcript/SlashCommandNode.tsx | 1 | §4 | L65 |
| src/components/ui_primitives/TagInput.tsx | 2 | §5 | L184,189 |
| src/components/workers/WorkersPanel.tsx | 1 | §5 | L423 |
| src/components/workflows/ShareWorkflowDialog.tsx | 1 | §5 | L77 |
| src/components/workspace/ChatSurface.tsx | 1 | §5 | L248 |
| src/components/workspace/MobileDocumentSelector.tsx | 1 | §4 | L34 |
| src/components/workspace/WorkflowChainSurface.tsx | 1 | §5 | L151 |
| src/components/workspace/WorkflowEditorSurface.tsx | 1 | §5 | L192 |
| src/components/workspace/newDocumentCatalog.tsx | 9 | §5 | L339,346,357,393,412,428,430,450,466 |
| src/components/workspace/pageTabs.ts | 1 | §2e | L51 |
| src/components/workspace/tabTypeIdentity.ts | 3 | §4 | L26,31,49 |
| src/components/workspace/useGuidedFlowStarters.ts | 9 | §5 | L112,132,150,164,184,204,217,231,244 |
| src/components/workspaces/WorkspaceTree.tsx | 3 | §2e | L197,215,279 |
| src/components/workspaces/useFolderPicker.tsx | 1 | §5 | L26 |
| src/config/codeGenPaletteMetadata.ts | 1 | §3 | L38 |
| src/config/data_types.ts | 2 | §3 | L862,883 |
| src/config/shortcuts.ts | 2 | §3 | L151,169 |
| src/config/snippetMetadata.ts | 3 | §3 | L148,169,172 |
| src/hooks/audio/useSaveAudioToAsset.ts | 1 | §5 | L43 |
| src/hooks/browser/useMicrophoneRecorder.ts | 1 | §2e | L62 |
| src/hooks/browser/useVideoRecorder.ts | 6 | §5 | L64,84,175,228,242,291 |
| src/hooks/browser/useWaveRecorder.ts | 3 | §5 | L57,77,132 |
| src/hooks/editor/useMonacoEditor.ts | 1 | §5 | L82 |
| src/hooks/handlers/addNodeFromAsset.ts | 1 | §5 | L77 |
| src/hooks/handlers/dropHandlerUtils.ts | 2 | §5 | L80,84 |
| src/hooks/handlers/useConnectionHandlers.ts | 3 | §5 | L151,219,233 |
| src/hooks/handlers/useDropHandler.ts | 4 | §5 | L167,189,257,272 |
| src/hooks/jsScript/jsScriptSaveRegistry.ts | 1 | §5 | L54 |
| src/hooks/nodes/useExposedInputToggle.ts | 1 | §5 | L116 |
| src/hooks/nodes/useNodeContextMenu.ts | 1 | §5 | L123 |
| src/hooks/nodes/useRunFromHere.ts | 2 | §5 | L86,87 |
| src/hooks/nodes/useRunSingleNode.ts | 3 | §5 | L71,72,104 |
| src/hooks/script/useVoiceSamples.ts | 1 | §5 | L144 |
| src/hooks/script/useWriteScript.ts | 3 | §5 | L161,176,194 |
| src/hooks/sketch/useDirectGenJob.ts | 12 | §2e×5+§5×7 | L181,188,195,202,203,264,294,305,319,337,410,491 |
| src/hooks/sketch/useGenerateLayer.ts | 1 | §5 | L366 |
| src/hooks/sketch/useSaveSketchAsAsset.ts | 2 | §5 | L38,65 |
| src/hooks/sketch/useSaveSketchDocument.ts | 1 | §5 | L25 |
| src/hooks/sketch/useSaveSketchToAsset.ts | 2 | §5 | L30,45 |
| src/hooks/storyboard/useStoryboardServerSync.ts | 1 | §5 | L380 |
| src/hooks/timeline/useGenerateFromBeats.ts | 1 | §5 | L532 |
| src/hooks/timeline/useTimelineDirectGenJob.ts | 1 | §5 | L427 |
| src/hooks/timeline/useTimelineProjectSettings.ts | 1 | §5 | L62 |
| src/hooks/timeline/useTimelineSave.ts | 1 | §5 | L82 |
| src/hooks/timeline/useTrackObject.ts | 6 | §2e | L99,100,105,111,117,128 |
| src/hooks/useEditVideoAsset.ts | 1 | §5 | L71 |
| src/hooks/useFloatingToolbarActions.ts | 1 | §5 | L148 |
| src/hooks/useRecipeActions.ts | 1 | §5 | L100 |
| src/hooks/workflow/useBuildFromPlan.ts | 5 | §2e×2+§5×3 | L193,204,267,268,280 |
| src/index.tsx | 8 | §6 | L676,693,715,730,734,737,750,768 |
| src/lib/script/importedScript.ts | 4 | §2e | L113,130,148,241 |
| src/lib/storyboard/parseShotlistCsv.ts | 1 | §2e | L253 |
| src/lib/storyboard/providerError.ts | 5 | §2e | L36,42,48,54,60 |
| src/lib/timelineExtension.ts | 1 | §2e | L126 |
| src/lib/websocket/GlobalWebSocketManager.ts | 1 | §2e | L80 |
| src/lib/websocket/WebSocketManager.ts | 1 | §2e | L235 |
| src/lib/workflow/browserWorkerClient.ts | 1 | §2e | L206 |
| src/lib/workflow/browserWorkflowRunner.ts | 1 | §2e | L447 |
| src/lib/workflow/runInlineGraphJob.ts | 2 | §2e | L216,270 |
| src/lib/workflow/sandboxModuleCatalog.ts | 1 | §2e | L480 |
| src/serverState/useAssetDeletion.ts | 1 | §2e | L37 |
| src/serverState/useAssetUpdate.ts | 1 | §2e | L63 |
| src/serverState/useAssets.ts | 3 | §2e | L304,310,316 |
| src/stores/AssetStore.ts | 1 | §2e | L170 |
| src/stores/CollectionStore.ts | 1 | §2e | L102 |
| src/stores/GlobalChatStore.ts | 6 | §2e | L771,1212,1273,1616,1813,1815 |
| src/stores/ModelDownloadStore.ts | 3 | §2e | L190,523,552 |
| src/stores/NodePacksStore.ts | 1 | §2e | L101 |
| src/stores/PacksStore.ts | 6 | §2e | L110,121,139,160,177,196 |
| src/stores/RemoteSettingStore.ts | 1 | §2e | L54 |
| src/stores/RuntimePackagesStore.ts | 5 | §2e | L84,85,94,110,150 |
| src/stores/SecretsStore.ts | 4 | §2e | L72,104,120,138 |
| src/stores/WorkflowManagerStore.ts | 1 | §2e | L435 |
| src/stores/WorkflowRunner.ts | 3 | §2e | L490,516,681 |
| src/stores/WorkspaceTabsStore.ts | 2 | §2e | L372,612 |
| src/stores/script/scriptVoicing.ts | 1 | §2e | L257 |
| src/stores/storyboard/StoryboardGenerationStore.ts | 1 | §2e | L1220 |
| src/stores/timeline/TimelineStore.ts | 3 | §2e | L1722,1982,3300 |
| src/stores/useAuth.ts | 1 | §2e | L324 |
| src/stores/workflowUpdates.ts | 4 | §2e | L301,303,818,1014 |
| src/studio/StudioHome.tsx | 5 | §5 | L164,181,201,220,257 |
| src/utils/bugReportBundle.ts | 11 | §2e | L113,195,196,206,218,230,242,243,253,265,266 |
| src/utils/fileExplorer.ts | 12 | §2e | L151,156,173,178,195,200,218,223,241,246,264,269 |
| src/utils/formatFalUnitPricing.ts | 2 | §2e | L80,82 |
| src/utils/formatKieUnitPricing.ts | 1 | §2e | L78 |
| src/utils/formatUtils.ts | 6 | §2e | L123,134,278,282,289,292 |
| src/utils/identifierValidation.ts | 2 | §2e | L21,28 |
| src/utils/modelFormatting.tsx | 1 | §2e | L64 |
| src/utils/modelNormalization.ts | 3 | §2e | L43,52,57 |

分类代表性判据(全表同法):§3=表/表工厂/labelKey 解析(ModeChips `referenceAudioOptions()`、PermissionSelector `modes()`、productionAuthoring 属性表、ShotStatusPill `lifecyclePill`、verificationLine、costPoints/buildQuickStarts、config 目录表);§4=局部包装 helper 且消费组件订阅覆盖(vt/act/dm/st/t18/settingsDocsLabel/settingsTabLabel/tabTypeName/aspectOptionLabel/presetLabel/scLabel/cmdLabel/toolDescription/typeOptionLabel/budgetNote/kindLabel 等);§2e=模块域函数(stores/lib/utils/serverState 目录 + 组件目录内模块助手如 toolCallPhrase/captions 相关/entryCompatibility/compositor 类/gpu 管线/worker);§5=useCallback/useEffect/handler/async/catch/Promise 回调体(按 D§5 整册口径,含返回 JSX 的 render-item 回调:ModelList `renderRow`、SkillListPanel `renderSkill`)。

## 7. 方法与置信度

- 方法:目录批量(stores/lib/utils/config/serverState 按构造豁免)+ 每个代码位 ±8 行上下文逐位人工相位判定;§1 查 `extends Component`;可疑渲染位回读整段组件核订阅(useTranslation/useAppLanguage/languageVersion)。
- 抽检:任务要求抽 10 个注释/参数默认位,实际**全量**核对(§9 33/33 逐条确认参数位;注释 38/38 逐条确认注释行)。
- 与 D 登记册对齐:§1 四文件中 Model3DViewer 当前 0 代码位(其余 3 文件 4 位);§6 8 位精确对齐;§10 两文件的现行落点为 StoryboardBoard L273(captionsByShotId 模块助手,D 登记的 451/562 为 memo 消费位行号)与 TimelineEditor L436(memo 体,登记册 430/440 行号漂移)。
- 置信度:高。§5 判定基于上下文阅读而非 AST;个别 async 助手若被渲染期同步调用,其全局读仍属"每次调用重求值",行为与豁免类等价、无冻结风险,不改变归类。SUSPECT 仅 6 处且均附组件级订阅核查证据,符合"预期近零"的审计预期。
