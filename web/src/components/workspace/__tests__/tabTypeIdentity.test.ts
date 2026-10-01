/**
 * @jest-environment jsdom
 */
import { PROJECT_GLYPH } from "../../projects/projectIdentity";
import {
  PROJECT_HOME_GLYPH,
  TYPE_GLYPH,
  seededDocDisplayName,
  tabDisplayTitle
} from "../tabTypeIdentity";

describe("tabDisplayTitle", () => {
  it("labels the project overview tab with the project name", () => {
    expect(
      tabDisplayTitle({ type: "project", title: "Marketing recipes" })
    ).toBe("Marketing recipes");
  });

  it("labels the editor landing surface Home", () => {
    expect(
      tabDisplayTitle({ type: "project-new", title: "Editor home" })
    ).toBe("Home");
  });

  it("keeps document tab titles unchanged", () => {
    expect(
      tabDisplayTitle({ type: "timeline", title: "The Next Tide" })
    ).toBe("The Next Tide");
  });
});

describe("seeded doc-name drift (round-11)", () => {
  it("resolves the runtime chat seed 'New conversation'", () => {
    // GlobalChatStore/chatProtocol/threadUtils default threads to
    // "New conversation", not the blank-document catalog's "New chat".
    expect(seededDocDisplayName("chat", "New conversation")).toBe(
      "New conversation"
    );
    expect(seededDocDisplayName("chat", "New chat")).toBe("Chats");
  });

  it("resolves the 图稿 card's sketch seed and the timeline's untitled seed", () => {
    expect(seededDocDisplayName("sketch", "New image")).toBe("New image");
    expect(seededDocDisplayName("timeline", "Untitled timeline")).toBe(
      "Untitled timeline"
    );
    // Unknown names are user data and pass through verbatim.
    expect(seededDocDisplayName("sketch", "Hero prop painting")).toBe(
      "Hero prop painting"
    );
  });

  it("resolves the round-11 seeds through the zh overlay", async () => {
    const { i18n, ensureLanguageLoaded, resetI18nForTest } = await import(
      "../../../i18n"
    );
    await i18n.changeLanguage("zh-CN");
    await ensureLanguageLoaded("zh-CN");
    try {
      expect(seededDocDisplayName("chat", "New conversation")).toBe("新对话");
      expect(seededDocDisplayName("sketch", "New image")).toBe("新建图像");
      expect(seededDocDisplayName("timeline", "Untitled timeline")).toBe(
        "未命名时间线"
      );
    } finally {
      await resetI18nForTest();
    }
  });
});

describe("TYPE_GLYPH", () => {
  it("does not reuse the project diamond on the Home tab", () => {
    expect(TYPE_GLYPH.project).toBe(PROJECT_HOME_GLYPH);
    expect(TYPE_GLYPH.project).not.toBe(PROJECT_GLYPH);
    expect(TYPE_GLYPH["project-list"]).toBe(PROJECT_GLYPH);
  });
});
