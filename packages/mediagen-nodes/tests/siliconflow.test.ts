import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MEDIAGEN_NODES, MediagenChannelError } from "../src/index.js";

// Real PNG magic prefix so detectImageMime resolves (assertion-provenance:
// PNG signature, not implementation output).
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PNG_B64 = Buffer.from(PNG_BYTES).toString("base64");
const MP4_BYTES = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);

function nodeByType(type: string) {
  const found = MEDIAGEN_NODES.find((node) => node.nodeType === type);
  if (!found) throw new Error(`node type ${type} not found`);
  return found;
}

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  process.env.SILICONFLOW_API_KEY = "test-key";
  mockFetch.mockReset();
});

afterEach(() => {
  delete process.env.SILICONFLOW_API_KEY;
});

describe("mediagen.image.SiliconflowTextToImage", () => {
  it("parses the images[].url envelope, returns the url and downloads it immediately", async () => {
    const imageUrl = "https://media.example.com/img.png";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ images: [{ url: imageUrl }] }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => PNG_BYTES.buffer });
    const node = new (nodeByType("mediagen.image.SiliconflowTextToImage"))({ prompt: "a fox" });
    const result = await node.process();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.siliconflow.cn/v1/images/generations");
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const body = JSON.parse(String(options.body)) as Record<string, unknown>;
    expect(body).toEqual({ model: "Kwai-Kolors/Kolors", prompt: "a fox", image_size: "1024x1024" });
    // 1h URL TTL: the download is the very next fetch.
    expect(mockFetch.mock.calls[1][0]).toBe(imageUrl);
    expect(result.output.type).toBe("image");
    expect(result.output.data).toBe(PNG_B64);
  });

  it("passes one input image as a data URI on the Edit model", async () => {
    const imageUrl = "https://media.example.com/edit.png";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ images: [{ url: imageUrl }] }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => PNG_BYTES.buffer });
    const node = new (nodeByType("mediagen.image.SiliconflowTextToImage"))({
      prompt: "make it snow",
      model: "Qwen/Qwen-Image-Edit",
      image: { type: "image", data: PNG_B64 },
    });
    await node.process();
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(options.body)) as Record<string, unknown>;
    expect(body.model).toBe("Qwen/Qwen-Image-Edit");
    expect(body.image).toBe(`data:image/png;base64,${PNG_B64}`);
  });

  it("rejects an image on a non-Edit model with a params error", async () => {
    const node = new (nodeByType("mediagen.image.SiliconflowTextToImage"))({
      prompt: "a fox",
      image: { type: "image", data: PNG_B64 },
    });
    const error = await node.process().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(MediagenChannelError);
    const channelError = error as MediagenChannelError;
    expect(channelError.code).toBe("params");
    expect(channelError.message).toMatch(/Qwen-Image-Edit/);
  });

  it("maps HTTP 429 to a non-retryable quota error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ message: "Requests rate limited" }),
    });
    const node = new (nodeByType("mediagen.image.SiliconflowTextToImage"))({ prompt: "a fox" });
    const error = await node.process().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(MediagenChannelError);
    const channelError = error as MediagenChannelError;
    expect(channelError.code).toBe("quota");
    expect(channelError.quota).toBe(true);
    expect(channelError.retryable).toBe(false);
  });

  it("fails structurally when the key is missing", async () => {
    delete process.env.SILICONFLOW_API_KEY;
    const node = new (nodeByType("mediagen.image.SiliconflowTextToImage"))({ prompt: "a fox" });
    await expect(node.process()).rejects.toThrow(MediagenChannelError);
    await expect(node.process()).rejects.toThrow(/SILICONFLOW_API_KEY/);
  });
});

describe("mediagen.video.SiliconflowTextToVideo", () => {
  it("submits, polls status by requestId and downloads the video", async () => {
    const videoUrl = "https://media.example.com/out.mp4";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ requestId: "req-1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "Succeed", results: { videos: [{ url: videoUrl }] } }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => MP4_BYTES.buffer });
    const node = new (nodeByType("mediagen.video.SiliconflowTextToVideo"))({ prompt: "a storm" });
    const result = await node.process();
    const [submitUrl, submitOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(submitUrl).toBe("https://api.siliconflow.cn/v1/video/submit");
    expect((submitOptions.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const submitBody = JSON.parse(String(submitOptions.body)) as Record<string, unknown>;
    expect(submitBody).toEqual({ model: "Wan-AI/Wan2.2-T2V-A14B", prompt: "a storm", image_size: "1280x720" });
    // Polling is a POST to /v1/video/status carrying the requestId.
    const [pollUrl, pollOptions] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(pollUrl).toBe("https://api.siliconflow.cn/v1/video/status");
    const pollBody = JSON.parse(String(pollOptions.body)) as Record<string, unknown>;
    expect(pollBody).toEqual({ requestId: "req-1" });
    expect(mockFetch.mock.calls[2][0]).toBe(videoUrl);
    expect(result.output.type).toBe("video");
  });

  it("surfaces a Failed task as a structured result error", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ requestId: "req-2" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "Failed", reason: "content policy" }) });
    const node = new (nodeByType("mediagen.video.SiliconflowTextToVideo"))({ prompt: "a storm" });
    await expect(node.process()).rejects.toThrow(/siliconflow.task_failed/);
  });
});
