# i18n Coverage Map

What the zh-CN localization covers, by surface and mechanism, and what is
deliberately English. Numbers are intentionally absent — they rot. Each row
links the artifact or the command that measures its current state. Pair with
[CONTRIBUTING.md](CONTRIBUTING.md) (procedure) and [glossary.md](glossary.md)
(terminology rulings).

## Covered surfaces

### UI chrome — static dictionaries

| Surface | Dictionary | Notes |
|---|---|---|
| Editor chrome, dialogs, menus, toolbars | `locales/{en,zh-CN}/editor.json` | Largest namespace; action buttons, save indicators, empty states, model-editor & 3D scene chrome (`primitive.`/`mat.`/`geoParam.`/`sc.` families), panel chrome (logs/queue/trace/versions), command palette (`cm.*`), workspace tabs/rails, memory/model-menu/runs/support/version/studio stragglers |
| Storyboard / timeline domains | `storyboard.json`, `timeline.json` | Shot/take/clip/track/keyframe vocabulary; camera vocabulary value/label split (storage enums English, labels localized through `cameraOptions()`'s 42 keys, shared by ShotEditTable + TimelineShotForm); timeline gains code/shot/sampler/view groups (Fable panel module labels stay Latin, hardware convention) |
| Sketch tools | `sketch.json` | Brush/layer/tool chrome; vector layers, SVG panel, rulers+guides, brush-assist, undo/redo combo tooltips. Layer NAMES are document data (written into the sketch doc, dedup depends on English literals) — menu labels localize, stored names don't |
| Mini-app builder | `appbuilder.json` | Puck field labels resolved from a localized config clone |
| Game editor & player (2D/3D) | `game.json` | Editor chrome, toolbar, dock, command palette, inspector/collision/authoring surfaces. Registry titles (panels/commands/categories) resolve at render time through `components/game/gameI18n.ts` with the registry value as the English fallback; schema-derived field labels (`SchemaFields.fieldLabel`) stay English as data class |
| Settings & integrations | `settings.json`, `tools.json` | Env-var descriptions, provider cards, MCP section |
| Navigation & pages | `nav.json`, `home.json` | Rail, tabs, page sidebar. `home.json` fully covers the redesigned home surface (composer pills, guided-flow cards + states, game-dimension select, blank-document footer, model notices, guided-flow error panel with per-kind noun keys, document-tree group labels via `labelKey`) |
| Guided creation flows (`components/setup/`) | `setup.json` + heavy reuse of `storyboard:attrs` / `editor:ui` | The SetupFlow shell and the seven flows (entity/game/image/script/storyboard/video/workflow): stepper chrome, cancel/change-flow states, estimate lines, plan review, per-flow steps and hosts. Data classes: game style descriptions and image/script format cards resolve through keys at render (`STYLE_DESCRIPTION_KEYS`, `catalog:scriptFormats` / `catalog:imageUseCases` overlays); track names, language names, game-slot readouts, bug-report summaries and agent repair prompts stay English (sentinels / model input — `terminology.json` "keep-English (setup 域裁定)") |
| Primitives / shared | `common.json`, `ui.json`, `ui2.json` | Action verbs, attrs, relative time |

Every `t()` call carries `defaultValue: "<English>"`, so English renders with
or without a dictionary. Find unwired strings: `npm run i18n:audit`.

### Backend-provided display data — zh-only overlays in `catalog.json`

| Data | Block | Keyed by | Resolved by |
|---|---|---|---|
| Node display names (incl. provider catalogs) | `nodes` + `nodes.__taskSuffixes` | node type / task phrase | `nodeDisplayName.ts` (direct hit, else suffix composition) |
| Node documentation | `nodeDocs` | node type | `nodeDocs.ts` (parser-shaped mirror) |
| Workflow template names & descriptions | `workflowTemplates` | template file id | `workflowTemplateCopy.ts` |
| Shipped skill names & descriptions | `skills` | skill slug | render-time `t()` at list/viewer/tab sites and the home surface's starter pills (`catalog:skills.<slug>.name/.description`, `starterLabel` as English fallback) |
| Example apps / styles / example chips | `apps`, `styles`, `storyboardExamples`, `scriptInspirations`, `imageInspirations`, `imageUseCases`, `scriptFormats`, `gameInspiration`, `workflowInspiration` | slug | render-time `t()` |
| HuggingFace task names | `hfTask` | task id | `modelFormatting` |
| Static tables (attrs/shortcuts/dataTypes/snippets) | same file | — | label-key indirection |

Contract: English never carries these blocks; `__tests__/i18n.test.ts`
enforces key parity, non-empty zh, and shape. Seeded document names
("New workflow", "New conversation") resolve at render time through
`seededDocDisplayName` — stored data is never rewritten.

### Long-form documents — display-layer overlays

| Corpus | Location | Rule |
|---|---|---|
| Shipped skill bodies | `locales/zh-CN/skillDocs/<slug>.md` | On-disk English SKILL.md is the agent instruction stream and is never rewritten; the viewer renders the zh file when present (`skillDocs.ts`). Prompt-example text inside docs stays English (it is model input). |

`__tests__/skillDocs` contract: heading hierarchy and fence counts match the
English source, inline code tokens verbatim, CJK floor.

### Search

Localized names/descriptions join the search index as alias fields
(`nodeSearchAlias`, `getSearchAlias` on list panels, mention menu) — English
matching keeps its original weights. Bilingual behavior is covered by
`utils/__tests__/nodeSearch.bilingual.test.ts`.

## Deliberately English (standing rulings)

| Class | Reason |
|---|---|
| Node `tags` lines | Keyword rows at dictionary scale; display value low, mixed-language line risk high |
| Provider model-card descriptions | Third-party vendor copy that churns with every catalog update — a translation layer can never close |
| Proper nouns, model/brand names, version/tier suffixes (v2/Pro/Turbo/LoRA) | Industry practice: catalog identifiers stay Latin |
| Telemetry (`cpu`/`mem`/`worker:local`) | Metric identifiers, not prose |
| F-23 technical terms (SVG/JSON/API/TTS/GPU…) | Standard terms have no translation |
| Prompt-example text inside translated docs | Model input — translating changes behavior |
| Package-manager catalog rows | Data class until an explicit ruling says otherwise (record the request in `terminology.json` notes) |
| Upstream dead code (e.g. DashboardRecipes strings) | Not rendered; fix belongs upstream |

Ruling hygiene: reversals require an explicit decision recorded in
`terminology.json` + the commit message. A new instruction never silently
overrides a recorded ruling.

## Verifying current state

- Coverage of dictionaries: `npx jest src/i18n --runInBand` (contract + parity + dead-key guards)
- Unwired English in components: `npm run i18n:audit` (report-only scanner; sentence-class hits are actionable)
- Commit discipline: `npm run i18n:gate` / `npm run i18n:preflight`
- Live spot-check: open the surface in a browser at zh and exercise its primary action with pageerror listening (see CONTRIBUTING.md checklist)

New upstream strings arrive with merges; the audit command finds them —
treat a fresh `i18n:audit` run as the source of truth for "what remains",
not this document.
