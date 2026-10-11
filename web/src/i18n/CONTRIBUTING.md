# i18n Contributor Playbook

Operational guide for translating new surfaces and continuing the zh-CN
localization. Read together with the [Localization section](../AGENTS.md#localization-i18n)
and [glossary.md](glossary.md). Architecture lives there; this file is the
procedure.

## Decision tree: which mechanism does a new surface need?

```
Is the string hardcoded UI chrome (label, tooltip, button, empty state)?
  → static dictionary: t("ns:key", { defaultValue: "<English>" }) + key in
    locales/en/<ns>.json + locales/zh-CN/<ns>.json. Never bare strings.

Is it backend-provided DATA rendered as display copy (catalog names,
seeded defaults, shipped template/example copy)?
  → zh-only overlay block in catalog.json keyed by a stable identifier
    (id/slug/type). English NEVER carries these blocks — the contract tests
    in __tests__/i18n.test.ts enforce this. Resolve at render time via a
    helper (see nodeDisplayName.ts / workflowTemplateCopy.ts for the
    pattern) with defaultValue = the raw backend value.

Is it a long-form document that agents ALSO read (skill bodies, prompts)?
  → display-layer overlay only: one markdown file per doc under
    locales/zh-CN/skillDocs/<slug>.md (see skillDocs.ts). The on-disk
    English source is the agent-facing instruction stream and must never
    be rewritten. Text that gets fed to models (prompt examples) stays
    English inside translated docs.

Is it a patterned long tail (provider catalogs, generated names)?
  → composition, not per-entry dictionaries (see nodes.__taskSuffixes and
    nodeDisplayName.ts). Probe the real shapes first, then a vocabulary
    table + renderer. Guard against misdrops; keep proper nouns and
    version/tier suffixes English.
```

## Workflow for a new surface

1. Read glossary.md and check `terminology.json` for every recurring
   concept before coining a translation. New adjudications get written
   back to terminology.json (the mechanical anchor future rounds check
   against).
2. Wire with `t()` + `defaultValue`. Memoized components rendering
   language-dependent content must own their `useTranslation()` anchor.
3. If the surface has search, add the localized form as a search alias
   (English keeps its original weights) — an untranslated alias field
   returns "" and contributes nothing.
4. Fixed-height controls are an anti-pattern: minHeight grid + single-line
   token lineHeight + auto width. Never squeeze line-height into a fixed
   box — browser minimum-font settings always win.
5. Dictionary writes go through the Edit/Write tools only. Never rewrite
   a dictionary file with a script — JSON round-trips normalize duplicate
   keys and reorder blocks silently.
6. Run the gates from `web/` before committing: `npm run i18n:gate`
   (paste the G3 tuple verbatim into the commit message), then
   `npm run i18n:preflight`. Run `npm run i18n:audit` to find remaining
   bare strings in the area.
7. Verify live, not by string inspection: open the surface in a browser
   (zh), exercise its primary action, and listen for pageerror. Wiring
   rounds have shipped functional breaks (context-bound hooks outside
   their host tree; i18n imports entering web-worker graphs) that only
   runtime exercise catches. Use real Playwright clicks for React
   handlers — synthetic dispatched events do not trigger them.

## Verification checklist (per surface)

- [ ] zh renders fully; English remnants are only the adjudicated classes
- [ ] en side byte-identical behavior (spot-check the surface in en)
- [ ] Search works in both languages if the surface has search
- [ ] Primary action still works, zero pageerror
- [ ] Layout holds at narrow widths and raised minimum-font settings
- [ ] New dictionary keys referenced (dead-key guard green)

## Adjudicated English (standing rulings — do not translate)

- Node `tags` lines (dictionary-scale keyword rows) and provider
  model-card descriptions (~vendor copy): ruled data class.
- Proper nouns, model/brand names, version/tier suffixes (v2/Pro/Turbo/
  LoRA), telemetry (cpu/mem/worker), F-23 technical terms (SVG/JSON/API/
  TTS…), and prompt example text inside translated docs.
- Package-manager catalog rows (backend long tail) — ruling pending;
  ask before translating.

Recording rule: reversal or new rulings go into terminology.json notes
and the commit message. In-case rulings are never overturned by silent
interpretation — a new instruction that seems to conflict with a recorded
ruling needs an explicit decision first.

## Translation quality (LQA discipline)

Terminology consistency over literal fidelity; industry jargon over
word-for-word; whole-sentence rewrites over word-swapped hybrids. Content
fidelity is mechanical where possible: heading hierarchy and fenced-block
counts must match the English source, inline code tokens are preserved
verbatim, CJK ratio floors catch untranslated halves. The skillDocs
contract tests show the pattern; extend it when adding document corpora.
