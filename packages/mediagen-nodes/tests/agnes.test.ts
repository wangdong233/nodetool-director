import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MEDIAGEN_NODES, MediagenChannelError } from "../src/index.js";

// Real PNG magic prefix so detectImageMime resolves (assertion-provenance:
// PNG signature, not implementation output).
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PNG_B64 = Buffer.from(PNG_BYTES).toString("base64");
const MP4_BYTES = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);

// Wire contract constants (agnes.ts L1 source: baseUrl, defaults, endpoints).
const IMAGE_URL = "https://apihub.agnes-ai.com/v1/images/generations";
const VIDEO_SUBMIT_URL = "https://apihub.agnes-ai.com/v1/videos";

function nodeByType(type: string) {
  const found = MEDIAGEN_NODES.find((node) => node.nodeType === type);
  if (!found) throw new Error(`node type ${type} not found`);
  return found;
}

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  process.env.AGNES_API_KEY = "test-key";
  mockFetch.mockReset();
});

afterEach(() => {
  delete process.env.AGNES_API_KEY;
});

describe("mediagen.image.AgnesTextToImage", () => {
  it("posts to the generations endpoint with bearer auth and returns an image ref", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: PNG_B64 }] }),
    });
    const node = new (nodeByType("mediagen.image.AgnesTextToImage"))({ prompt: "a fox" });
    const result = await node.process();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(IMAGE_URL);
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const body = JSON.parse(String(options.body)) as Record<string, unknown>;
    expect(body.model).toBe("agnes-image-2.1-flash");
    expect(body.prompt).toBe("a fox");
    expect(body.size).toBe("1024x1024");
    // agnes has no watermark flag (unlike zhipu) — body stays minimal per wire.
    expect(body.watermark_enabled).toBeUndefined();
    expect(result.output.type).toBe("image");
    if (result.output.data !== undefined) {
      expect(result.output.data).toBe(PNG_B64);
    }
  });

  it("sends i2i input as the wire's image string array", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ url: "https://cdn.example.com/out.png" }] }),
      arrayBuffer: async () => PNG_BYTES.buffer,
    });
    const node = new (nodeByType("mediagen.image.AgnesTextToImage"))({
      prompt: "a fox",
      image: { type: "image", uri: "https://cdn.example.com/in.png", data: null },
    });
    const result = await node.process();
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(options.body)) as Record<string, unknown>;
    expect(body.image).toEqual(["https://cdn.example.com/in.png"]);
    expect(result.output.type).toBe("image");
  });

  it("fails structurally when the key is missing", async () => {
    delete process.env.AGNES_API_KEY;
    const node = new (nodeByType("mediagen.image.AgnesTextToImage"))({ prompt: "a fox" });
    await expect(node.process()).rejects.toThrow(MediagenChannelError);
    await expect(node.process()).rejects.toThrow(/AGNES_API_KEY/);
  });
});

describe("mediagen.video.AgnesTextToVideo", () => {
  // Two polls mean one real 5000ms pollIntervalMs sleep inside pollUntilDone —
  // allow more than vitest's default 5s test timeout.
  it("submits with the wire defaults, polls to completion and downloads the video", async () => {
    const videoUrl = "https://media.example.com/out.mp4";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ task_id: "task-1", video_id: "vid-9", status: "queued" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "processing" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "succeeded", url: videoUrl }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => MP4_BYTES.buffer });
    const node = new (nodeByType("mediagen.video.AgnesTextToVideo"))({ prompt: "a storm" });
    const result = await node.process();
    const submitCall = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(submitCall[0]).toBe(VIDEO_SUBMIT_URL);
    expect((submitCall[1].headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const submitBody = JSON.parse(String(submitCall[1].body)) as Record<string, unknown>;
    expect(submitBody.model).toBe("agnes-video-v2.0");
    expect(submitBody.num_frames).toBe(121);
    expect(submitBody.frame_rate).toBe(24);
    expect(submitBody.resolution).toBe("720p");
    expect(submitBody.mode).toBe("ti2vid");
    expect(submitBody.image).toBeUndefined();
    expect(submitBody.extra_body).toBeUndefined();
    const pollUrl = mockFetch.mock.calls[1][0] as string;
    expect(pollUrl).toBe("https://apihub.agnes-ai.com/v1/videos/task-1");
    expect(mockFetch.mock.calls[3][0]).toBe(videoUrl);
    expect(result.output.type).toBe("video");
  }, 15000);

  it("maps keyframes onto mode:keyframes with the extra_body image array", async () => {
    const videoUrl = "https://media.example.com/kf.mp4";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "task-kf" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "completed", url: videoUrl }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => MP4_BYTES.buffer });
    const node = new (nodeByType("mediagen.video.AgnesTextToVideo"))({
      prompt: "a storm",
      keyframes: [
        { type: "image", uri: "https://cdn.example.com/first.png", data: null },
        { type: "image", uri: "https://cdn.example.com/last.png", data: null },
      ],
    });
    const result = await node.process();
    const submitCall = mockFetch.mock.calls[0] as [string, RequestInit];
    const submitBody = JSON.parse(String(submitCall[1].body)) as Record<string, unknown>;
    expect(submitBody.mode).toBe("keyframes");
    expect(submitBody.extra_body).toEqual({
      image: ["https://cdn.example.com/first.png", "https://cdn.example.com/last.png"],
      mode: "keyframes",
    });
    expect(mockFetch.mock.calls[1][0]).toBe("https://apihub.agnes-ai.com/v1/videos/task-kf");
    expect(result.output.type).toBe("video");
  });

  it("rejects 1080p with more than 241 frames before any request is sent", async () => {
    const node = new (nodeByType("mediagen.video.AgnesTextToVideo"))({
      prompt: "a storm",
      resolution: "1080p",
      num_frames: 441,
    });
    await expect(node.process()).rejects.toThrow(/at most 241 frames/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("maps a 429 rate limit to a quota error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: "rate limit exceeded" } }),
    });
    const node = new (nodeByType("mediagen.video.AgnesTextToVideo"))({ prompt: "a storm" });
    try {
      await node.process();
      expect.unreachable("submit should have thrown");
    } catch (error) {
      const channelError = error as MediagenChannelError;
      expect(channelError).toBeInstanceOf(MediagenChannelError);
      expect(channelError.code).toBe("quota");
      expect(channelError.quota).toBe(true);
    }
  });

  it("treats a completed status without a url as a failed generation", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "task-2" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "completed" }) });
    const node = new (nodeByType("mediagen.video.AgnesTextToVideo"))({ prompt: "a storm" });
    await expect(node.process()).rejects.toThrow(/completed without a url/);
  });
});
