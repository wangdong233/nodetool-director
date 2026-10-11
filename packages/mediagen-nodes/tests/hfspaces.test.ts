import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MEDIAGEN_NODES, MediagenChannelError } from "../src/index.js";
import { hfspacesAdapters } from "../src/channels/hfspaces/adapter.js";

// Real magic prefixes so mime detection and byte assertions see genuine
// signatures (assertion-provenance: PNG/MP4 signature, not implementation output).
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PNG_B64 = Buffer.from(PNG_BYTES).toString("base64");
const MP4_BYTES = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
const MP4_B64 = Buffer.from(MP4_BYTES).toString("base64");
// Real WAV magic prefix (RIFF....WAVE) for the audio payload assertions.
const WAV_BYTES = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]);
const WAV_B64 = Buffer.from(WAV_BYTES).toString("base64");

// Wire contract constants (hfspaces.ts L1 source: subdomains, api names, slots).
const Z_IMAGE_CALL = "https://tongyi-mai-z-image-turbo.hf.space/gradio_api/call/generate";
const WAN22_CALL = "https://prithivmlmods-wan2-2-fast.hf.space/gradio_api/call/generate_video";
const MINIMAX_CALL = "https://multimodalart-minimax-h3.hf.space/gradio_api/call/generate";
// Fixed resolution slot of the minimax-h3 signature (U+00B7 separator on the wire).
const MINIMAX_RESOLUTION = "960x544 · 16:9 fast";

function nodeByType(type: string) {
  const found = MEDIAGEN_NODES.find((node) => node.nodeType === type);
  if (!found) throw new Error(`node type ${type} not found`);
  return found;
}

/** One gradio SSE frame: "event: X\ndata: Y\n\n" (data:null literal for the quota reject). */
function sseFrame(event: string, data: string | null): string {
  return `event: ${event}\ndata: ${data === null ? "null" : data}\n\n`;
}

/** A 200 Response whose body streams the given chunks verbatim. */
function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

function sseResponse(frames: string[]): Response {
  return streamResponse(frames);
}

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  // hfspaces is anonymous-capable; scrub a developer's real token so the
  // anonymous-path assertions cannot pick up ambient state.
  delete process.env.HF_TOKEN;
  mockFetch.mockReset();
});

afterEach(() => {
  delete process.env.HF_TOKEN;
});

describe("mediagen.image.HfspacesTextToImage", () => {
  it("submits the z-image-turbo positional table, converts size to the resolution string and returns the temp url", async () => {
    const fileUrl = "https://tongyi-mai-z-image-turbo.hf.space/gradio_api/file=/tmp/gradio/abc/image.png";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ event_id: "e1" }) })
      // Frames deliberately split mid-event: proves the SSE buffer reassembles
      // a terminal frame chunked across reads.
      .mockResolvedValueOnce(
        streamResponse([
          "event: generating\ndata: null\n\nevent: comp",
          `lete\ndata: ${JSON.stringify([{ url: fileUrl }])}\n\n`,
        ]),
      )
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => PNG_BYTES.buffer });
    const node = new (nodeByType("mediagen.image.HfspacesTextToImage"))({ prompt: "a fox", size: "1440x720" });
    const result = await node.process();
    const [postUrl, postOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(postUrl).toBe(Z_IMAGE_CALL);
    expect(postOptions.method).toBe("POST");
    const postHeaders = postOptions.headers as Record<string, string>;
    expect(postHeaders.authorization).toBeUndefined();
    const body = JSON.parse(String(postOptions.body)) as { data: unknown[] };
    expect(body.data).toEqual(["a fox", "1440x720 ( 2:1 )", 42, 8, 3.0, true, []]);
    const [getUrl, getOptions] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(getUrl).toBe(`${Z_IMAGE_CALL}/e1`);
    expect(getOptions.method).toBe("GET");
    expect(mockFetch.mock.calls[2][0]).toBe(fileUrl);
    expect(result.output.type).toBe("image");
  });

  it("defaults size to 1024x1024 ( 1:1 ) when unset", async () => {
    const fileUrl = "https://tongyi-mai-z-image-turbo.hf.space/gradio_api/file=/tmp/gradio/abc/image.png";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ event_id: "e9" }) })
      .mockResolvedValueOnce(sseResponse([sseFrame("complete", JSON.stringify([{ url: fileUrl }]))]))
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => PNG_BYTES.buffer });
    const node = new (nodeByType("mediagen.image.HfspacesTextToImage"))({ prompt: "a fox" });
    await node.process();
    const body = JSON.parse(String((mockFetch.mock.calls[0] as [string, RequestInit])[1].body)) as { data: unknown[] };
    expect(body.data[1]).toBe("1024x1024 ( 1:1 )");
  });

  it("attaches the optional HF_TOKEN bearer on both hops when present", async () => {
    process.env.HF_TOKEN = "hf_test_token";
    const fileUrl = "https://tongyi-mai-z-image-turbo.hf.space/gradio_api/file=/tmp/gradio/abc/image.png";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ event_id: "e2" }) })
      .mockResolvedValueOnce(sseResponse([sseFrame("complete", JSON.stringify([{ url: fileUrl }]))]))
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => PNG_BYTES.buffer });
    const node = new (nodeByType("mediagen.image.HfspacesTextToImage"))({ prompt: "a fox" });
    await node.process();
    const postHeaders = (mockFetch.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>;
    expect(postHeaders.authorization).toBe("Bearer hf_test_token");
    const getHeaders = (mockFetch.mock.calls[1] as [string, RequestInit])[1].headers as Record<string, string>;
    expect(getHeaders.authorization).toBe("Bearer hf_test_token");
  });

  it("maps a submit 404 to a params error (space moved or privatized)", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, text: async () => "not found" });
    const node = new (nodeByType("mediagen.image.HfspacesTextToImage"))({ prompt: "a fox" });
    try {
      await node.process();
      expect.unreachable("submit 404 should have thrown");
    } catch (error) {
      const channelError = error as MediagenChannelError;
      expect(channelError).toBeInstanceOf(MediagenChannelError);
      expect(channelError.code).toBe("params");
      expect(channelError.message).toMatch(/moved or been privatized/);
    }
  });
});

