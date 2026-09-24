import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPixverseArgs, parsePixverseRun, spawnPixverse } from "../src/channels/pixverse/cli.js";
import { PIXVERSE_NODES, PixverseConfirmNode, PixverseSubmitNode } from "../src/channels/pixverse/nodes.js";
import { MediagenChannelError } from "../src/mediagen-base.js";

// Stub only the process boundary; the exit-code mapping (parsePixverseRun)
// stays real so node tests exercise the actual 0-7 semantics.
vi.mock("../src/channels/pixverse/cli.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/channels/pixverse/cli.js")>();
  return { ...actual, spawnPixverse: vi.fn() };
});

const spawnMock = vi.mocked(spawnPixverse);

// Real MP4 box header so the video ref bytes carry a genuine signature
// (assertion-provenance: ISO-BMFF ftyp box, not implementation output).
const MP4_BYTES = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
const MP4_B64 = Buffer.from(MP4_BYTES).toString("base64");

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Wire shapes from the L1 source (media-gen-mcp pixverse.ts):
// account info stdout (pixverse.ts:761-771) — balance lives at credits.total.
const ACCOUNT_INFO_OK = {
  code: 0,
  stdout: JSON.stringify({ credits: { total: 900, membership: 800, daily: 0, bonus: 100 }, memberLabel: "Standard" }),
  stderr: "",
};

beforeEach(() => {
  spawnMock.mockReset();
  mockFetch.mockReset();
});

describe("cli transport", () => {
  it("builds the pinned npx argv with --json appended (L1 pixverse.ts:69,217)", () => {
    expect(buildPixverseArgs(["account", "info"])).toEqual(["-y", "pixverse@1.4.3", "account", "info", "--json"]);
    expect(buildPixverseArgs(["create", "video", "--prompt", "x"])).toEqual([
      "-y",
      "pixverse@1.4.3",
      "create",
      "video",
      "--prompt",
      "x",
      "--json",
    ]);
  });

  it("recovers a task id from an exit-2 timeout payload (L1 pixverse.ts:450-453)", () => {
    const run = parsePixverseRun({ code: 2, stdout: JSON.stringify({ video_id: "v-9" }), stderr: "wait timeout" });
    expect(run.ok).toBe(true);
    if (run.ok) {
      expect(run.recoveredFromTimeout).toBe(true);
      expect(run.payload.video_id).toBe("v-9");
    }
  });

  it("rejects exit-2 without a task id and non-JSON exit-0 stdout", () => {
    const timedOut = parsePixverseRun({ code: 2, stdout: "", stderr: "slow" });
    expect(timedOut.ok).toBe(false);
    if (!timedOut.ok) expect(timedOut.error.code).toBe("result");

    const notJson = parsePixverseRun({ code: 0, stdout: "not json at all", stderr: "" });
    expect(notJson.ok).toBe(false);
    if (!notJson.ok) expect(notJson.error.code).toBe("result");
  });

  it("maps exit 3 to auth with the stderr Authorize URL (L1 pixverse.ts:456-463)", () => {
    const run = parsePixverseRun({
      code: 3,
      stdout: "",
      stderr: "auth expired, authorize at https://app.pixverse.ai/oauth/authorize?client_id=abc&state=xyz",
    });
    expect(run.ok).toBe(false);
    if (!run.ok) {
      expect(run.error).toBeInstanceOf(MediagenChannelError);
      expect(run.error.code).toBe("auth");
      expect(run.error.message).toContain("https://app.pixverse.ai/oauth/authorize?client_id=abc&state=xyz");
      expect(run.error.message).toContain("auth login");
    }
  });
});

describe("pixverse node statics", () => {
  it("exports the confirm pair with billing-safe metadata", () => {
    expect(PIXVERSE_NODES.map((node) => node.nodeType)).toEqual([
      "mediagen.video.PixverseSubmit",
      "mediagen.video.PixverseConfirm",
    ]);
    const [submit, confirm] = PIXVERSE_NODES;
    expect(submit.title).toBe("Pixverse 提交确认(视频)");
    expect(confirm.title).toBe("Pixverse 确认执行(视频)");
    expect(submit.metadataOutputTypes).toEqual({ output: "str" });
    expect(confirm.metadataOutputTypes).toEqual({ output: "video" });
    expect(submit.autoSaveAsset).toBe(false);
    expect(confirm.autoSaveAsset).toBe(true);
    // The CLI owns auth (OAuth file / PIXVERSE_ACCESS_KEY env) — no secrets here.
    expect(submit.requiredSettings).toEqual([]);
    expect(confirm.requiredSettings).toEqual([]);
  });
});

