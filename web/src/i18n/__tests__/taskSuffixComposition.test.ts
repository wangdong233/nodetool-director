/**
 * @jest-environment jsdom
 *
 * r14 contract: provider-catalog task-suffix composition. The long-tail
 * model catalogs render as "Model — 文生图" — brand model names stay Latin
 * (the established MiniMax 式 half-translation), the trailing task phrase
 * resolves through the zh `nodes.__taskSuffixes` phrase table. These tests
 * pin the composition on synthetic titles covering every probe-discovered
 * shape: em-dash delimited (atlascloud/together/higgsfield), hyphen
 * delimited (kie), space-collapsed (fal/replicate, "20Image" capitals split)
 * and the deliberate English fallbacks (pure model names, unknown suffixes,
 * whole-title tasks, dangling connectors).
 */
import { changeAppLanguage, resetI18nForTest } from "../index";
import { nodeDisplayName, nodeSearchAlias } from "../nodeDisplayName";
import catalogZh from "../locales/zh-CN/catalog.json";

// A type that must NEVER compose — its explicit r13 overlay key wins.
const OVERLAY_TYPE = "lib.audio.Bitcrush";

afterEach(async () => {
  await resetI18nForTest(); // Y4 isolation: never leak zh into later tests
});

describe("task-suffix composition (r14)", () => {
  it("composes the em-dash shape from the probe: model stays Latin, suffix localizes", async () => {
    expect(nodeDisplayName("fal.image.X", "Lyria 2")).toBe("Lyria 2"); // en: identity
    await changeAppLanguage("zh-CN");
    expect(
      nodeDisplayName("together.image.Flux2Flex", "FLUX.2 Flex — Text to Image")
    ).toBe("FLUX.2 Flex — 文生图");
    expect(
      nodeDisplayName("atlascloud.video.Cosmos", "Cosmos 3 Super — Text to Image")
    ).toBe("Cosmos 3 Super — 文生图");
  });

  it("composes the hyphen (kie) and space-collapsed (fal/replicate) shapes", async () => {
    await changeAppLanguage("zh-CN");
    expect(
      nodeDisplayName("kie.image.Seedream4", "Seedream4.0 - Text to Image")
    ).toBe("Seedream4.0 - 文生图");
    // Collapsed form: version digits weld onto the phrase, the capital "I"
    // marks the split, and no space is invented ("20图生视频").
    expect(
      nodeDisplayName("fal.video.Seedance", "Bytedance Seedance 20Image To Video")
    ).toBe("Bytedance Seedance 20图生视频");
    expect(nodeDisplayName("fal.image.Qwen", "Qwen Image Max Edit")).toBe(
      "Qwen Image Max 编辑"
    );
  });

  it("matches case-insensitively across provider casing conventions", async () => {
    await changeAppLanguage("zh-CN");
    expect(
      nodeDisplayName("kie.audio.Gemini", "Gemini 3.1 Flash Text to speech")
    ).toBe("Gemini 3.1 Flash TTS 语音合成");
    expect(
      nodeDisplayName("kie.image.Flux2", "Flux-2 - Image to Image")
    ).toBe("Flux-2 - 图生图");
  });

  it("prefers the longest matching phrase (tiered variants)", async () => {
    await changeAppLanguage("zh-CN");
    expect(
      nodeDisplayName("fal.video.KlingRef", "Kling O1 Video To Video Reference")
    ).toBe("Kling O1 视频生视频(参考)");
    expect(
      nodeDisplayName("fal.video.KlingEdit", "Kling Video O1Standard Video To Video Edit")
    ).toBe("Kling Video O1Standard 视频生视频编辑");
  });

  it("keeps English for pure model names, unknown suffixes, and tier tails", async () => {
    await changeAppLanguage("zh-CN");
    // Pure model name — correct English retention, zero work by design.
    expect(nodeDisplayName("fal.image.FluxDev", "FLUX.1 Dev")).toBe("FLUX.1 Dev");
    expect(nodeDisplayName("replicate.video.Lyria", "Lyria 3 Pro")).toBe("Lyria 3 Pro");
    // LoRA trainer tails and unknown phrases never compose.
    expect(
      nodeDisplayName("fal.lora.WanTrainer", "Wan 22Image To Video Lora")
    ).toBe("Wan 22Image To Video Lora");
    expect(nodeDisplayName("fal.image.Mystery", "Grok Imagine 2.0")).toBe(
      "Grok Imagine 2.0"
    );
  });

  it("never composes a whole-title task or a dangling connector split", async () => {
    await changeAppLanguage("zh-CN");
    // The entire title is the task — no model part, so it stays English
    // (these are generic tool nodes, not provider model entries).
    expect(nodeDisplayName("replicate.image.RmBg", "Remove Background")).toBe(
      "Remove Background"
    );
    // A model part left ending on "To" would read "…To 超分" — rejected.
    expect(nodeDisplayName("fal.video.Weird", "Acme Motion To Upscale")).toBe(
      "Acme Motion To Upscale"
    );
  });

  it("an explicit overlay key always wins over composition", async () => {
    await changeAppLanguage("zh-CN");
    // Bitcrush has a direct r13 entry; even a suffix-shaped title must not
    // compose when the type resolves through the overlay.
    expect(nodeDisplayName(OVERLAY_TYPE, "Bitcrush")).toBe("比特粉碎");
    const overlayValue = (catalogZh.nodes as Record<string, unknown>)[
      OVERLAY_TYPE
    ];
    expect(overlayValue).toBe("比特粉碎");
  });

  it("feeds nodeSearchAlias so zh queries hit provider entries", async () => {
    expect(
      nodeSearchAlias("together.image.Flux2Flex", "FLUX.2 Flex — Text to Image")
    ).toBe("");
    await changeAppLanguage("zh-CN");
    expect(
      nodeSearchAlias("together.image.Flux2Flex", "FLUX.2 Flex — Text to Image")
    ).toBe("FLUX.2 Flex — 文生图");
    // Pure model names contribute no alias — English ranking untouched.
    expect(nodeSearchAlias("replicate.video.Lyria", "Lyria 3 Pro")).toBe("");
  });

  it("recomposes after the lazy zh bundle lands (no stale memo)", async () => {
    // English first (bundle may or may not be loaded yet — identity holds).
    expect(nodeDisplayName("fal.image.X", "Veo 3Image To Video")).toBe(
      "Veo 3Image To Video"
    );
    await changeAppLanguage("zh-CN");
    expect(nodeDisplayName("fal.image.X", "Veo 3Image To Video")).toBe(
      "Veo 3图生视频"
    );
  });
});