describe("mediagen.video.HfspacesImageToVideo", () => {
  it("embeds the image as a data:URI in the wan22-i2v positional table and decodes the embedded video", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ event_id: "e3" }) })
      .mockResolvedValueOnce(
        sseResponse([sseFrame("complete", JSON.stringify([{ video: `data:video/mp4;base64,${MP4_B64}` }]))]),
      );
    const node = new (nodeByType("mediagen.video.HfspacesImageToVideo"))({
      prompt: "a storm",
      image: { type: "image", uri: "", data: PNG_B64 },
    });
    const result = await node.process();
    const [postUrl, postOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(postUrl).toBe(WAN22_CALL);
    const body = JSON.parse(String(postOptions.body)) as { data: unknown[] };
    expect(body.data).toEqual([`data:image/png;base64,${PNG_B64}`, "a storm", 4, "", 5, 1.0, 1.0, 0, true]);
    expect(mockFetch.mock.calls[1][0]).toBe(`${WAN22_CALL}/e3`);
    // Embedded base64 return → video bytes straight out; no download hop.
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.output.type).toBe("video");
    expect(result.output.data).toBe(MP4_B64);
  });

  it("rejects the ZeroGPU accounting-layer reject (SSE error data:null) as a quota failure", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ event_id: "e4" }) })
      .mockResolvedValueOnce(sseResponse([sseFrame("error", "null")]));
    const node = new (nodeByType("mediagen.video.HfspacesImageToVideo"))({
      image: { type: "image", uri: "", data: PNG_B64 },
    });
    try {
      await node.process();
      expect.unreachable("quota reject should have thrown");
    } catch (error) {
      const channelError = error as MediagenChannelError;
      expect(channelError).toBeInstanceOf(MediagenChannelError);
      expect(channelError.code).toBe("quota");
      expect(channelError.quota).toBe(true);
      expect(channelError.message).toMatch(/HF_TOKEN/);
    }
  });

  it("surfaces an SSE error carrying text as a space execution failure", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ event_id: "e5" }) })
      .mockResolvedValueOnce(sseResponse([sseFrame("error", '"value must be a valid image"')]));
    const node = new (nodeByType("mediagen.video.HfspacesImageToVideo"))({
      image: { type: "image", uri: "", data: PNG_B64 },
    });
    await expect(node.process()).rejects.toThrow(/Space execution error/);
  });
});

