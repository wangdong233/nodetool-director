import commonEn from "../locales/en/common.json";
import navEn from "../locales/en/nav.json";
import settingsEn from "../locales/en/settings.json";
import homeEn from "../locales/en/home.json";
import editorEn from "../locales/en/editor.json";
import timelineEn from "../locales/en/timeline.json";
import sketchEn from "../locales/en/sketch.json";
import storyboardEn from "../locales/en/storyboard.json";
import uiEn from "../locales/en/ui.json";
import ui2En from "../locales/en/ui2.json";
import appbuilderEn from "../locales/en/appbuilder.json";
import catalogEn from "../locales/en/catalog.json";
import toolsEn from "../locales/en/tools.json";
import gameEn from "../locales/en/game.json";
import setupEn from "../locales/en/setup.json";
import commonZh from "../locales/zh-CN/common.json";
import navZh from "../locales/zh-CN/nav.json";
import settingsZh from "../locales/zh-CN/settings.json";
import homeZh from "../locales/zh-CN/home.json";
import editorZh from "../locales/zh-CN/editor.json";
import timelineZh from "../locales/zh-CN/timeline.json";
import sketchZh from "../locales/zh-CN/sketch.json";
import storyboardZh from "../locales/zh-CN/storyboard.json";
import uiZh from "../locales/zh-CN/ui.json";
import ui2Zh from "../locales/zh-CN/ui2.json";
import appbuilderZh from "../locales/zh-CN/appbuilder.json";
import catalogZh from "../locales/zh-CN/catalog.json";
import toolsZh from "../locales/zh-CN/tools.json";
import gameZh from "../locales/zh-CN/game.json";
import setupZh from "../locales/zh-CN/setup.json";
import {
  changeAppLanguage,
  i18n,
  LANGUAGE_STORAGE_KEY,
  resetI18nForTest,
} from "../index";