describe("PixverseSubmitNode", () => {
  it("returns a needConfirm JSON with balance, static estimate and a pvc token — and never submits", async () => {
    spawnMock.mockResolvedValueOnce(ACCOUNT_INFO_OK);
    const node = new PixverseSubmitNode({ prompt: "a neon fox in the rain" });
    const result = await node.process();

    expect(typeof result.output).toBe("string");
    const confirm = JSON.parse(result.output) as Record<string, unknown>;
    expect(confirm.needConfirm).toBe(true);
    expect(confirm.provider).toBe("pixverse");
    expect(confirm.model).toBe("v6");
    // v6 @720p with-audio rate = 12 cr/s (L1 staticVideoRates pixverse.ts:297
    // "720": [9, 12], conservative pair[1]) × 5s default duration.
    expect(confirm.estimatedCost).toBe(60);
    expect(confirm.costSource).toBe("static");
    expect(confirm.currentBalance).toBe(900);
    expect(String(confirm.confirmToken)).toMatch(/^pvc\.[0-9a-z]+\.[0-9a-f]{16}$/);
    expect(confirm.expiresInSeconds).toBe(600);
    expect(confirm.paramsDigest).toEqual({
      model: "v6",
      prompt: "a neon fox in the rain",
      duration_seconds: 5,
      quality: "720p",
      aspect_ratio: "16:9",
      seed: null,
    });

    // Exactly one CLI call: the zero-cost account probe. No create, ever.
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock.mock.calls[0][0]).toEqual(["account", "info"]);
  });

  it("estimates unknown for models without published rates (missing != free)", async () => {
    spawnMock.mockResolvedValueOnce(ACCOUNT_INFO_OK);
    const node = new PixverseSubmitNode({ prompt: "waves", model: "seedance-2.5" });
    const confirm = JSON.parse((await node.process()).output) as Record<string, unknown>;
    expect(confirm.estimatedCost).toBeNull();
    expect(confirm.costSource).toBe("unknown");
    expect(confirm.currentBalance).toBe(900);
  });

  it("scales the v6 estimate with quality and duration from the L1 rate table", async () => {
    spawnMock.mockResolvedValueOnce(ACCOUNT_INFO_OK);
    const node = new PixverseSubmitNode({ prompt: "waves", quality: "1080p", duration_seconds: 10 });
    const confirm = JSON.parse((await node.process()).output) as Record<string, unknown>;
    // v6 1080p with-audio = 23 cr/s (L1 pixverse.ts:297 "1080": [18, 23]) × 10s.
    expect(confirm.estimatedCost).toBe(230);
  });

  it("fails early on an exit-3 auth rejection from the account probe", async () => {
    spawnMock.mockResolvedValue({
      code: 3,
      stdout: "",
      stderr: "expired, visit https://app.pixverse.ai/oauth/authorize?client_id=x",
    });
    const node = new PixverseSubmitNode({ prompt: "a fox" });
    const promise = node.process();
    await expect(promise).rejects.toBeInstanceOf(MediagenChannelError);
    let caught: MediagenChannelError | undefined;
    try {
      await node.process();
    } catch (error) {
      caught = error as MediagenChannelError;
    }
    expect(caught?.code).toBe("auth");
    expect(caught?.message).toContain("oauth/authorize");
  });

  it("still returns the confirm JSON when the balance probe fails without an auth error (L1 gate parity)", async () => {
    spawnMock.mockResolvedValue({ code: 1, stdout: "", stderr: "transient" });
    const node = new PixverseSubmitNode({ prompt: "a fox" });
    const confirm = JSON.parse((await node.process()).output) as Record<string, unknown>;
    expect(confirm.needConfirm).toBe(true);
    expect("currentBalance" in confirm).toBe(false);
  });

  it("rejects a missing prompt and an off-catalog model", async () => {
    await expect(new PixverseSubmitNode({ prompt: "" }).process()).rejects.toThrow(/prompt is required/);
    spawnMock.mockResolvedValue(ACCOUNT_INFO_OK);
    await expect(new PixverseSubmitNode({ prompt: "x", model: "not-a-model" }).process()).rejects.toThrow(
      /unsupported model/,
    );
  });
});

