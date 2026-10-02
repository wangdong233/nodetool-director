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
 * technique proper nouns, tier tails, dangling connectors, generic-word
 * model parts).
 *
 * r15: whole-title task phrases now localize ("Image Upscaler" → "图像超分")
 * while the model+suffix guards stay; the 3D pipeline, remix/effects/style
 * and upscaler vocabularies joined the table; Redux/Instruct are pinned as
 * technique proper nouns that never enter it.
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

  it("localizes a whole-title task phrase (r15: no model part, no brand to protect)", async () => {
    await changeAppLanguage("zh-CN");
    // The entire title is the task — r14 kept these English, r15 adjudicated
    // that a descriptive task name with no model segment has no brand to
    // protect, so the phrase table owns the whole title.
    expect(nodeDisplayName("replicate.image.RmBg", "Remove Background")).toBe(
      "去背景"
    );
    expect(
      nodeDisplayName("replicate.audio.Asr", "Audio Super Resolution")
    ).toBe("音频超分");
    expect(
      nodeDisplayName("replicate.video.enhance.Vrb", "Video Remove Background")
    ).toBe("视频去背景");
    expect(nodeDisplayName("atlascloud.image.Upscaler", "Image Upscaler")).toBe(
      "图像超分"
    );
    expect(nodeDisplayName("atlascloud.video.Upscaler", "Video Upscaler")).toBe(
      "视频超分"
    );
    expect(
      nodeDisplayName("fal.video_to_video.Bgr", "Video Background Removal")
    ).toBe("视频去背景");
  });

  it("keeps the mis-split guards for the model+suffix shape (r15 counter-direction)", async () => {
    await changeAppLanguage("zh-CN");
    // A model part left ending on "To" would read "…To 超分" — rejected.
    expect(nodeDisplayName("fal.video.Weird", "Acme Motion To Upscale")).toBe(
      "Acme Motion To Upscale"
    );
    // A bare media word is still a category, not a model name: the
    // model+suffix shape must not fabricate a model out of "Music"/"Photo".
    expect(nodeDisplayName("fal.audio.X", "Music Upscale")).toBe(
      "Music Upscale"
    );
    expect(nodeDisplayName("fal.image.X", "Photo Super Resolution")).toBe(
      "Photo Super Resolution"
    );
    // Lowercase mid-word runs never split: "Omnipart" is a model name, not
    // "Omni" + "Part".
    expect(nodeDisplayName("fal.image_to_3d.Omnipart", "Omnipart")).toBe(
      "Omnipart"
    );
  });

  it("keeps technique proper nouns and tier/version tails English (r15 rule 1)", async () => {
    await changeAppLanguage("zh-CN");
    // Redux is the official FLUX Redux technique family name; Instruct is
    // the InstructPix2Pix-style instruction-editing technique name (and the
    // instruction-tuned LLM variant tail) — proper nouns, never in the table.
    expect(nodeDisplayName("fal.image.Redux", "Flux 1Dev Redux")).toBe(
      "Flux 1Dev Redux"
    );
    expect(
      nodeDisplayName("replicate.image.enhance.InstructIR", "Instruct IR")
    ).toBe("Instruct IR");
    expect(
      nodeDisplayName("replicate.text.Llama", "Llama 3 8B Instruct")
    ).toBe("Llama 3 8B Instruct");
  });

  it("composes the r15 vocabulary: remix, effects, style, upscaler families", async () => {
    await changeAppLanguage("zh-CN");
    expect(nodeDisplayName("atlascloud.image.Reve", "Reve 2.1 — Remix")).toBe(
      "Reve 2.1 — 重混"
    );
    // Longest phrase absorbs the leading task segment (no dangling "To");
    // collapsed form welds onto the version digits without a space.
    expect(
      nodeDisplayName("fal.video.SoraRemix", "Sora 2Video To Video Remix")
    ).toBe("Sora 2视频生视频重混");
    expect(
      nodeDisplayName("fal.image.IdeoRemix", "Ideogram Character Remix")
    ).toBe("Ideogram 角色重混");
    expect(
      nodeDisplayName("fal.image.Apps", "Image Apps V2Photography Effects")
    ).toBe("Image Apps V2摄影特效");
    expect(
      nodeDisplayName("fal.text_to_audio.Cass", "Cassetteai Video Sound Effects Generator")
    ).toBe("Cassetteai 视频音效生成器");
    expect(
      nodeDisplayName("fal.image.Plushie", "Image Editing Plushie Style")
    ).toBe("Image Editing 毛绒风格");
    expect(
      nodeDisplayName("fal.training.Recraft", "Recraft V4 Pro Create Style")
    ).toBe("Recraft V4 Pro 创建风格");
    // Collapsed "V3Create Style" splits at the capital C.
    expect(
      nodeDisplayName("fal.training.Recraft3", "Recraft V3Create Style")
    ).toBe("Recraft V3创建风格");
    expect(
      nodeDisplayName("fal.image_to_image.Bria", "Bria Fibo Edit Restyle")
    ).toBe("Bria Fibo Edit 风格重塑");
    expect(
      nodeDisplayName("fal.video.Stylize", "Byte Dance Video Stylize")
    ).toBe("Byte Dance Video 风格化");
    expect(
      nodeDisplayName("fal.image.LumaReframe", "Luma Photon Reframe")
    ).toBe("Luma Photon 重新取景");
    // Model+suffix shape for the upscaler family (longest first).
    expect(
      nodeDisplayName("atlascloud.image.Tencent", "Tencent Image Upscaler")
    ).toBe("Tencent 图像超分");
    expect(
      nodeDisplayName("replicate.image.Clarity", "Clarity Pro Upscaler")
    ).toBe("Clarity Pro 超分");
    expect(
      nodeDisplayName("fal.image.Diff", "Flux General Differential Diffusion")
    ).toBe("Flux General 差分扩散");
  });

  it("composes the r15 3D pipeline vocabulary (绑骨/重拓扑/重贴图/多色…)", async () => {
    await changeAppLanguage("zh-CN");
    expect(nodeDisplayName("fal.3d.Meshy", "Meshy Rigging")).toBe(
      "Meshy 绑骨"
    );
    expect(nodeDisplayName("fal.3d.Tripo", "Tripo 3d Remesh")).toBe(
      "Tripo 3d 重拓扑"
    );
    // Collapsed version+task forms weld with no invented space.
    expect(nodeDisplayName("fal.3d.Meshy5", "Meshy V5Retexture")).toBe(
      "Meshy V5重贴图"
    );
    expect(nodeDisplayName("fal.3d.MeshyV5", "Meshy V5Remesh")).toBe(
      "Meshy V5重拓扑"
    );
    expect(nodeDisplayName("fal.3d.Hunyuan", "Hunyuan Part")).toBe(
      "Hunyuan 部件"
    );
    expect(nodeDisplayName("fal.3d.HunyuanV31", "Hunyuan 3d V31Part")).toBe(
      "Hunyuan 3d V31部件"
    );
    expect(nodeDisplayName("fal.3d.Hi", "Hi 3d Multicolor")).toBe(
      "Hi 3d 多色"
    );
    expect(nodeDisplayName("fal.3d.HiSplit", "Hi 3d Split")).toBe(
      "Hi 3d 分割"
    );
    expect(nodeDisplayName("fal.3d.HiTex", "Hi 3d Texture")).toBe(
      "Hi 3d 纹理"
    );
    // Longest first: "Smart Topology" outranks bare "Topology".
    expect(
      nodeDisplayName("fal.3d.HunyuanTopo", "Hunyuan 3d V31Smart Topology")
    ).toBe("Hunyuan 3d V31智能拓扑");
    expect(nodeDisplayName("fal.3d.Sam", "Sam 33D Align")).toBe(
      "Sam 33D 对齐"
    );
    // Image-domain segmentation shares the term.
    expect(nodeDisplayName("fal.image.Sam2", "Sam 2Auto Segment")).toBe(
      "Sam 2Auto 分割"
    );
  });

  it("composes a leading task phrase so no mid-title connector dangles", async () => {
    await changeAppLanguage("zh-CN");
    // Trailing "Lip Sync" alone would strand "video to video" mid-title;
    // the longer phrase table entry absorbs it.
    expect(
      nodeDisplayName("kie.video.Volc", "Volcengine video to video lip sync")
    ).toBe("Volcengine 视频生视频对口型");
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
