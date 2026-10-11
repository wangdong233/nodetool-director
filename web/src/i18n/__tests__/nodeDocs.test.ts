/**
 * @jest-environment jsdom
 *
 * r17 nodeDocs overlay: nodeDocumentation swaps the raw backend description
 * for the zh catalog's parser-shaped translation at render time; English and
 * any unlisted type fall back to the raw string untouched. jsdom because the
 * overlay resolution rides the real i18n instance.
 */
import { changeAppLanguage, resetI18nForTest } from "../index";
import {
  nodeDocumentation,
  nodeDocSearchAlias
} from "../nodeDocs";
import { formatNodeDocumentation } from "../../stores/formatNodeDocumentation";
import zhCatalog from "../locales/zh-CN/catalog.json";

const DELAY_RAW =
  "Applies a delay effect to an audio file.\naudio, effect, time-based\n\nUse cases:\n- Create echo effects\n- Add spaciousness to sounds";

afterEach(async () => {
  await resetI18nForTest(); // Y4 isolation rule: never leak zh into later tests
});

describe("nodeDocs overlay (r17)", () => {
  it("passes the raw description through in English", () => {
    expect(nodeDocumentation("lib.audio.Delay", DELAY_RAW)).toBe(DELAY_RAW);
    expect(nodeDocSearchAlias("lib.audio.Delay", DELAY_RAW)).toBe("");
  });

  it("returns the zh overlay while zh-CN is active", async () => {
    await changeAppLanguage("zh-CN");
    const zh = nodeDocumentation("lib.audio.Delay", DELAY_RAW);
    expect(zh).toBe((zhCatalog as { nodeDocs: Record<string, string> }).nodeDocs["lib.audio.Delay"]);
    expect(zh).not.toBe(DELAY_RAW);
    // The overlay value must parse through the SAME single pass the display
    // surfaces use — description, tags, use cases all populated.
    const parsed = formatNodeDocumentation(zh);
    expect(parsed.description.length).toBeGreaterThan(0);
    expect(parsed.tags).toContain("audio");
    expect(parsed.useCases.raw).toContain("回声");
    expect(parsed.useCases.raw).not.toContain("echo");
  });

  it("falls back to the raw description for an unlisted type and empty raw", async () => {
    await changeAppLanguage("zh-CN");
    expect(
      nodeDocumentation("lib.audio.MysteryNode", "Mystery description.")
    ).toBe("Mystery description.");
    expect(nodeDocumentation("lib.audio.Delay", "")).toBe("");
    expect(nodeDocSearchAlias("lib.audio.Delay", "")).toBe("");
  });

  it("keeps the source parser structure: tag line and marker survive translation", async () => {
    // Structural parity with the English source: the tags line (line 2) is
    // verbatim English and the "Use cases:" marker is on its own line, so
    // every display surface keeps its single formatNodeDocumentation pass.
    await changeAppLanguage("zh-CN");
    const lines = nodeDocumentation("lib.audio.Delay", DELAY_RAW)
      .split("\n")
      .map((line) => line.trim());
    expect(lines[1]).toBe("audio, effect, time-based");
    expect(lines).toContain("Use cases:");
  });
});
