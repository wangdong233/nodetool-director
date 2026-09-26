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
    expect(i18n.t("common:action.save")).toBe("Save");
  });

  it("switches to zh-CN, translates, and syncs <html lang> + storage", async () => {
    await changeAppLanguage("zh-CN");
    expect(i18n.t("common:action.save")).toBe("保存");
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
    expect(i18n.t("common:action.save")).toBe("Save");
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
