/**
 * r31b skill-body overlay — hook behavior.
 *
 * Exercises `createSkillDocIndex` + `createSkillDocOverlay` from the core
 * against fixture loaders (the same code path the Vite glob entry and the Jest
 * fs twin both bind). The invariants mirror the SkillSurface contract:
 *
 *  - English always renders the original body byte-for-byte.
 *  - zh-CN swaps in the translation for a slug that has one, once its chunk
 *    resolves (the original renders while it is in flight — progressive, no
 *    blank viewer).
 *  - zh-CN with no translation (or a chunk that fails to load) keeps the
 *    original.
 *  - switching back to English restores the original without remount.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach } from "@jest/globals";
import {
  createSkillDocIndex,
  createSkillDocOverlay,
  skillDocSlug
} from "../skillDocsCore";
import { changeAppLanguage, resetI18nForTest } from "../index";

afterEach(async () => {
  await resetI18nForTest(); // Y4 isolation rule: never leak zh into later tests
});

function makeOverlay(loaders: Record<string, () => Promise<string>>) {
  return createSkillDocOverlay(createSkillDocIndex(loaders));
}

describe("skillDocSlug", () => {
  it("derives the slug from glob paths and bare keys alike", () => {
    expect(skillDocSlug("./locales/zh-CN/skillDocs/launch-kit.md")).toBe("launch-kit");
    expect(skillDocSlug("launch-kit")).toBe("launch-kit");
  });
});

describe("useSkillDocOverlay", () => {
  it("renders the original body verbatim in English", async () => {
    await changeAppLanguage("en");
    const useOverlay = makeOverlay({
      "launch-kit": () => Promise.resolve("# 发布物料包\n\n正文。")
    });
    const { result } = renderHook(() => useOverlay("launch-kit", "# Launch kit\n\nBody."));
    expect(result.current).toBe("# Launch kit\n\nBody.");
  });

  it("swaps in the zh document once the chunk resolves, without remount", async () => {
    const useOverlay = makeOverlay({
      "launch-kit": () => Promise.resolve("# 发布物料包")
    });
    const { result, rerender } = renderHook(() => useOverlay("launch-kit", "# Launch kit"));
    await act(async () => {
      await changeAppLanguage("zh-CN");
    });
    await waitFor(() => {
      expect(result.current).toBe("# 发布物料包");
    });
    // Switching back to English restores the original through the same hook
    // instance (languageChanged re-resolution, not a remount).
    await act(async () => {
      await changeAppLanguage("en");
    });
    rerender();
    expect(result.current).toBe("# Launch kit");
  });

  it("falls back to the original for an untranslated slug in zh", async () => {
    await changeAppLanguage("zh-CN");
    const useOverlay = makeOverlay({
      "launch-kit": () => Promise.resolve("# 发布物料包")
    });
    const { result } = renderHook(() => useOverlay("nodetool-sketch", "# Original body"));
    expect(result.current).toBe("# Original body");
  });

  it("falls back to the original when the chunk fails to load", async () => {
    await changeAppLanguage("zh-CN");
    const useOverlay = makeOverlay({
      "launch-kit": () => Promise.reject(new Error("chunk load error"))
    });
    const { result } = renderHook(() => useOverlay("launch-kit", "# Original body"));
    // Give the rejected promise a macrotask to settle — the fallback must
    // survive it, never render empty.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(result.current).toBe("# Original body");
  });

  it("treats an empty document as untranslated", async () => {
    await changeAppLanguage("zh-CN");
    const useOverlay = makeOverlay({
      "launch-kit": () => Promise.resolve("   ")
    });
    const { result } = renderHook(() => useOverlay("launch-kit", "# Original body"));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(result.current).toBe("# Original body");
  });

  it("renders the original for a null slug (user skills, pending row)", async () => {
    await changeAppLanguage("zh-CN");
    const useOverlay = makeOverlay({
      "launch-kit": () => Promise.resolve("# 发布物料包")
    });
    const { result } = renderHook(() => useOverlay(null, "# My own skill"));
    expect(result.current).toBe("# My own skill");
  });
});
