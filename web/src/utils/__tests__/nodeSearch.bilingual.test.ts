/**
 * @jest-environment jsdom
 *
 * r13 hard requirement: node search must be bilingual — the English title and
 * node_type stay indexed (searching "bitcrush" finds Bitcrush) while the zh
 * display-name alias joins the searchable fields (searching "比特" or "滤波"
 * finds the same nodes). jsdom because the alias resolution rides the real
 * i18n instance, whose switch pipeline touches document/localStorage.
 */
import { changeAppLanguage, resetI18nForTest } from "../../i18n";
import { rankSearchNodes } from "../nodeSearch";
import { nodeDisplayName, nodeSearchAlias } from "../../i18n/nodeDisplayName";
import type { NodeMetadata } from "../../stores/ApiTypes";

function makeNode(overrides: Partial<NodeMetadata> = {}): NodeMetadata {
  return {
    title: "Test Node",
    node_type: "test.TestNode",
    namespace: "test",
    description: "",
    properties: [],
    outputs: [],
    layout: "default",
    ...overrides
  } as NodeMetadata;
}

// A slice of the real catalog — enough to prove English and Chinese queries
// converge on the same nodes from either field.
const CATALOG: NodeMetadata[] = [
  makeNode({
    title: "Bitcrush",
    node_type: "lib.audio.Bitcrush",
    namespace: "lib.audio",
    description: "Applies a bitcrushing effect to an audio file."
  }),
  makeNode({
    title: "Low Pass Filter",
    node_type: "lib.audio.LowPassFilter",
    namespace: "lib.audio",
    description: "Applies a low-pass filter to attenuate frequencies."
  }),
  makeNode({
    title: "Reverb",
    node_type: "lib.audio.Reverb",
    namespace: "lib.audio",
    description: "Applies a reverb effect to an audio file."
  })
];

afterEach(async () => {
  await resetI18nForTest(); // Y4 isolation: never leak zh into later tests
});

describe("node search bilingual hits (r13)", () => {
  it("English title and node_type queries still hit with zh active", async () => {
    await changeAppLanguage("zh-CN");
    const byTitle = rankSearchNodes(CATALOG, "bitcrush");
    expect(byTitle.map((n) => n.node_type)).toContain("lib.audio.Bitcrush");
    // node_type stays searchable verbatim (data-layer identity).
    const byType = rankSearchNodes(CATALOG, "LowPassFilter");
    expect(byType.map((n) => n.node_type)).toContain("lib.audio.LowPassFilter");
  });

  it("Chinese queries hit the zh display-name alias", async () => {
    await changeAppLanguage("zh-CN");
    const byZhPrefix = rankSearchNodes(CATALOG, "比特");
    expect(byZhPrefix.map((n) => n.node_type)).toContain("lib.audio.Bitcrush");
    // Mid-word Chinese substrings must hit too ("滤波" inside "低通滤波器") —
    // the base ranker scores by substring, so the alias covers non-prefix hits
    // the trie/BM25 token paths cannot.
    const byZhSubstring = rankSearchNodes(CATALOG, "滤波");
    expect(byZhSubstring.map((n) => n.node_type)).toContain(
      "lib.audio.LowPassFilter"
    );
    expect(byZhSubstring.map((n) => n.node_type)).not.toContain(
      "lib.audio.Reverb"
    );
  });

  it("English queries rank unchanged while zh is inactive (alias empty)", () => {
    // nodeSearchAlias must contribute nothing in English so English hit
    // weights are exactly what they were before the alias existed.
    expect(nodeSearchAlias("lib.audio.Bitcrush", "Bitcrush")).toBe("");
  });

  it("nodeDisplayName resolves zh for a known type and English otherwise", async () => {
    expect(nodeDisplayName("lib.audio.Bitcrush", "Bitcrush")).toBe("Bitcrush");
    await changeAppLanguage("zh-CN");
    expect(nodeDisplayName("lib.audio.Bitcrush", "Bitcrush")).toBe("比特粉碎");
    // A type with no zh entry falls back to the backend title, never the key.
    expect(nodeDisplayName("lib.audio.MysteryNode", "Mystery Node")).toBe(
      "Mystery Node"
    );
  });
});
