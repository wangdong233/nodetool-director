# D · 豁免登记册(P1-PRE ⑤,先建后迁)

> 三态:豁免(保全局)/迁移(进批)/人工(最危)。收尾时余量 grep 与本册逐文件相等(B 条件 6)。生成:机械 grep + B/A 台账合成,2026-09-29。


## 1. 类组件(豁免,B 条件 15,禁 HOC)

- 豁免 components/SearchErrorBoundary.tsx
- 豁免 components/common/PanelErrorBoundary.tsx
- 豁免 components/timeline/preview/PreviewRecovery.tsx
- 豁免 components/asset_viewer/Model3DViewer.tsx

## 2. 非 React .ts 调用位(豁免,B-R7)

- **src/stores**(17 文件): WorkflowManagerStore.ts, ModelDownloadStore.ts, GlobalChatStore.ts, AssetStore.ts, StoryboardGenerationStore.ts, NodePacksStore.ts, scriptVoicing.ts, useAuth.ts, CollectionStore.ts, PacksStore.ts, WorkflowRunner.ts, WorkspaceTabsStore.ts, RemoteSettingStore.ts, TimelineStore.ts, workflowUpdates.ts, RuntimePackagesStore.ts, SecretsStore.ts
- **src/lib**(10 文件): GlobalWebSocketManager.ts, WebSocketManager.ts, parseShotlistCsv.ts, providerError.ts, timelineExtension.ts, importedScript.ts, browserWorkerClient.ts, sandboxModuleCatalog.ts, runInlineGraphJob.ts, browserWorkflowRunner.ts
- **src/utils**(7 文件): formatFalUnitPricing.ts, identifierValidation.ts, modelNormalization.ts, fileExplorer.ts, bugReportBundle.ts, formatUtils.ts, formatKieUnitPricing.ts
- **src/config**(4 文件): codeGenPaletteMetadata.ts, data_types.ts, shortcuts.ts, snippetMetadata.ts
- **src/serverState**(3 文件): useAssetUpdate.ts, useAssetDeletion.ts, useAssets.ts

## 3. 模块表/表工厂/labelKey 双表(豁免禁动)

- 85 文件 535 处 labelKey 引用(A §2d);表工厂:PermissionSelector modes()/ModeChips referenceAudioOptions();labelKey 双表:StoryboardBoard:181-187;目录表:data_types/snippetMetadata/shortcuts 等

## 4. 局部包装 helper(统一裁定:保留全局,B-R7④)

- vt/act/dm/st/t18/settingsDocsLabel/settingsTabLabel/tabTypeName/aspectOptionLabel 等 ≥10 文件(消费组件订阅覆盖)

## 5. 事件相位(useCallback/useEffect 体,豁免)

- useCallback 272 处/127 文件 + useEffect 10 处/8 文件(A §2e';变换规则 R4)

## 6. 启动面(豁免)

- src/index.tsx 8 处 boot splash(A §2f)

## 7. 最危 10 文件(人工批,禁自动,B-R5)

- 人工 src/index.tsx
- 人工 components/chat/message/MessageView.tsx
- 人工 components/asset_viewer/Model3DViewer.tsx
- 人工 components/context_menus/OutputContextMenu.tsx
- 人工 components/context_menus/ConnectableNodes.tsx
- 人工 components/chat/composer/MediaChatComposer.tsx
- 人工 components/storyboard/StoryboardBoard.tsx
- 人工 components/sketch/SketchLayersPanel.tsx
- 人工 components/menus/APIKeysTab.tsx
- 人工 components/timeline/Inspector/ClipMaskMatte.tsx

## 8. t 遮蔽 16 文件(脚本跳过,人工逐文件,A-R2)

- 遮蔽 MessageView
- 遮蔽 CompositorEditorCanvas
- 遮蔽 NodeInfoPanel
- 遮蔽 ExternalMcpServersSection
- 遮蔽 PropertyInput
- 遮蔽 OutputNode
- 遮蔽 PreviewNode
- 遮蔽 AdsrPreview
- 遮蔽 SynthKnob
- 遮蔽 ClipTimeRemap
- 遮蔽 ClipAdjustments
- 遮蔽 ClipCustomCurves
- 遮蔽 TranscriptEditor
- 遮蔽 TrackEffectsPanel
- 遮蔽 LayerItem
- 遮蔽 SketchLayersPanel
