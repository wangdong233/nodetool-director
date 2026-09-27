/**
 * appbuilder i18n contract tests.
 *
 * The ATTRS module table (components/appbuilder/i18nAttrs.ts) is the source
 * of truth: the en catalog must mirror it exactly, the zh catalog must carry
 * the same key set, and tAttr must fall back to the passed English text for
 * strings the table does not know (author-edited values, future labels).
 */
import { APPBUILDER_ATTRS, tAttr, tAttrTpl } from "../i18nAttrs";
import enAttrs from "../../../i18n/locales/en/appbuilder.json";
import zhAttrs from "../../../i18n/locales/zh-CN/appbuilder.json";
import { changeAppLanguage, resetI18nForTest } from "../../../i18n";

const flatten = (obj: Record<string, unknown>, prefix = ""): string[] =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? flatten(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );

afterEach(async () => {
  await resetI18nForTest();
});

describe("appbuilder attrs catalog", () => {
  it("en catalog mirrors the ATTRS table exactly", () => {
    expect(enAttrs.attrs).toEqual(APPBUILDER_ATTRS);
  });

  it("zh-CN catalog carries exactly the same key set as en", () => {
    expect(new Set(flatten(zhAttrs as Record<string, unknown>))).toEqual(
      new Set(flatten(enAttrs as Record<string, unknown>))
    );
  });

  it("zh values are non-empty strings", () => {
    for (const value of Object.values(
      (zhAttrs as { attrs: Record<string, unknown> }).attrs
    )) {
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    }
  });

  it("table English values are unique (reverse lookup is unambiguous)", () => {
    const values = Object.values(APPBUILDER_ATTRS);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("tAttr", () => {
  it("translates a table string after switching to zh-CN", async () => {
    expect(tAttr("Run workflow")).toBe("Run workflow"); // en passthrough
    await changeAppLanguage("zh-CN");
    expect(tAttr("Run workflow")).toBe("运行工作流");
    expect(tAttr("Height (px)")).toBe("高度（px）");
  });

  it("falls back to the passed text for unknown strings", async () => {
    await changeAppLanguage("zh-CN");
    expect(tAttr("my custom authored label")).toBe("my custom authored label");
  });

  it("interpolates template keys with runtime values", async () => {
    expect(tAttrTpl("bindingOptionOutput", "output · {{label}}", { label: "score" })).toBe(
      "output · score"
    );
    await changeAppLanguage("zh-CN");
    expect(tAttrTpl("bindingOptionOutput", "output · {{label}}", { label: "score" })).toBe(
      "输出 · score"
    );
  });
});
