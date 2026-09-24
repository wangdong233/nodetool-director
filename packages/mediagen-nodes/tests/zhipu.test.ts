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
  process.env.ZHIPU_API_KEY = "test-key";
  mockFetch.mockReset();
});

afterEach(() => {
  delete process.env.ZHIPU_API_KEY;
});

describe("mediagen.image.ZhipuTextToImage", () => {
  it("posts to the generations endpoint with bearer auth and returns an image ref", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: PNG_B64 }] }),
    });
    const node = new (nodeByType("mediagen.image.ZhipuTextToImage"))({ prompt: "a fox" });
    const result = await node.process();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://open.bigmodel.cn/api/paas/v4/images/generations");
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const body = JSON.parse(String(options.body)) as Record<string, unknown>;
    expect(body.model).toBe("cogview-3-flash");
    expect(body.prompt).toBe("a fox");
    expect(body.size).toBe("1024x1024");
    expect(body.watermark_enabled).toBe(false);
    expect(result.output.type).toBe("image");
    if (result.output.data !== undefined) {
      expect(result.output.data).toBe(PNG_B64);
    }
  });

  it("rejects an enum value injected through the props bag", async () => {
    const node = new (nodeByType("mediagen.image.ZhipuTextToImage"))({ prompt: "a fox", size: "313x313" });
    await expect(node.process()).rejects.toThrow(/unsupported value/);
  });

  it("fails structurally when the key is missing", async () => {
    delete process.env.ZHIPU_API_KEY;
    const node = new (nodeByType("mediagen.image.ZhipuTextToImage"))({ prompt: "a fox" });
    await expect(node.process()).rejects.toThrow(MediagenChannelError);
    await expect(node.process()).rejects.toThrow(/ZHIPU_API_KEY/);
  });

  it("maps a 1302 concurrency rejection to a quota error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { code: "1302", message: "concurrency limit" } }),
    });
    const node = new (nodeByType("mediagen.image.ZhipuTextToImage"))({ prompt: "a fox" });
    const promise = node.process();
    await expect(promise).rejects.toThrow(MediagenChannelError);
    try {
      await node.process();
    } catch (error) {
      const channelError = error as MediagenChannelError;
      expect(channelError.code).toBe("quota");
      expect(channelError.quota).toBe(true);
    }
  });
});

describe("mediagen.video.ZhipuTextToVideo", () => {
  it("submits, polls to SUCCESS and downloads the video", async () => {
    const videoUrl = "https://media.example.com/out.mp4";
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "task-1", task_status: "PROCESSING" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ task_status: "PROCESSING" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ task_status: "SUCCESS", video_result: [{ url: videoUrl }] }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => MP4_BYTES.buffer });
    const node = new (nodeByType("mediagen.video.ZhipuTextToVideo"))({ prompt: "a storm" });
    const result = await node.process();
    const submitCall = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(submitCall[0]).toBe("https://open.bigmodel.cn/api/paas/v4/videos/generations");
    const submitBody = JSON.parse(String(submitCall[1].body)) as Record<string, unknown>;
    expect(submitBody.fps).toBe(30);
    const pollUrl = mockFetch.mock.calls[1][0] as string;
    expect(pollUrl).toBe("https://open.bigmodel.cn/api/paas/v4/async-result/task-1");
    expect(mockFetch.mock.calls[3][0]).toBe(videoUrl);
    expect(result.output.type).toBe("video");
  });

  it("surfaces a failed task as a structured result error", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "task-2", task_status: "PROCESSING" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ task_status: "FAIL" }) });
    const node = new (nodeByType("mediagen.video.ZhipuTextToVideo"))({ prompt: "a storm" });
    await expect(node.process()).rejects.toThrow(/zhipu.task_failed/);
  });
});
