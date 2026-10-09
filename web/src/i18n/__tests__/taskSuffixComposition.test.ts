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
    ).toBe("Kling O1 视频生视频（参考）");
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
    ).toBe("Bria Fibo Edit 风格重绘");
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

  it("composes the r16 closing vocabulary: the quantified task-word families", async () => {
    await changeAppLanguage("zh-CN");
    // relight/transfer/extend — sampled senses: relight=重打光, pose/motion
    // transfer=姿态/动作迁移 (NOT 风格迁移, which stays "Style Transfer"),
    // extend on these catalogs is video-duration extension=视频延长.
    expect(nodeDisplayName("fal.image.Bria", "Bria Fibo Edit Relight")).toBe(
      "Bria Fibo Edit 重打光"
    );
    expect(nodeDisplayName("fal.image.Leffa", "Leffa Pose Transfer")).toBe(
      "Leffa 姿态迁移"
    );
    expect(
      nodeDisplayName("fal.video.Moonvalley", "Moonvalley Marey Motion Transfer")
    ).toBe("Moonvalley Marey 动作迁移");
    expect(nodeDisplayName("fal.video.Ltx", "Ltx Video 13b Dev Extend")).toBe(
      "Ltx Video 13b Dev 视频延长"
    );
    // Detection/depth/caption/OCR — r13 vocabulary reused where it exists.
    expect(
      nodeDisplayName("fal.vision.Moondream", "Moondream 2Object Detection")
    ).toBe("Moondream 2目标检测");
    expect(nodeDisplayName("fal.image.FluxPro", "Flux Pro Depth")).toBe(
      "Flux Pro 深度估计"
    );
    expect(
      nodeDisplayName("fal.vision.Florence", "Florence 2Detailed Caption")
    ).toBe("Florence 2Detailed 图像描述");
    expect(nodeDisplayName("fal.video.Auto", "Auto Caption")).toBe("自动字幕");
    expect(nodeDisplayName("replicate.image.ocr.Datalab", "Datalab OCR")).toBe(
      "Datalab OCR 文字识别"
    );
    expect(nodeDisplayName("mistral.vision.OCR", "OCR")).toBe("OCR 文字识别");
    // Avatar/portrait/character — talking-avatar products are 数字人, the
    // MultiTalk multi-speaker variant gets its own longer entry.
    expect(nodeDisplayName("fal.image_to_video.Hunyuan", "Hunyuan Avatar")).toBe(
      "Hunyuan 数字人"
    );
    expect(
      nodeDisplayName("fal.image_to_video.AIMulti", "AI Avatar Multi")
    ).toBe("AI 多人");
    expect(nodeDisplayName("fal.image_to_video.Live", "Live Portrait")).toBe(
      "Live 人像"
    );
    expect(nodeDisplayName("fal.image.Ideogram", "Ideogram Character")).toBe(
      "Ideogram 角色"
    );
    // Restoration/photo compounds — longest phrase wins over bare 修复.
    expect(
      nodeDisplayName("fal.image.ImageApps", "Image Apps V2Photo Restoration")
    ).toBe("Image Apps V2照片修复");
    expect(
      nodeDisplayName("replicate.image.enhance.Old", "Old Photos Restoration")
    ).toBe("Old Photos 修复");
    expect(
      nodeDisplayName("fal.image.Pixelcut", "Pixelcut Product Photo")
    ).toBe("Pixelcut 产品照");
    // Mask/modify/resolution/prompt/reference families.
    expect(
      nodeDisplayName("fal.image.Finegrain", "Finegrain Eraser Mask")
    ).toBe("Finegrain 擦除蒙版");
    expect(nodeDisplayName("fal.image.Luma", "Luma Photon Modify")).toBe(
      "Luma Photon 修改"
    );
    expect(
      nodeDisplayName("fal.image.ImageAppsAge", "Image Apps V2Age Modify")
    ).toBe("Image Apps V2年龄修改");
    expect(
      nodeDisplayName("fal.image_to_video.Minimax", "Minimax Video 01Subject Reference")
    ).toBe("Minimax Video 01主体参考");
    // Frame family: extraction is 抽帧 (NOT 插帧 — that is interpolation).
    expect(
      nodeDisplayName("fal.image.Ffmpeg", "Ffmpeg Api Extract Frame")
    ).toBe("Ffmpeg Api 抽帧");
    expect(nodeDisplayName("fal.video.AMT", "AMT Frame Interpolation")).toBe(
      "AMT 插帧"
    );
    expect(
      nodeDisplayName("higgsfield.video.Kling", "Kling O3 First/Last Frame")
    ).toBe("Kling O3 首尾帧");
  });

  it("composes the r16 scattered long tail: media conversion, audio, product, hyphenated slugs", async () => {
    await changeAppLanguage("zh-CN");
    // Media-word finals the r14 table missed.
    expect(
      nodeDisplayName("fal.image.Ffmpeg", "Ffmpeg Api Images To Video")
    ).toBe("Ffmpeg Api 多图生视频");
    expect(nodeDisplayName("fal.audio.Ace", "ACE Step Prompt To Audio")).toBe(
      "ACE Step 提示词生音频"
    );
    expect(
      nodeDisplayName("fal.text_to_speech.Sonilo", "Sonilo V11Text To Music")
    ).toBe("Sonilo V11文生音乐");
    expect(
      nodeDisplayName("fal.audio_to_audio.Sfx", "Sfx 16Inpaint Audio")
    ).toBe("Sfx 16音频补全");
    // Voice/speech family.
    expect(
      nodeDisplayName("fal.audio_to_audio.Dia", "Dia Tts Voice Clone")
    ).toBe("Dia Tts 语音克隆");
    expect(nodeDisplayName("fal.text_to_speech.Gemini", "Gemini Tts")).toBe(
      "Gemini TTS 语音合成"
    );
    expect(
      nodeDisplayName("replicate.audio.transcribe.WhisperD", "Whisper Diarization")
    ).toBe("Whisper 说话人分离");
    // Product/e-commerce family.
    expect(nodeDisplayName("fal.image.Embed", "Embed Product")).toBe("产品植入");
    expect(
      nodeDisplayName("fal.image.QwenGallery", "Qwen Image Edit 2509Lora Gallery Group Photo")
    ).toBe("Qwen Image Edit 2509Lora Gallery 合照");
    // Hyphenated provider slugs resolve through their own table entries
    // (space-phrases cannot match "Image-to-Video"); the split needs a word
    // boundary before the phrase, so a fully-hyphenated slug keeps English.
    expect(
      nodeDisplayName("kie.video.MiniMax", "MiniMax H3 Image-to-Video")
    ).toBe("MiniMax H3 图生视频");
    expect(
      nodeDisplayName("fal.video.HappyHorse", "HappyHorse-1-1 image-to-video")
    ).toBe("HappyHorse-1-1 图生视频");
    // Post-processing filters.
    expect(
      nodeDisplayName("fal.image.Post", "Post Processing Chromatic Aberration")
    ).toBe("Post Processing 色差");
    expect(
      nodeDisplayName("fal.image.Nafnet", "Nafnet Denoise")
    ).toBe("Nafnet 降噪");
  });

  it("keeps the r16 guard decisions English (generic-word model parts, collapsed lowercase)", async () => {
    await changeAppLanguage("zh-CN");
    // "Video" is a bare media word, not a model name: the model+suffix shape
    // refuses to fabricate one, so the title stays English by design.
    expect(
      nodeDisplayName("replicate.video.enhance.VIR", "Video Increase Resolution")
    ).toBe("Video Increase Resolution");
    expect(
      nodeDisplayName("replicate.video.SpeechStream", "Speech To Text Stream")
    ).toBe("Speech To Text Stream");
    // Lowercase collapsed tail ("Image 2svg") never splits — the capital
    // boundary guard rejects it. Same for fully-hyphenated slugs whose joiner
    // character is "-", and for lowercase glued forms ("flash-image-to-video").
    expect(nodeDisplayName("fal.image.Image2Svg", "Image 2svg")).toBe(
      "Image 2svg"
    );
    expect(
      nodeDisplayName("kie.audio.Slug", "elevenlabs/audio-isolation")
    ).toBe("elevenlabs/audio-isolation");
    expect(
      nodeDisplayName("kie.video.HorseSlug", "happyhorse-image-to-video")
    ).toBe("happyhorse-image-to-video");
    // SR-baked model names (AnimeSR/InvSR/AuraSR) are proper nouns — pulling
    // "SR" into the table would mangle the model identity.
    expect(nodeDisplayName("replicate.image.upscale.AnimeSR", "Anime SR")).toBe(
      "Anime SR"
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