describe("PixverseConfirmNode", () => {
  const freshToken = () => `pvc.${Date.now().toString(36)}.0123456789abcdef`;

  it("runs the full pair: Submit mints the token, Confirm submits, polls the ladder and downloads", { timeout: 20000 }, async () => {
    const videoUrl = "https://media.example.com/out.mp4";
    spawnMock
      // Submit: zero-cost account probe.
      .mockResolvedValueOnce(ACCOUNT_INFO_OK)
      // Confirm: create video --no-wait (L1 reply shape carries video_id, pixverse.ts:488-505).
      .mockResolvedValueOnce({ code: 0, stdout: JSON.stringify({ video_id: "v-777" }), stderr: "" })
      // First poll lands on retry status 5 (L1 retry set {5,9,10}, pixverse.ts:76).
      .mockResolvedValueOnce({ code: 0, stdout: JSON.stringify({ status_code: 5, status: "GENERATING" }), stderr: "" })
      // Second poll reaches done=1 with video_url (L1 status machine, pixverse.ts:75).
      .mockResolvedValueOnce({ code: 0, stdout: JSON.stringify({ status_code: 1, video_url: videoUrl }), stderr: "" });
    mockFetch.mockResolvedValueOnce({ ok: true, arrayBuffer: async () => MP4_BYTES.buffer });

    const submit = new PixverseSubmitNode({ prompt: "waves" });
    const confirmJson = JSON.parse((await submit.process()).output) as { confirmToken: string };
    const node = new PixverseConfirmNode({ confirm_token: confirmJson.confirmToken, prompt: "waves" });
    const result = await node.process();

    expect(result.output.type).toBe("video");
    expect(result.output.data).toBe(MP4_B64);

    // Submit argv: L1 create-video shape (pixverse.ts:1227-1233) — t2v only,
    // explicit --audio, deterministic 32-hex idempotency key, no --seed when unset.
    const createArgs = spawnMock.mock.calls[1][0];
    expect(createArgs).toEqual([
      "create",
      "video",
      "--prompt",
      "waves",
      "--model",
      "v6",
      "--idempotency-key",
      expect.stringMatching(/^[0-9a-f]{32}$/),
      "--no-wait",
      "--duration",
      "5",
      "--quality",
      "720p",
      "--aspect-ratio",
      "16:9",
      "--audio",
    ]);
    // Poll argv: L1 task status shape (pixverse.ts:789).
    expect(spawnMock.mock.calls[2][0]).toEqual(["task", "status", "v-777", "--type", "video"]);
    // The billed result was downloaded through the SSRF-screened fetch.
    expect(mockFetch.mock.calls[0][0]).toBe(videoUrl);
  });

  it("rejects an expired token before any CLI call", async () => {
    const staleToken = `pvc.${(Date.now() - 601_000).toString(36)}.0123456789abcdef`;
    const node = new PixverseConfirmNode({ confirm_token: staleToken, prompt: "waves" });
    const promise = node.process();
    await expect(promise).rejects.toBeInstanceOf(MediagenChannelError);
    try {
      await node.process();
    } catch (error) {
      const channelError = error as MediagenChannelError;
      expect(channelError.code).toBe("params");
      expect(channelError.message).toContain("expired");
    }
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed token with a params error", async () => {
    const node = new PixverseConfirmNode({ confirm_token: "garbage", prompt: "waves" });
    await expect(node.process()).rejects.toThrow(/malformed/);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("surfaces a failed task status as a structured result error", async () => {
    spawnMock
      .mockResolvedValueOnce({ code: 0, stdout: JSON.stringify({ video_id: "v-8" }), stderr: "" })
      .mockResolvedValueOnce({ code: 0, stdout: JSON.stringify({ status_code: 8, status: "FAILED" }), stderr: "" });
    const node = new PixverseConfirmNode({ confirm_token: freshToken(), prompt: "waves" });
    const promise = node.process();
    await expect(promise).rejects.toThrow(/status_code=8/);
  });

  it("maps an exit-4 quota rejection from the billed submit (quota, not retryable)", async () => {
    spawnMock.mockResolvedValue({ code: 4, stdout: "", stderr: JSON.stringify({ error: "insufficient credits" }) });
    const node = new PixverseConfirmNode({ confirm_token: freshToken(), prompt: "waves" });
    try {
      await node.process();
      expect.unreachable("expected a quota rejection");
    } catch (error) {
      const channelError = error as MediagenChannelError;
      expect(channelError.code).toBe("quota");
      expect(channelError.quota).toBe(true);
      expect(channelError.retryable).toBe(false);
      expect(channelError.message).toContain("insufficient credits");
    }
  });

  it("maps an exit-7 concurrency rejection as retryable quota (same idempotency key on re-run)", async () => {
    spawnMock.mockResolvedValue({ code: 7, stdout: "", stderr: "CONCURRENCY_LIMIT" });
    const node = new PixverseConfirmNode({ confirm_token: freshToken(), prompt: "waves" });
    try {
      await node.process();
      expect.unreachable("expected a concurrency rejection");
    } catch (error) {
      const channelError = error as MediagenChannelError;
      expect(channelError.code).toBe("quota");
      expect(channelError.quota).toBe(true);
      expect(channelError.retryable).toBe(true);
      expect(channelError.message).toContain("idempotency key");
    }
  });

  it("stores the video through the receiver-kept context storage when available", { timeout: 20000 }, async () => {
    spawnMock
      .mockResolvedValueOnce({ code: 0, stdout: JSON.stringify({ video_id: "v-store" }), stderr: "" })
      .mockResolvedValueOnce({ code: 0, stdout: JSON.stringify({ status_code: 1, video_url: "https://media.example.com/stored.mp4" }), stderr: "" });
    mockFetch.mockResolvedValueOnce({ ok: true, arrayBuffer: async () => MP4_BYTES.buffer });
    const store = vi.fn(async () => "asset://mediagen-video-pixverse-1");
    const node = new PixverseConfirmNode({ confirm_token: freshToken(), prompt: "waves" });
    const result = await node.process({ storage: { store } } as never);
    expect(store).toHaveBeenCalledTimes(1);
    const [key, bytes, mime] = store.mock.calls[0] as [string, Uint8Array, string];
    expect(key).toContain("mediagen-video-pixverse-");
    expect(Array.from(bytes)).toEqual(Array.from(MP4_BYTES));
    expect(mime).toBe("video/mp4");
    expect(result.output).toEqual({ type: "video", uri: "asset://mediagen-video-pixverse-1" });
  });
});
