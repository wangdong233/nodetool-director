import commonEn from "../locales/en/common.json";
import navEn from "../locales/en/nav.json";
import settingsEn from "../locales/en/settings.json";
import commonZh from "../locales/zh-CN/common.json";
import navZh from "../locales/zh-CN/nav.json";
import settingsZh from "../locales/zh-CN/settings.json";
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
  const suites: Array<[string, Record<string, unknown>, Record<string, unknown>]> = [
    ["common", commonEn, commonZh],
    ["nav", navEn, navZh],
    ["settings", settingsEn, settingsZh],
  ];

  it.each(suites)("%s: en and zh-CN carry exactly the same key set", (_ns, en, zh) => {
    expect(new Set(flatten(zh as Record<string, unknown>))).toEqual(
      new Set(flatten(en as Record<string, unknown>))
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
    const collect = (node: object, ns: string, prefix: string) => {
      for (const [k, v] of Object.entries(node)) {
        const p = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object") collect(v as object, ns, p);
        else leafKeys.push([ns, p]);
      }
    };
    collect(commonEn, "common", "");
    collect(navEn, "nav", "");
    collect(settingsEn, "settings", "");

    const dead: string[] = [];
    for (const [ns, key] of leafKeys) {
      // A full-literal reference must match the FULL key path and END at a
      // closing quote/backtick. A bare substring check is wrong twice over:
      // "common:action.close" passes as a substring of "common:action.closeTab"
      // (r16-R1), and it also short-circuits before the boundary test can
      // run. The prefix-free sibling reference grants nothing to other keys.
      const escPath = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const fullLiteral = new RegExp(
        `${ns.replace("/", "\\/")}:${escPath}["\`]`
      );
      if (fullLiteral.test(allSource)) continue;
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
        "nav:settings.docsTopics.",
        "settings:general.",
        "settings:vaults.",
        "settings:storage.",
        "settings:defModels."
      ];
      let dynamicallyUsed = false;
      const parts = key.split(".");
      const esc = parts[parts.length - 1].replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      for (const prefix of DYNAMIC_SUBTREES) {
        if (
          allSource.includes(prefix) &&
          `${ns}:${parts.slice(0, -1).join(".")}.`.startsWith(prefix)
        ) {
          const literal = new RegExp(`["'\`]${esc}["'\`]`);
          const objectKey = new RegExp(`[{,]\s*["'\`]?${esc}["'\`]?\s*[:=]`);
          if (literal.test(allSource) || objectKey.test(allSource)) {
            dynamicallyUsed = true;
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
