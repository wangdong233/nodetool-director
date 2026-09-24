import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MEDIAGEN_NODES, MediagenChannelError } from "../src/index.js";

// Real PNG magic prefix so detectImageMime resolves (assertion-provenance:
// PNG signature, not implementation output).
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PNG_B64 = Buffer.from(PNG_BYTES).toString("base64");

function nodeByType(type: string) {
  const found = MEDIAGEN_NODES.find((node) => node.nodeType === type);
  if (!found) throw new Error(`node type ${type} not found`);
  return found;
}

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  process.env.CLOUDFLARE_API_TOKEN = "test-token";
  process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
  mockFetch.mockReset();
});

afterEach(() => {
  delete process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
});

describe("mediagen.image.CloudflareTextToImage", () => {
  it("posts the JSON family body to the account run endpoint with bearer auth", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { image: PNG_B64 }, success: true }),
    });
    const node = new (nodeByType("mediagen.image.CloudflareTextToImage"))({
      prompt: "a fox",
      model: "sdxl-base",
      steps: 20,
      seed: 42,
    });
    const result = await node.process();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.cloudflare.com/client/v4/accounts/test-account/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0");
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
    const body = JSON.parse(String(options.body)) as Record<string, unknown>;
    // SDXL family: num_steps key, size params present, seed passed through.
    expect(body).toEqual({ prompt: "a fox", num_steps: 20, seed: 42, width: 1024, height: 1024 });
    expect(result.output.type).toBe("image");
    expect(result.output.data).toBe(PNG_B64);
  });

  it("drops seed/width/height for flux-schnell (fixed output, schema rejects seed) without throwing", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { image: PNG_B64 }, success: true }),
    });
    const node = new (nodeByType("mediagen.image.CloudflareTextToImage"))({ prompt: "a fox", seed: 99, width: 768, height: 768 });
    const result = await node.process();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.cloudflare.com/client/v4/accounts/test-account/ai/run/@cf/black-forest-labs/flux-1-schnell");
    const body = JSON.parse(String(options.body)) as Record<string, unknown>;
    expect(body).toEqual({ prompt: "a fox", steps: 4 });
    expect(result.output.type).toBe("image");
  });

  it("sends the flux-2 family as multipart FormData with a binary reference part", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { image: PNG_B64 }, success: true }),
    });
    const node = new (nodeByType("mediagen.image.CloudflareTextToImage"))({
      prompt: "a fox",
      model: "flux-2-klein",
      image: { type: "image", data: PNG_B64 },
    });
    await node.process();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.cloudflare.com/client/v4/accounts/test-account/ai/run/@cf/black-forest-labs/flux-2-klein-4b");
    expect(options.body).toBeInstanceOf(FormData);
    const headers = options.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
    // The multipart boundary content-type is derived by fetch, not set by hand.
    expect(headers["Content-Type"]).toBeUndefined();
    const form = options.body as FormData;
    expect(form.get("prompt")).toBe("a fox");
    expect(form.get("width")).toBe("1024");
    expect(form.get("height")).toBe("1024");
    // klein variants are fixed at 4 steps upstream — no steps field.
    expect(form.get("steps")).toBeNull();
    expect(form.get("input_image_0")).toBeInstanceOf(Blob);
  });

  it("sends SDXL img2img as bare base64 image_b64", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { image: PNG_B64 }, success: true }),
    });
    const node = new (nodeByType("mediagen.image.CloudflareTextToImage"))({
      prompt: "a fox",
      model: "sdxl-lightning",
      steps: 20,
      image: { type: "image", data: PNG_B64 },
    });
    await node.process();
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(options.body)) as Record<string, unknown>;
    expect(body.image_b64).toBe(PNG_B64);
    expect(body.num_steps).toBe(20);
  });

  it("rejects an image on a model without an i2i shape", async () => {
    const node = new (nodeByType("mediagen.image.CloudflareTextToImage"))({
      prompt: "a fox",
      model: "lucid",
      image: { type: "image", data: PNG_B64 },
    });
    const error = await node.process().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(MediagenChannelError);
    expect((error as MediagenChannelError).code).toBe("params");
  });

  it("maps 429 + cf 3036 to a non-retryable quota error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
      text: async () => JSON.stringify({ errors: [{ code: 3036, message: "daily allocation exhausted" }], success: false }),
    });
    const node = new (nodeByType("mediagen.image.CloudflareTextToImage"))({ prompt: "a fox" });
    const error = await node.process().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(MediagenChannelError);
    const channelError = error as MediagenChannelError;
    expect(channelError.code).toBe("quota");
    expect(channelError.quota).toBe(true);
    expect(channelError.retryable).toBe(false);
    expect(channelError.message).toMatch(/3036/);
  });

  it("falls back to binary parsing when the response content-type is image/*", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/jpeg" }),
      json: async () => ({}),
      arrayBuffer: async () => PNG_BYTES.buffer,
    });
    const node = new (nodeByType("mediagen.image.CloudflareTextToImage"))({ prompt: "a fox" });
    const result = await node.process();
    expect(result.output.type).toBe("image");
    expect(result.output.data).toBe(PNG_B64);
  });

  it("fails structurally when the account id is missing", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    const node = new (nodeByType("mediagen.image.CloudflareTextToImage"))({ prompt: "a fox" });
    await expect(node.process()).rejects.toThrow(MediagenChannelError);
    await expect(node.process()).rejects.toThrow(/CLOUDFLARE_ACCOUNT_ID/);
  });
});