describe("mediagen.video.HfspacesMinimaxH3Video", () => {
  it("builds the minimax-h3 positional table in wire order with t2v defaults and downloads the url result", async () => {
    const videoUrl = "https://multimodalart-minimax-h3.hf.space/gradio_api/file=/tmp/gradio/abc/video.mp4";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ event_id: "e6" }) })
      .mockResolvedValueOnce(sseResponse([sseFrame("complete", JSON.stringify([{ url: videoUrl }]))]))
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => MP4_BYTES.buffer });
    const node = new (nodeByType("mediagen.video.HfspacesMinimaxH3Video"))({ prompt: "a storm" });
    const result = await node.process();
    const [postUrl, postOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(postUrl).toBe(MINIMAX_CALL);
    const body = JSON.parse(String(postOptions.body)) as { data: unknown[] };
    expect(body.data).toEqual(["a storm", null, null, MINIMAX_RESOLUTION, 10, 10, 42, false]);
    expect(mockFetch.mock.calls[1][0]).toBe(`${MINIMAX_CALL}/e6`);
    expect(mockFetch.mock.calls[2][0]).toBe(videoUrl);
    expect(result.output.type).toBe("video");
  });

  it("maps keyframes onto the first/last frame slots and passes through duration, steps and seed", async () => {
    const videoUrl = "https://multimodalart-minimax-h3.hf.space/gradio_api/file=/tmp/gradio/abc/video2.mp4";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ event_id: "e7" }) })
      .mockResolvedValueOnce(sseResponse([sseFrame("complete", JSON.stringify([{ url: videoUrl }]))]))
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => MP4_BYTES.buffer });
    const node = new (nodeByType("mediagen.video.HfspacesMinimaxH3Video"))({
      prompt: "a storm",
      keyframes: [
        { type: "image", uri: "https://cdn.example.com/first.png", data: null },
        { type: "image", uri: "https://cdn.example.com/last.png", data: null },
      ],
      duration_seconds: 7,
      steps: 6,
      seed: 1234,
    });
    const result = await node.process();
    const body = JSON.parse(String((mockFetch.mock.calls[0] as [string, RequestInit])[1].body)) as { data: unknown[] };
    expect(body.data).toEqual([
      "a storm",
      { url: "https://cdn.example.com/first.png" },
      { url: "https://cdn.example.com/last.png" },
      MINIMAX_RESOLUTION,
      7,
      6,
      1234,
      false,
    ]);
    expect(result.output.type).toBe("video");
  });

  it("routes a single image input to the first-frame slot with the last frame null", async () => {
    const videoUrl = "https://multimodalart-minimax-h3.hf.space/gradio_api/file=/tmp/gradio/abc/video3.mp4";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ event_id: "e8" }) })
      .mockResolvedValueOnce(sseResponse([sseFrame("complete", JSON.stringify([{ url: videoUrl }]))]))
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => MP4_BYTES.buffer });
    const node = new (nodeByType("mediagen.video.HfspacesMinimaxH3Video"))({
      prompt: "a storm",
      image: { type: "image", uri: "https://cdn.example.com/frame.png", data: null },
    });
    await node.process();
    const body = JSON.parse(String((mockFetch.mock.calls[0] as [string, RequestInit])[1].body)) as { data: unknown[] };
    expect(body.data[1]).toEqual({ url: "https://cdn.example.com/frame.png" });
    expect(body.data[2]).toBeNull();
  });
});