// Catalog sets (the CI completeness guard lives in catalogParity.test.ts).

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? flatten(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

afterEach(async () => {
  await resetI18nForTest(); // Y4 isolation rule: never leak zh into later tests
});

describe("app i18n", () => {
  it("defaults to English with the full en bundle", () => {
    expect(i18n.language.startsWith("en")).toBe(true);
    expect(i18n.t("common:action.cancel")).toBe("Cancel");
  });

  it("switches to zh-CN, translates, and syncs <html lang> + storage", async () => {
    await changeAppLanguage("zh-CN");
    expect(i18n.t("common:action.cancel")).toBe("取消");
    expect(i18n.t("nav:settings.general")).toBe("通用");
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("zh-CN");
  });

  it("falls back to the English value for a zh-missing key (never the raw key)", async () => {
    // An en-only key (as if the en catalog gained a string first).
    // addResourceBundle(deep) merges INTO the shared module object — clean
    // it up so the parity tests below see the on-disk key set.
    i18n.addResourceBundle("en", "common", { action: { enOnly: "EN only" } }, true, true);
    try {
      await changeAppLanguage("zh-CN");
      expect(i18n.t("common:action.enOnly")).toBe("EN only");
    } finally {
      const bundle = i18n.getResourceBundle("en", "common") as { action: Record<string, unknown> };
      delete bundle.action.enOnly;
    }
  });

  it("reset restores English and clears persistence", async () => {
    await changeAppLanguage("zh-CN");
    await resetI18nForTest();
    expect(i18n.t("common:action.cancel")).toBe("Cancel");
    expect(document.documentElement.lang).toBe("en");
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it("uses full-width ellipsis in zh loading copy and no 请-prefix on verbs", async () => {
    await changeAppLanguage("zh-CN");
    const loading = i18n.t("common:status.loading");
    expect(loading.endsWith("…")).toBe(true);
    for (const verb of ["save", "cancel", "delete", "retry", "run"]) {
      expect(i18n.t(`common:action.${verb}`)).not.toContain("请");
    }
  });
});

describe("catalog key parity (CI completeness guard)", () => {
  // Display-layer data catalog (director/98 方案A): the skills/apps blocks are
  // a zh-only OVERLAY — English renders the runtime data value through
  // defaultValue (t(`catalog:skills.${slug}.name`, { defaultValue: … })), so
  // the en file carries no copy that could drift or shadow live data. Parity
  // therefore compares the static blocks only; the overlay itself is checked
  // by the dedicated test below.
  const staticBlocks = (obj: Record<string, unknown>) => {
    const copy = { ...obj };
    delete copy.skills;
    delete copy.apps;
    delete copy.styles;
    delete copy.gameInspiration;
    delete copy.storyboardExamples;
    delete copy.scriptInspirations;
    delete copy.imageInspirations;
    delete copy.imageUseCases;
    delete copy.workflowInspiration;
    delete copy.workflowTemplates;
    delete copy.nodes;
    delete copy.nodeDocs;
    delete copy.scriptFormats;
    return copy;
  };
  const suites: Array<[string, Record<string, unknown>, Record<string, unknown>]> = [
    ["common", commonEn, commonZh],
    ["nav", navEn, navZh],
    ["settings", settingsEn, settingsZh],
    ["home", homeEn, homeZh],
    ["editor", editorEn, editorZh],
    ["timeline", timelineEn, timelineZh],
    ["sketch", sketchEn, sketchZh],
    ["storyboard", storyboardEn, storyboardZh],
    ["ui", uiEn, uiZh],
    ["ui2", ui2En, ui2Zh],
    ["appbuilder", appbuilderEn, appbuilderZh],
    ["catalog", staticBlocks(catalogEn), staticBlocks(catalogZh)],
    ["tools", toolsEn, toolsZh],
    ["game", gameEn, gameZh],
    ["setup", setupEn, setupZh],
  ];

  it.each(suites)("%s: en and zh-CN carry exactly the same key set", (_ns, en, zh) => {
    // i18next count-plurals: each locale carries only the CLDR plural
    // categories it needs (en: _one/_other; zh: _other alone). Compare the
    // BASE key set — suffixes stripped — so a legitimate plural asymmetry
    // passes while a missing/extra phrase still fails.
    const base = (keys: string[]) =>
      new Set(keys.map((k) => k.replace(/_(one|other|few|many|zero|two)$/, "")));
    expect(base(flatten(zh as Record<string, unknown>))).toEqual(
      base(flatten(en as Record<string, unknown>))
    );
  });

  it("every catalog key is referenced from src (dead-key guard)", () => {
    // A key passes when the source tree contains its full literal
    // `ns:key.path`, OR when some ancestor path is used as a dynamic
    // template prefix (`ns:ancestor.` immediately followed by interpolation) —
    // that covers the enum-keyed subtrees (opts/typeNames/docsTopics/mime…).
    // Keys written to the catalogs but never wired render nothing and have
    // twice slipped through (r14: notifCleanSome/All, useChatPlaceholder).
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- test-only source sweep
    const fs = require("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- test-only source sweep
    const path = require("path");
    const webSrc = path.resolve(__dirname, "../../..");
    let allSource = "";
    const walkFiles = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "__tests__" || entry.name === "i18n" || entry.name.startsWith(".")) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walkFiles(full);
        else if (/\.(tsx?|jsx?)$/.test(entry.name)) allSource += fs.readFileSync(full, "utf-8");
      }
    };
    walkFiles(webSrc);

    const leafKeys: Array<[string, string]> = [];
    const collect = (node: Record<string, unknown>, ns: string, prefix: string) => {
      for (const [k, v] of Object.entries(node)) {
        const p = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object") collect(v as Record<string, unknown>, ns, p);
        else leafKeys.push([ns, p]);
      }
    };
    collect(commonEn, "common", "");
    collect(navEn, "nav", "");
    collect(settingsEn, "settings", "");
    collect(homeEn, "home", "");
    collect(editorEn, "editor", "");
    collect(timelineEn, "timeline", "");
    collect(sketchEn, "sketch", "");
    collect(storyboardEn, "storyboard", "");
    collect(uiEn, "ui", "");
    collect(ui2En, "ui2", "");
    collect(appbuilderEn, "appbuilder", "");
    collect(catalogEn, "catalog", "");
    collect(toolsEn, "tools", "");
    collect(gameEn, "game", "");
    collect(setupEn, "setup", "");

    // Single-pass extraction (r25 perf): the original per-key loop ran a fresh
    // regex + includes() over the ~40MB allSource for every leaf × every
    // dynamic prefix (~50k full-string scans ≈ 15min). Extract the reference
    // sets once with a quote-aware scanner (naive regex extraction desyncs on
    // quote parity — "it's" and template backticks swallow later matches);
    // per-key checks become Set lookups with the original's semantics.
    const fullLiteralRefs = new Set<string>();
    const quotedLiterals = new Set<string>();
    const objectKeys = new Set<string>();
    // Deep template leaves: inside backtick templates, a chunk ending in
    // `.ident` before a ${…} interpolation or the closing backtick references
    // a leaf by name (e.g. `tools:menus.providers.${meta.key}.credentialLabel`)
    // — the leaf name is a real reference the other two sets cannot see.
    const templateLeafRefs = new Set<string>();
    for (const m of allSource.matchAll(/([a-z0-9]+):([^"'`\s]{1,160})["`']/g)) {
      fullLiteralRefs.add(`${m[1]}:${m[2]}`);
    }
    {
      const s = allSource;
      const n = s.length;
      let i = 0;
      while (i < n) {
        const code = s.charCodeAt(i);
        if (code === 34 || code === 39 || code === 96) {
          // " ' ` — scan a string literal with escape + newline rules
          const q = code;
          let j = i + 1;
          while (j < n) {
            const d = s.charCodeAt(j);
            if (d === 92) { j += 2; continue; } // backslash escape
            if (d === q) break;
            if (d === 10 && q !== 96) break; // unterminated ' or " line
            if (j - i > 300) break; // runaway cap
            j++;
          }
          if (j < n && s.charCodeAt(j) === q && j - i > 1) {
            const content = s.slice(i + 1, j);
            quotedLiterals.add(content);
            if (q === 96) {
              for (const chunk of content.split(/\$\{[^}]*\}/)) {
                const m3 = chunk.match(/\.([A-Za-z0-9_-]+)$/);
                if (m3) templateLeafRefs.add(m3[1]);
              }
            }
          }
          i = j + 1;
          continue;
        }
        if (code === 123 || code === 44) {
          // { or , — capture `key:` / `key=` object-literal shapes
          let j = i + 1;
          while (j < n) {
            const d = s.charCodeAt(j);
            if (d === 32 || d === 9 || d === 10 || d === 13) j++;
            else break;
          }
          let k = j;
          const kd = s.charCodeAt(k);
          if (kd === 34 || kd === 39 || kd === 96) k++;
          let m2 = k;
          while (m2 < n) {
            const d = s.charCodeAt(m2);
            if ((d >= 48 && d <= 57) || (d >= 65 && d <= 90) || (d >= 97 && d <= 122) || d === 45 || d === 95) m2++;
            else break;
          }
          if (m2 > k) {
            let p = m2;
            const pd = s.charCodeAt(p);
            if (pd === 34 || pd === 39 || pd === 96) p++;
            while (p < n) {
              const d = s.charCodeAt(p);
              if (d === 32 || d === 9 || d === 10 || d === 13) p++;
              else break;
            }
            const qd = s.charCodeAt(p);
            if (qd === 58 || qd === 61) objectKeys.add(s.slice(k, m2));
          }
        }
        i++;
      }
    }
    // Union with a naive regex pass: the scanner is quote-aware but desyncs on
    // regex literals containing quote chars (/["']/); the naive pass can't
    // cross any quote so it survives those, while missing apostrophe-bearing
    // strings the scanner catches. Union covers both failure modes.
    for (const m of allSource.matchAll(/["'`]([^"'`\n]{1,160})["'`]/g)) {
      quotedLiterals.add(m[1]);
    }
    const prefixPresent = new Map<string, boolean>();

    const dead: string[] = [];
    for (const [ns, key] of leafKeys) {
      // A full-literal reference must match the FULL key path and END at a
      // closing quote/backtick. A bare substring check is wrong twice over:
      // "common:action.close" passes as a substring of "common:action.closeTab"
      // (r16-R1), and it also short-circuits before the boundary test can
      // run. The prefix-free sibling reference grants nothing to other keys.
      if (fullLiteralRefs.has(`${ns}:${key}`)) continue;
      // Plural-category leaves OUTSIDE the dynamic subtrees: i18next resolves
      // `_one`/`_other` from a call that names only the BASE, so a full
      // literal of the base path corroborates the suffixed leaves the same
      // way the dynamic-subtree branch below does (r9: nodesPlaced under
      // storyboard:attrs).
      const pluralKeyBase = key.replace(/_(one|other|few|many|zero|two)$/, "");
      if (
        pluralKeyBase !== key &&
        fullLiteralRefs.has(`${ns}:${pluralKeyBase}`)
      ) {
        continue;
      }
      // Keys with chars outside the extraction class (apostrophes etc.) can't
      // land in fullLiteralRefs — fall back to the original anchored regex.
      if (!/^[A-Za-z0-9_.+-]+$/.test(key)) {
        const escPath = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (new RegExp(`${ns}:${escPath}["\`]`).test(allSource)) continue;
      }
      // Only whitelisted subtrees may build keys dynamically (a template
      // `ns:subtree.${…}` exists in src). Inside one, a leaf still needs
      // corroboration: the key name as a quoted literal (helper call site)
      // or as an object-literal key (the enum table feeding the template).
      // Known blind spot: very common words corroborate incidentally — a
      // dead key whose leaf name is a frequent string anywhere in src
      // (e.g. "close") survives the corroboration check. Verified in r16:
      // re-adding action.close stays green through this path; the boundary
      // fix above is what stops prefix-hitchhiking for keys WITHOUT a
      // coincidental literal.
      const DYNAMIC_SUBTREES = [
        "common:mime.",
        "common:sizeFilters.",
        "common:typeFilters.",
        "common:action.",
        "nav:tabs.",
        "nav:qa.",
        "home:entry.",
        "home:flowError.kind.",
        "sketch:attrs.",
        "editor:nodeBody.items.",
        "editor:bottom.",
        "editor:ui.",
        "appbuilder:attrs.",
        "timeline:shortcuts.",
        "nav:settings.docsTopics.",
        "settings:general.",
        "settings:vaults.",
        "settings:storage.",
        "settings:defModels.",
        "settings:sidebar.",
        "settings:remote.",
        "tools:ctx.",
        "tools:menus.",
        "tools:tutorials.",
        "tools:misc.",
        "common:relTime.",
        "catalog:snippets.",
        "catalog:shortcuts.",
        "catalog:dataTypes.",
        "catalog:hfTask.",
        "timeline:keyframeChannels.",
        "timeline:trackTypes."
      ];
      let dynamicallyUsed = false;
      const parts = key.split(".");
      const leaf = parts[parts.length - 1];
      for (const prefix of DYNAMIC_SUBTREES) {
        if (!prefixPresent.has(prefix)) {
          prefixPresent.set(prefix, allSource.includes(prefix));
        }
        if (
          prefixPresent.get(prefix) &&
          `${ns}:${parts.slice(0, -1).join(".")}.`.startsWith(prefix)
        ) {
          // Non-identifier leaves (regex-shaped) fall back to the original
          // scan; identifier-shaped leaves — every real key — hit the Sets.
          if (/^[A-Za-z0-9_-]+$/.test(leaf)) {
            // Plural-category leaves (i18next _one/_other/…) are built by
            // i18next itself from a template that names only the BASE —
            // corroboration accepts the suffix-stripped name.
            const pluralBase = leaf.replace(
              /_(one|other|few|many|zero|two)$/,
              ""
            );
            // Indexed leaves (learn_0, learn_1, …): a wiring template like
            // `tools:tutorials.${id}.learn_${i}` contributes its last static
            // chunk (`learn_`) to templateLeafRefs — accept that stem for
            // stem+digits leaves. Per-index keys are the returnObjects-free
            // layout the tutorials learn bullets use.
            const indexedStem = leaf.match(/^(.+?)(\d+)$/);
            if (
              quotedLiterals.has(leaf) ||
              objectKeys.has(leaf) ||
              templateLeafRefs.has(leaf) ||
              (indexedStem !== null &&
                templateLeafRefs.has(indexedStem[1])) ||
              (pluralBase !== leaf &&
                (quotedLiterals.has(pluralBase) ||
                  objectKeys.has(pluralBase) ||
                  templateLeafRefs.has(pluralBase)))
            ) {
              dynamicallyUsed = true;
            }
          } else {
            const esc = leaf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const literal = new RegExp(`["'\`]${esc}["'\`]`);
            const objectKey = new RegExp(`[{,][ \t]*["'\`]?${esc}["'\`]?[ \t]*[:=]`);
            if (literal.test(allSource) || objectKey.test(allSource)) {
              dynamicallyUsed = true;
            }
          }
        }
      }
      if (!dynamicallyUsed) dead.push(`${ns}:${key}`);
    }
    expect(dead).toEqual([]);
  });

  it("zh values are non-empty strings", () => {
    for (const [, , zh] of suites) {
      for (const value of Object.values(flattenDeep(zh))) {
        expect(typeof value).toBe("string");
        expect((value as string).length).toBeGreaterThan(0);
      }
    }
  });

  it("catalog skills/apps overlay is zh-only with non-empty name+description per slug", () => {
    // en must NOT carry the overlay (defaultValue is the English source), and
    // every zh entry needs both fields so a chip/tile never renders a bare
    // slug or an empty description.
    expect(catalogEn).not.toHaveProperty("skills");
    expect(catalogEn).not.toHaveProperty("apps");
    expect(catalogEn).not.toHaveProperty("styles");
    // The JSON module's inferred literal type cannot directly overlap a nested
    // record index, hence the double assertion.
    const zhOverlay = catalogZh as unknown as Record<
      string,
      Record<string, Record<string, unknown>>
    >;
    // styles keys are preset NAMES (spaces/capitals allowed: "Painted 2D"),
    // so the slug regex applies to skills/apps only.
    for (const block of ["skills", "apps"] as const) {
      const entries = zhOverlay[block];
      expect(Object.keys(entries).length).toBeGreaterThan(0);
      for (const [slug, entry] of Object.entries(entries)) {
        for (const field of ["name", "description"]) {
          expect(typeof entry[field]).toBe("string");
          expect((entry[field] as string).length).toBeGreaterThan(0);
        }
        expect(slug).toMatch(/^[a-z0-9][a-z0-9.-]*$/);
      }
    }
    const styleEntries = zhOverlay["styles"];
    expect(Object.keys(styleEntries).length).toBeGreaterThan(0);
    for (const [name, entry] of Object.entries(styleEntries)) {
      for (const field of ["name", "description"]) {
        expect(typeof entry[field]).toBe("string");
        expect((entry[field] as string).length).toBeGreaterThan(0);
      }
      expect(name).toMatch(/^[A-Za-z0-9][A-Za-z0-9 ./-]*$/);
    }
  });

  it("creation-flow example overlays are zh-only with non-empty chip text per slug", () => {
    // 显示即所发 overlays (r10): every creation flow's example chips render
    // through a catalog lookup keyed by a stable slug — the shipped storyboard
    // boards' file slugs, the script/image chips' content-derived slugs, and
    // the protocol workflow chips' ids. en must NOT carry them (defaultValue
    // is the English source); every zh entry must be a non-empty string so a
    // chip never renders a bare slug. gameInspiration (r9) is the same shape
    // and joins the loop.
    for (const block of [
      "gameInspiration",
      "scriptInspirations",
      "imageInspirations",
      "workflowInspiration"
    ] as const) {
      expect(catalogEn).not.toHaveProperty(block);
      const entries = catalogZh[block] as Record<string, string>;
      expect(Object.keys(entries).length).toBeGreaterThan(0);
      for (const [slug, text] of Object.entries(entries)) {
        expect(typeof text).toBe("string");
        expect(text.length).toBeGreaterThan(0);
        expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
      }
    }
    expect(catalogEn).not.toHaveProperty("storyboardExamples");
    const boardEntries = catalogZh["storyboardExamples"] as Record<
      string,
      { name: string; logline: string }
    >;
    expect(Object.keys(boardEntries).length).toBeGreaterThan(0);
    for (const [slug, entry] of Object.entries(boardEntries)) {
      // r23 (F-29 修订): the picker cards render the localized NAME alongside
      // the r10 logline, so every shipped slug needs both fields non-empty.
      expect(typeof entry.name).toBe("string");
      expect(entry.name.length).toBeGreaterThan(0);
      expect(typeof entry.logline).toBe("string");
      expect(entry.logline.length).toBeGreaterThan(0);
      expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
    // r23 (F-29 修订 B): the image flow's use-case cards render through a
    // zh-only overlay keyed by the protocol table's stable ids, resolved at
    // render time in UseCaseStep (never the frozen module constant).
    expect(catalogEn).not.toHaveProperty("imageUseCases");
    const useCaseEntries = catalogZh["imageUseCases"] as Record<
      string,
      { title: string; description: string }
    >;
    expect(Object.keys(useCaseEntries).length).toBeGreaterThanOrEqual(7);
    for (const [slug, entry] of Object.entries(useCaseEntries)) {
      expect(typeof entry.title).toBe("string");
      expect(entry.title.length).toBeGreaterThan(0);
      expect(typeof entry.description).toBe("string");
      expect(entry.description.length).toBeGreaterThan(0);
      expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  });

  it("catalog workflowTemplates overlay is zh-only, keyed by shipped file id, name+description complete (r28)", () => {
    // r28 方案-C-推翻裁决 (2026-10-09): the 194 shipped template workflows'
    // names and descriptions render through a zh-only overlay keyed by the
    // template FILE id (the backend's stable listing identity, e.g.
    // "A Gradient Card as PNG.json") — never the display name. en must NOT
    // carry the block (the backend values are the English source); every zh
    // entry needs both fields so a row never renders a bare id. The
    // workflowTemplateCopy resolver reads the block by direct Map lookup, so
    // ids with dots/spaces are addressable.
    expect(catalogEn).not.toHaveProperty("workflowTemplates");
    const entries = catalogZh["workflowTemplates"] as Record<
      string,
      { name: string; description: string }
    >;
    expect(Object.keys(entries).length).toBeGreaterThanOrEqual(190);
    for (const [id, entry] of Object.entries(entries)) {
      expect(typeof entry.name).toBe("string");
      expect(entry.name.length).toBeGreaterThan(0);
      expect(typeof entry.description).toBe("string");
      expect(entry.description.length).toBeGreaterThan(0);
      // Shipped example file names: capitals, spaces, commas, ampersands and
      // apostrophes occur; the shape contract is "identifier-ish stem +
      // .json".
      expect(id).toMatch(/^[A-Za-z0-9][A-Za-z0-9 ,&'.-]*\.json$/);
    }

    // Drift guard: every key must name a file the install actually ships,
    // and every shipped file must carry a translation — a renamed or added
    // example fails here rather than rendering a stale/English row. Skipped
    // only when the repo checkout lacks the examples tree.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- repo-tree cross-check
    const fs = require("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- repo-tree cross-check
    const path = require("path");
    const examplesDir = path.resolve(
      __dirname,
      "../../../../packages/base-nodes/nodetool/examples/nodetool-base"
    );
    if (fs.existsSync(examplesDir)) {
      const shipped = new Set(
        fs
          .readdirSync(examplesDir)
          .filter((f: string) => f.toLowerCase().endsWith(".json"))
      );
      expect([...shipped].sort()).toEqual(Object.keys(entries).sort());
    }
  });

  it("catalog nodes overlay is zh-only, keyed by node type, with non-empty display names", () => {
    // r13 节点显示名: the overlay keys are node TYPES (stable registry
    // identity — namespace-shaped paths like "nodetool.audio.Bitcrush"),
    // never titles, and each value is the localized display name. en must
    // NOT carry the block (defaultValue is the backend English title), so a
    // missing or renamed type simply falls back with zero drift.
    expect(catalogEn).not.toHaveProperty("nodes");
    const nodesBlock = catalogZh["nodes"] as Record<string, unknown>;
    // r14: `__taskSuffixes` is the only non-string member — the provider
    // long-tail phrase table consumed by nodeDisplayName's composition pass.
    const { __taskSuffixes, ...nodeEntries } = nodesBlock;
    expect(Object.keys(nodeEntries).length).toBeGreaterThan(0);
    for (const [nodeType, name] of Object.entries(nodeEntries)) {
      expect(typeof name).toBe("string");
      expect((name as string).length).toBeGreaterThan(0);
      // Namespace-path shape: at least "ns.Node", segments are identifier-ish
      // (letters/digits/underscore; capitals allowed — backend class names).
      expect(nodeType).toMatch(/^[A-Za-z0-9_]+\.[A-Za-z0-9_.]+$/);
    }
    // r14 contract: the task-suffix table is a non-empty flat object of
    // phrase → zh term. Phrases are matched case-insensitively as i18n keys,
    // so a "." inside one would nest under i18next's keySeparator and break
    // resolution — forbid it here rather than debugging it at render time.
    // Registry node types never start with "__", so the block cannot collide
    // with a real type key either.
    expect(__taskSuffixes).toBeTruthy();
    expect(typeof __taskSuffixes).toBe("object");
    const suffixEntries = Object.entries(
      __taskSuffixes as Record<string, unknown>
    );
    expect(suffixEntries.length).toBeGreaterThanOrEqual(20);
    // r15 raised the r14 sanity cap (80) after the 3D-pipeline/remix/effects/
    // upscaler batches landed (90 entries). r16 then closed the remaining
    // task-word long tail in one pass (closure-round rule: quantify → translate
    // the same round, no "later rounds" tail) — the closing sweep sampled every
    // still-English residual and added every phrase that is a real task word
    // (relight/插帧/扩图/产品照/diarization/i2v-t2v/hyphenated media slugs…),
    // taking the table 90 → 400. The band is a plausibility guard against
    // accidental bulk dumps, not a system limit — move it deliberately.
    expect(suffixEntries.length).toBeLessThanOrEqual(420);
    for (const [phrase, zh] of suffixEntries) {
      expect(typeof zh).toBe("string");
      expect((zh as string).length).toBeGreaterThan(0);
      expect(phrase).not.toMatch(/\./);
      expect(phrase).toMatch(/[A-Za-z]/);
    }
  });

  it("catalog nodeDocs overlay is zh-only, keyed by node type, parser-shaped, with a tags line per entry (r17)", () => {
    // r17 描述面: the overlay keys are node TYPES (same identity contract as
    // the r13 nodes block) and each value is a FULL documentation string in
    // the exact shape formatNodeDocumentation parses — line 1 the localized
    // description, line 2 the verbatim English tag list, then an optional
    // literal "Use cases:" marker with localized bullets. en must NOT carry
    // the block (the raw backend description is the English source), and the
    // tags line stays English by decision (758-entry vocabulary > the ≤150
    // display-coverage threshold, reported r17).
    expect(catalogEn).not.toHaveProperty("nodeDocs");
    const docsBlock = catalogZh["nodeDocs"] as Record<string, unknown>;
    const entries = Object.entries(docsBlock);
    // r17 shipped the 392 core nodes (nodetool.*/lib.* with substantive
    // descriptions). The band guards against accidental bulk dumps and
    // silent shrinkage — move it deliberately with the batch that changes it.
    expect(entries.length).toBeGreaterThanOrEqual(392);
    expect(entries.length).toBeLessThanOrEqual(420);
    for (const [nodeType, doc] of entries) {
      expect(typeof doc).toBe("string");
      const text = doc as string;
      expect(text.length).toBeGreaterThan(0);
      // Namespace-path shape, same regex family as the r13 nodes contract.
      expect(nodeType).toMatch(/^[A-Za-z0-9_]+\.[A-Za-z0-9_.]+$/);
      // Parser shape: line 1 = description (non-empty, not the marker), and
      // every "Use cases:" section head sits alone on its line so the
      // startsWith scan in formatNodeDocumentation finds it.
      const lines = text.split("\n").map((line) => line.trim());
      expect(lines[0].length).toBeGreaterThan(0);
      expect(lines[0].startsWith("Use cases")).toBe(false);
      for (const line of lines) {
        if (line.includes("Use cases:")) {
          expect(line).toBe("Use cases:");
        }
      }
      // A value carrying a Use-cases section must still have a real line 2
      // for the parser's tags field — a marker sitting at lines[1] would
      // surface "Use cases:" itself as a tag chip.
      if (text.includes("Use cases:")) {
        expect(lines[1]).toBeTruthy();
        expect(lines[1]).not.toBe("Use cases:");
      }
    }
  });

  function flattenDeep(obj: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const walk = (node: Record<string, unknown>, prefix: string) => {
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === "object" && value !== null) walk(value as Record<string, unknown>, `${prefix}${key}.`);
        else out[`${prefix}${key}`] = value;
      }
    };
    walk(obj, "");
    return out;
  }
});