// Adapter-level: the factory's inline branch has no audio routing yet (the
// orchestrator's widening wave adds it), so the TTS adapter is driven directly
// with a synthetic AdapterContext.
describe("hfspaces audio adapter (Chatterbox TTS)", () => {
  const CHATTERBOX_CALL = "https://resembleai-chatterbox.hf.space/gradio_api/call/generate_tts_audio";
  const audioAdapter = hfspacesAdapters.audio;

  function audioCtx() {
    return { secrets: {}, fetchFn: mockFetch as unknown as typeof fetch };
  }

  function mediaInput(uri: string | null, dataUri: string) {
    return {
      uri,
      bytes: () => Promise.resolve(new Uint8Array()),
      dataUri: () => Promise.resolve(dataUri),
    };
  }

  it("posts the Chatterbox positional table with the L1 defaults and returns the temp wav url", async () => {
    const wavUrl = "https://resembleai-chatterbox.hf.space/gradio_api/file=/tmp/gradio/abc/audio.wav";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ event_id: "a1" }) })
      .mockResolvedValueOnce(sseResponse([sseFrame("complete", JSON.stringify([{ url: wavUrl }]))]));
    const result = await audioAdapter.submit({ text: "hello world" }, {}, audioCtx());
    const [postUrl, postOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(postUrl).toBe(CHATTERBOX_CALL);
    const body = JSON.parse(String(postOptions.body)) as { data: unknown[] };
    expect(body.data).toEqual(["hello world", null, 0.5, 0.8, 0, 0.5, false]);
    expect(mockFetch.mock.calls[1][0]).toBe(`${CHATTERBOX_CALL}/a1`);
    expect(result).toEqual({ status: "done", kind: "url", url: wavUrl, mime: "audio/wav" });
  });

  it("maps an https reference onto the ImageData url form and passes through overrides", async () => {
    const wavUrl = "https://resembleai-chatterbox.hf.space/gradio_api/file=/tmp/gradio/abc/audio2.wav";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ event_id: "a2" }) })
      .mockResolvedValueOnce(sseResponse([sseFrame("complete", JSON.stringify([{ url: wavUrl }]))]));
    await audioAdapter.submit(
      { text: "hi", exaggeration: 0.9, temperature: 0.7, seed: 7, cfg_weight: 0.4 },
      { reference_audio: mediaInput("https://cdn.example.com/voice.wav", "data:audio/wav;base64,") },
      audioCtx(),
    );
    const body = JSON.parse(String((mockFetch.mock.calls[0] as [string, RequestInit])[1].body)) as { data: unknown[] };
    expect(body.data).toEqual([
      "hi",
      { url: "https://cdn.example.com/voice.wav" },
      0.9,
      0.7,
      7,
      0.4,
      false,
    ]);
  });

  it("maps a bytes reference onto the ImageData base64 form and decodes an embedded audio payload", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ event_id: "a3" }) })
      .mockResolvedValueOnce(sseResponse([sseFrame("complete", JSON.stringify([`data:audio/wav;base64,${WAV_B64}`]))]));
    const result = await audioAdapter.submit(
      { text: "hi" },
      { reference_audio: mediaInput(null, `data:audio/wav;base64,${WAV_B64}`) },
      audioCtx(),
    );
    const body = JSON.parse(String((mockFetch.mock.calls[0] as [string, RequestInit])[1].body)) as { data: unknown[] };
    expect(body.data[1]).toEqual({ base64: WAV_B64 });
    expect(result).toEqual({ status: "done", kind: "bytes", data: WAV_BYTES, mime: "audio/wav" });
  });

  it("returns the structured ZeroGPU quota failure on SSE error data:null", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ event_id: "a4" }) })
      .mockResolvedValueOnce(sseResponse([sseFrame("error", "null")]));
    const result = await audioAdapter.submit({ text: "hello" }, {}, audioCtx());
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.code).toBe("hfspaces.zero_gpu_quota");
      expect(result.quota).toBe(true);
      expect(result.message).toMatch(/HF_TOKEN/);
    }
  });
});

describe("mediagen.audio.HfspacesTextToSpeech", () => {
  it("runs end-to-end: manifest defaults into the positional table, temp wav url downloaded, audio ref out", async () => {
    const wavUrl = "https://resembleai-chatterbox.hf.space/gradio_api/file=/tmp/gradio/abc/tts.wav";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ event_id: "a5" }) })
      .mockResolvedValueOnce(sseResponse([sseFrame("complete", JSON.stringify([{ url: wavUrl }]))]))
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => WAV_BYTES.buffer });
    const node = new (nodeByType("mediagen.audio.HfspacesTextToSpeech"))({ text: "hello world" });
    const result = await node.process();
    const [postUrl, postOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(postUrl).toBe("https://resembleai-chatterbox.hf.space/gradio_api/call/generate_tts_audio");
    // Manifest field defaults flow into the positional slots (0.5 / 0.8 / 0 / 0.5 / false).
    const body = JSON.parse(String(postOptions.body)) as { data: unknown[] };
    expect(body.data).toEqual(["hello world", null, 0.5, 0.8, 0, 0.5, false]);
    expect(mockFetch.mock.calls[2][0]).toBe(wavUrl);
    expect(result.output.type).toBe("audio");
    expect(result.output.data).toBe(WAV_B64);
  });
});
