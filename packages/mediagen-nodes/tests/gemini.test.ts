import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediagenChannelError } from "../src/index.js";
import {
  clearGeminiSessionsForTest,
  geminiAdapters,
  geminiSessionsForTest,
  resetGeminiTransportFactoryForTest,
  setGeminiTransportFactory,
} from "../src/channels/gemini/adapter.js";
import { MEDIAGEN_NODES } from "../src/index.js";
import type { GeminiTransport } from "../src/channels/gemini/transport.js";

// Assertion provenance: director/channels/92 (adversarial final plan) §3
// error-mapping table + the L1 source gemini-web.ts expressions. All tests
// stub the transport seam — zero network, zero CDP.
//
// Script steps are STRICT: every step names a marker that must appear in the
// expression that consumes it, so a dropped or reordered eval fails loudly
// instead of silently shifting results. Session tests drive the adapters
// directly (the node path wraps polls in the manifest's 420s deadline).

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MP4_BYTES = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]);
const GEMINI_APP = "https://gemini.google.com/app";

interface Call {
  eval?: string;
  insertText?: string;
  navigate?: string;
}

type Step =
  | { match: string; result?: unknown }
  | { match: string; fail: Error };

function stubTransport(script: Step[]): { transport: GeminiTransport; calls: Call[]; disposedCount: () => number } {
  const calls: Call[] = [];
  let step = 0;
  let disposed = 0;
  // Models transport.eval's conn-null semantics (R23 Y1): after a THROWN eval
  // the connection is gone, and every later eval throws retryable S103
  // 未连接 until open() re-attaches. Without this, deleting the image poll's
  // reconnect keeps the suite green (mutation-proven).
  let connNulled = false;
  const transport: GeminiTransport = {
    open: async () => {
      connNulled = false;
      return { pageUrl: GEMINI_APP };
    },
    navigate: async (url) => { calls.push({ navigate: url }); },
    insertText: async (text) => { calls.push({ insertText: text }); },
    eval: async (expression) => {
      if (connNulled) {
        // Synthetic: does NOT consume a script step.
        throw new MediagenChannelError("gemini", "network", "S103: CDP 未连接(先 open())", true);
      }
      calls.push({ eval: expression.slice(0, 80) });
      const s = script[step]; // no clamp: extra evals must fail, not replay the last step
      if (!s) throw new Error(`stub script exhausted at step ${step} (eval: ${expression.slice(0, 60)})`);
      if (!expression.includes(s.match)) {
        throw new Error(`step ${step} expected marker ${JSON.stringify(s.match)} in eval: ${expression.slice(0, 80)}`);
      }
      step++;
      if ("fail" in s) {
        connNulled = true;
        throw s.fail;
      }
      return s.result;
    },
    dispose: () => { disposed++; },
  };
  return { transport, calls, disposedCount: () => disposed };
}

/** Markers for the send sequence: login → tools menu → mode item → focus → send. */
function uiScript(modeItem: string): Step[] {
  return [
    { match: "Google 账号", result: { logged: true, account: "Google 账号: test" } },
    { match: "Upload", result: { ok: true } },
    { match: modeItem, result: { ok: true, matched: modeItem } },
    { match: "rich-textarea", result: { ok: true } },
    { match: "Send", result: { ok: true } },
  ];
}

const adapterCtx = { secrets: {}, fetchFn: fetch };
const noMedia = {};

function nodeByType(type: string) {
  const found = MEDIAGEN_NODES.find((n) => n.nodeType === type);
  if (!found) throw new Error(`node type ${type} not found`);
  return found;
}

beforeEach(() => {
  clearGeminiSessionsForTest();
});

afterEach(() => {
  vi.restoreAllMocks();
  resetGeminiTransportFactoryForTest(); // a test omitting a stub must not inherit the previous one
});

describe("mediagen.image.GeminiTextToImage", () => {
  it("drives the UI sequence and returns image bytes on ready", { timeout: 30000 }, async () => {
    const { transport, calls, disposedCount } = stubTransport([
      ...uiScript("制作图片"),
      // poll: not ready → poll: ready → canvas grab
      { match: "imgActions", result: { count: 0, src: null, ready: false, err: null } },
      { match: "imgActions", result: { count: 1, src: "blob:https://gemini.google.com/x", ready: true, err: null } },
      { match: "toDataURL", result: { b64: Buffer.from(PNG_BYTES).toString("base64"), contentType: "image/jpeg" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "a lighthouse" });
    const result = await node.process();
    expect(calls.some((c) => c.navigate === GEMINI_APP)).toBe(true);
    expect(calls.some((c) => c.insertText === "a lighthouse")).toBe(true);
    expect(result.output.type).toBe("image");
    expect(Buffer.from(result.output.data ?? "", "base64")).toEqual(Buffer.from(PNG_BYTES));
    expect(disposedCount()).toBe(1); // CDP connection released on the success path
  });

  it("maps S100 (CDP unreachable) to a non-retryable auth error", { timeout: 15000 }, async () => {
    const { transport, disposedCount } = stubTransport([]);
    (transport as { open: () => Promise<{ pageUrl: string }> }).open = async () => {
      throw new MediagenChannelError("gemini", "auth", "S100: CDP 127.0.0.1:9225 不可连(ECONNREFUSED) (start the channel Chrome…)");
    };
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "x" });
    try {
      await node.process();
      throw new Error("expected S100");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.code).toBe("auth");
      expect(err.retryable).toBe(false);
      expect(err.message).toMatch(/S100.*不可连/);
    }
    expect(disposedCount()).toBe(1); // disposed even when open() throws
  });

  it("maps S102 (not logged in) to a non-retryable auth error with the login hint", { timeout: 15000 }, async () => {
    const { transport } = stubTransport([
      { match: "Google 账号", result: { logged: false, url: GEMINI_APP } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "x" });
    try {
      await node.process();
      throw new Error("expected S102");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.code).toBe("auth");
      expect(err.retryable).toBe(false);
      expect(err.message).toMatch(/S102.*未登录/);
    }
  });

  it("classifies a login-probe page exception as retryable network, not S102", { timeout: 15000 }, async () => {
    const { transport } = stubTransport([
      { match: "Google 账号", result: { __err: "TypeError: document is null" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "x" });
    try {
      await node.process();
      throw new Error("expected a retryable network error");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.code).toBe("network");
      expect(err.retryable).toBe(true);
      expect(err.message).toMatch(/登录态探测失败/);
    }
  });

  it("classifies a tools-menu page exception as retryable network, not S101", { timeout: 15000 }, async () => {
    const { transport } = stubTransport([
      { match: "Google 账号", result: { logged: true, url: GEMINI_APP } },
      { match: "Upload", result: { __err: "TypeError: querySelectorAll failed" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "x" });
    try {
      await node.process();
      throw new Error("expected a retryable network error");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.code).toBe("network");
      expect(err.retryable).toBe(true);
      expect(err.message).toMatch(/打开工具菜单失败/);
    }
  });

  it("classifies a mode-item page exception as retryable network, not S101 (R9 Y1)", { timeout: 15000 }, async () => {
    const { transport } = stubTransport([
      { match: "Google 账号", result: { logged: true, url: GEMINI_APP } },
      { match: "Upload", result: { ok: true } },
      { match: "制作图片", result: { __err: "TypeError: overlay is null" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "x" });
    try {
      await node.process();
      throw new Error("expected a retryable network error");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.code).toBe("network");
      expect(err.retryable).toBe(true);
      expect(err.message).toMatch(/点击模式菜单项失败/);
    }
  });

  it("maps a missing mode-item entry to S101 naming the mode (R9 Y1)", { timeout: 15000 }, async () => {
    const { transport } = stubTransport([
      { match: "Google 账号", result: { logged: true, url: GEMINI_APP } },
      { match: "Upload", result: { ok: true } },
      { match: "制作图片", result: { ok: false, menuText: "上传文件 上传云硬盘" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "x" });
    await expect(node.process()).rejects.toThrow(/S101.*制作图片/);
  });

  it("maps a missing focus target to S101 (R9 Y1)", { timeout: 15000 }, async () => {
    const { transport } = stubTransport([
      { match: "Google 账号", result: { logged: true, url: GEMINI_APP } },
      { match: "Upload", result: { ok: true } },
      { match: "制作图片", result: { ok: true, matched: "制作图片" } },
      { match: "rich-textarea", result: { ok: false, stage: "input" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "x" });
    await expect(node.process()).rejects.toThrow(/S101.*rich-textarea/);
  });

  it("maps an unclickable send button to retryable network (R9 Y1)", { timeout: 15000 }, async () => {
    const { transport } = stubTransport([
      { match: "Google 账号", result: { logged: true, url: GEMINI_APP } },
      { match: "Upload", result: { ok: true } },
      { match: "制作图片", result: { ok: true, matched: "制作图片" } },
      { match: "rich-textarea", result: { ok: true } },
      { match: "Send", result: { ok: false, stage: "send-btn" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "x" });
    try {
      await node.process();
      throw new Error("expected a retryable network error");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.code).toBe("network");
      expect(err.retryable).toBe(true);
      expect(err.message).toMatch(/发送按钮未找到/);
    }
  });

  it("classifies a send-probe page exception as retryable network (R9 Y1)", { timeout: 15000 }, async () => {
    const { transport } = stubTransport([
      { match: "Google 账号", result: { logged: true, url: GEMINI_APP } },
      { match: "Upload", result: { ok: true } },
      { match: "制作图片", result: { ok: true, matched: "制作图片" } },
      { match: "rich-textarea", result: { ok: true } },
      { match: "Send", result: { __err: "TypeError: offsetWidth of undefined" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "x" });
    try {
      await node.process();
      throw new Error("expected a retryable network error");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.code).toBe("network");
      expect(err.retryable).toBe(true);
      expect(err.message).toMatch(/点击发送执行失败/);
    }
  });

  it("maps a non-quota page error to a result error (not quota) on the image path (R10 Y1)", { timeout: 20000 }, async () => {
    // Without this pin, mapPageError could collapse to always-quota and a
    // transient "Something went wrong" would tell the operator the 5h window
    // is exhausted when it is not.
    const { transport } = stubTransport([
      ...uiScript("制作图片"),
      { match: "imgActions", result: { count: 0, src: null, ready: false, err: "Something went wrong" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "x" });
    try {
      await node.process();
      throw new Error("expected a result error");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.code).toBe("result");
      expect(err.quota).toBeFalsy();
      expect(err.message).toMatch(/S400.*Something went wrong/);
    }
  });

  it("maps a non-quota video page error to result and releases the session (R10 Y1)", { timeout: 20000 }, async () => {
    const { transport } = stubTransport([
      ...uiScript("制作视频"),
      { match: "querySelector('video')", result: { src: "", ready: false, err: "Something went wrong" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.video.GeminiTextToVideo"))({ prompt: "x" });
    try {
      await node.process();
      throw new Error("expected a result error");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.code).toBe("result");
      expect(err.quota).toBeFalsy();
    }
    expect(geminiSessionsForTest().size).toBe(0);
  });

  it("treats an empty artifact payload (no __err, no b64) as retryable, never zero-byte success (R13 Y3)", { timeout: 30000 }, async () => {
    const { transport } = stubTransport([
      ...uiScript("制作图片"),
      { match: "imgActions", result: { count: 1, src: "blob:https://gemini.google.com/x", ready: true, err: null } },
      { match: "toDataURL", result: { b64: "", contentType: "image/jpeg" } }, // neither __err nor usable bytes
      { match: "imgActions", result: { count: 1, src: "blob:https://gemini.google.com/x", ready: true, err: null } },
      { match: "toDataURL", result: { b64: Buffer.from(PNG_BYTES).toString("base64"), contentType: "image/jpeg" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "empty-grab" });
    const result = await node.process();
    expect(result.output.type).toBe("image");
    expect(Buffer.from(result.output.data ?? "", "base64")).toEqual(Buffer.from(PNG_BYTES));
  });

  it("treats an image poll probe exception as running and retries (R10 Y4)", { timeout: 30000 }, async () => {
    const { transport } = stubTransport([
      ...uiScript("制作图片"),
      { match: "imgActions", result: { __err: "TypeError: images is null" } },
      { match: "imgActions", result: { count: 1, src: "blob:https://gemini.google.com/x", ready: true, err: null } },
      { match: "toDataURL", result: { b64: Buffer.from(PNG_BYTES).toString("base64"), contentType: "image/jpeg" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "probe-blip" });
    const result = await node.process();
    expect(result.output.type).toBe("image");
  });

  it("treats a video poll probe exception as running and retries (R9 Y1)", { timeout: 30000 }, async () => {
    const { transport } = stubTransport([
      ...uiScript("制作视频"),
      { match: "querySelector('video')", result: { __err: "TypeError: body is null" } },
      { match: "querySelector('video')", result: { src: "https://x/usercontent/download", ready: true, err: null } },
      { match: "credentials", result: { b64: Buffer.from(MP4_BYTES).toString("base64"), contentType: "video/mp4" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.video.GeminiTextToVideo"))({ prompt: "probe-blip" });
    const result = await node.process();
    expect(result.output.type).toBe("video");
  });

  it("maps S101 (menu entry missing) to an auth error naming the visible labels", { timeout: 20000 }, async () => {
    const { transport } = stubTransport([
      { match: "Google 账号", result: { logged: true, url: GEMINI_APP } },
      { match: "Upload", result: { ok: false, stage: "menu-btn", visibleLabels: ["帮助", "设置"] } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "x" });
    await expect(node.process()).rejects.toThrow(/S101.*上传和工具/);
  });

  it("maps a page quota error to a structured quota failure", { timeout: 20000 }, async () => {
    const { transport } = stubTransport([
      ...uiScript("制作图片"),
      { match: "imgActions", result: { count: 0, src: null, ready: false, err: "已达到使用上限" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "x" });
    try {
      await node.process();
      throw new Error("expected quota error");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.code).toBe("quota");
      expect(err.quota).toBe(true); // R8-G3 flag pinned (R9 Y1)
      expect(err.message).toMatch(/S400.*上限/);
    }
  });

  it("self-heals a transient S103 inside the image poll instead of failing the run", { timeout: 30000 }, async () => {
    const { transport } = stubTransport([
      ...uiScript("制作图片"),
      { match: "imgActions", fail: new MediagenChannelError("gemini", "network", "S103: CDP evaluate 失败: connection closed", true) },
      { match: "imgActions", result: { count: 1, src: "blob:https://gemini.google.com/x", ready: true, err: null } },
      { match: "toDataURL", result: { b64: Buffer.from(PNG_BYTES).toString("base64"), contentType: "image/jpeg" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "resilient" });
    const result = await node.process();
    expect(result.output.type).toBe("image"); // the S103 tick returned running and reconnected
  });

  it("retries an image artifact-fetch failure (page-side blip) on the next tick", { timeout: 30000 }, async () => {
    // R5 R1 pin: `return fetchReadyArtifact(...)` (bare return) rejects
    // THROUGH the catch — this test fails unless the image loop awaits it.
    const { transport } = stubTransport([
      ...uiScript("制作图片"),
      { match: "imgActions", result: { count: 1, src: "blob:https://gemini.google.com/x", ready: true, err: null } },
      { match: "toDataURL", result: { __err: "HTTP 429" } },
      { match: "imgActions", result: { count: 1, src: "blob:https://gemini.google.com/x", ready: true, err: null } },
      { match: "toDataURL", result: { b64: Buffer.from(PNG_BYTES).toString("base64"), contentType: "image/jpeg" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "grab-blip" });
    const result = await node.process();
    expect(result.output.type).toBe("image");
    expect(Buffer.from(result.output.data ?? "", "base64")).toEqual(Buffer.from(PNG_BYTES));
  });

  it("keeps the run alive when the self-heal reconnect itself fails transiently", { timeout: 30000 }, async () => {
    // R4 Y3 pin: poll-tick eval fails retryably, the catch's t.open() ALSO
    // throws a retryable S103 once (attach race during navigation) — the run
    // must stay alive and heal on the next tick, not escape the loop.
    const { transport } = stubTransport([
      ...uiScript("制作图片"),
      { match: "imgActions", fail: new MediagenChannelError("gemini", "network", "S103: CDP evaluate 失败: connection closed", true) },
      { match: "imgActions", result: { count: 1, src: "blob:https://gemini.google.com/x", ready: true, err: null } },
      { match: "toDataURL", result: { b64: Buffer.from(PNG_BYTES).toString("base64"), contentType: "image/jpeg" } },
    ]);
    const realOpen = transport.open.bind(transport);
    let openCalls = 0;
    transport.open = async () => {
      openCalls++;
      if (openCalls === 2) {
        // The reconnect attempt inside the self-heal catch (call #1 was
        // ensureFreshChat's initial open).
        throw new MediagenChannelError("gemini", "network", "S103: page target 无 webSocketDebuggerUrl", true);
      }
      return realOpen();
    };
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "double-heal" });
    const result = await node.process();
    expect(result.output.type).toBe("image");
  });

  it("classifies a focus-step page exception as retryable network, not S101 auth", { timeout: 15000 }, async () => {
    const { transport } = stubTransport([
      { match: "Google 账号", result: { logged: true, url: GEMINI_APP } },
      { match: "Upload", result: { ok: true } },
      { match: "制作图片", result: { ok: true, matched: "制作图片" } },
      { match: "rich-textarea", result: { __err: "TypeError: Cannot read properties of null" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "x" });
    try {
      await node.process();
      throw new Error("expected a retryable network error");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.code).toBe("network");
      expect(err.retryable).toBe(true);
      expect(err.message).toMatch(/聚焦输入区执行失败/);
    }
  });

  it("treats a transport drop right after the send click as an ambiguous, non-retryable submit", { timeout: 15000 }, async () => {
    // R4 Y2 pin: the send-click eval throws a RETRYABLE transport error — the
    // click may have landed, so a blind retry could bill twice. The error
    // must surface as non-retryable with the ambiguity named.
    const { transport } = stubTransport([
      { match: "Google 账号", result: { logged: true, url: GEMINI_APP } },
      { match: "Upload", result: { ok: true } },
      { match: "制作图片", result: { ok: true, matched: "制作图片" } },
      { match: "rich-textarea", result: { ok: true } },
      { match: "Send", fail: new MediagenChannelError("gemini", "network", "S103: CDP evaluate 失败: connection closed", true) },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "ambiguous" });
    try {
      await node.process();
      throw new Error("expected an ambiguous-submit error");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.retryable).toBe(false);
      expect(err.message).toMatch(/提交结果不确定/);
    }
  });

  it("rejects immediately when the signal is already aborted", { timeout: 15000 }, async () => {
    const { transport } = stubTransport([]);
    setGeminiTransportFactory(() => transport);
    const controller = new AbortController();
    controller.abort();
    const node = new (nodeByType("mediagen.image.GeminiTextToImage"))({ prompt: "x" });
    await expect(node.process({ signal: controller.signal })).rejects.toThrow(/abort/i);
  });
});

describe("mediagen.video.GeminiTextToVideo (node path)", () => {
  it("submits, polls to ready and returns video bytes", { timeout: 30000 }, async () => {
    const { transport, calls, disposedCount } = stubTransport([
      ...uiScript("制作视频"),
      // polls: running, running, ready → page fetch b64
      { match: "querySelector('video')", result: { src: "", ready: false, err: null } },
      { match: "querySelector('video')", result: { src: "", ready: false, err: null } },
      { match: "querySelector('video')", result: { src: "https://contribution.usercontent.google.com/download?c=1", ready: true, err: null } },
      { match: "credentials", result: { b64: Buffer.from(MP4_BYTES).toString("base64"), contentType: "video/mp4" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.video.GeminiTextToVideo"))({ prompt: "ocean at dusk" });
    const result = await node.process();
    expect(calls.some((c) => c.insertText === "ocean at dusk")).toBe(true);
    expect(result.output.type).toBe("video");
    expect(Buffer.from(result.output.data ?? "", "base64")).toEqual(Buffer.from(MP4_BYTES));
    expect(geminiSessionsForTest().size).toBe(0); // consumed at ready
    // One transport per adapter entry point: submit + each poll tick + the
    // ready tick's artifact fetch — all disposed.
    expect(disposedCount()).toBe(4); // submit + three poll ticks, each disposing its transport
    expect(calls.filter((c) => c.eval && c.eval.includes("querySelector('video')")).length).toBeGreaterThanOrEqual(3);
  });

  it("polls a stale handle to a structured failure without touching the transport", async () => {
    setGeminiTransportFactory(() => {
      throw new Error("transport must not be constructed for a stale handle");
    });
    const result = await geminiAdapters.video!.poll("gemini-bogus-0", { prompt: "x" }, noMedia, adapterCtx);
    expect(result).toMatchObject({ status: "failed", code: "gemini.stale_handle" });
  });

  it("keeps polling through a transient S103 (WS drop) instead of sinking the run", { timeout: 20000 }, async () => {
    // Submit succeeds, then the first poll tick throws a retryable network
    // error, then the second tick finds the video ready.
    const { transport } = stubTransport([
      ...uiScript("制作视频"),
      { match: "querySelector('video')", fail: new MediagenChannelError("gemini", "network", "S103: CDP evaluate 失败: connection closed", true) },
      { match: "querySelector('video')", result: { src: "https://x/usercontent/download", ready: true, err: null } },
      { match: "credentials", result: { b64: Buffer.from(MP4_BYTES).toString("base64"), contentType: "video/mp4" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.video.GeminiTextToVideo"))({ prompt: "resilient" });
    const result = await node.process();
    expect(result.output.type).toBe("video"); // the S103 tick returned running, not an error
    expect(geminiSessionsForTest().size).toBe(0);
  });

  it("retries the artifact fetch when it fails transiently (session stays live)", { timeout: 30000 }, async () => {
    // Submit → poll ready → fetch throws a RETRYABLE S103 → next tick polls
    // ready again → fetch succeeds. The session must survive the failed fetch
    // (no false stale_handle) — the R2 F1 regression pin.
    const { transport } = stubTransport([
      ...uiScript("制作视频"),
      { match: "querySelector('video')", result: { src: "https://x/usercontent/download", ready: true, err: null } },
      { match: "credentials", fail: new MediagenChannelError("gemini", "network", "S103: CDP evaluate 失败: connection closed", true) },
      { match: "querySelector('video')", result: { src: "https://x/usercontent/download", ready: true, err: null } },
      { match: "credentials", result: { b64: Buffer.from(MP4_BYTES).toString("base64"), contentType: "video/mp4" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.video.GeminiTextToVideo"))({ prompt: "retry-fetch" });
    const result = await node.process();
    expect(result.output.type).toBe("video");
    expect(Buffer.from(result.output.data ?? "", "base64")).toEqual(Buffer.from(MP4_BYTES));
    expect(geminiSessionsForTest().size).toBe(0); // deleted only after the successful fetch
  });

  it("retries a page-side artifact-fetch failure (CDN blip) on the next tick", { timeout: 30000 }, async () => {
    // R3 F1 regression: exprFetchB64 returns {__err: "HTTP 429"} once — a
    // page-side CDN hiccup on an already-ready, already-billed video must
    // retry, not sink the run with a non-retryable S200.
    const { transport } = stubTransport([
      ...uiScript("制作视频"),
      { match: "querySelector('video')", result: { src: "https://x/usercontent/download", ready: true, err: null } },
      { match: "credentials", result: { __err: "HTTP 429" } },
      { match: "querySelector('video')", result: { src: "https://x/usercontent/download", ready: true, err: null } },
      { match: "credentials", result: { b64: Buffer.from(MP4_BYTES).toString("base64"), contentType: "video/mp4" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.video.GeminiTextToVideo"))({ prompt: "cdn-blip" });
    const result = await node.process();
    expect(result.output.type).toBe("video");
    expect(Buffer.from(result.output.data ?? "", "base64")).toEqual(Buffer.from(MP4_BYTES));
    expect(geminiSessionsForTest().size).toBe(0);
  });

  it("delivers the artifact when ready and a stale page error coexist (R14 Y1 pin)", { timeout: 30000 }, async () => {
    // The err regex scans the whole body; after a retried generation stale
    // error text can linger while the new video is ready. Ready-first wins.
    const { transport } = stubTransport([
      ...uiScript("制作视频"),
      { match: "querySelector('video')", result: { src: "https://x/usercontent/download", ready: true, err: "try again later" } },
      { match: "credentials", result: { b64: Buffer.from(MP4_BYTES).toString("base64"), contentType: "video/mp4" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.video.GeminiTextToVideo"))({ prompt: "stale-err" });
    const result = await node.process();
    expect(result.output.type).toBe("video");
    expect(Buffer.from(result.output.data ?? "", "base64")).toEqual(Buffer.from(MP4_BYTES));
    expect(geminiSessionsForTest().size).toBe(0);
  });

  it("releases the session slot when the poll dies of a terminal error", { timeout: 20000 }, async () => {
    const { transport } = stubTransport([
      ...uiScript("制作视频"),
      { match: "querySelector('video')", fail: new MediagenChannelError("gemini", "auth", "S100: CDP 不可连", false) },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.video.GeminiTextToVideo"))({ prompt: "doomed" });
    await expect(node.process()).rejects.toThrow(/S100/);
    expect(geminiSessionsForTest().size).toBe(0); // not pinned to the TTL
  });
});

describe("gemini adapter session lifecycle (S303 / TTL)", () => {
  it("rejects image inputs as S301 params errors before any session exists", async () => {
    setGeminiTransportFactory(() => {
      throw new Error("transport must not be constructed for S301");
    });
    await expect(
      geminiAdapters.video!.submit({ prompt: "x" }, { image: { uri: null, bytes: async () => new Uint8Array() } }, adapterCtx),
    ).rejects.toThrow(/S301.*仅支持文生视频/);
  });

  it("lifts S303 after the session is consumed by a ready poll", { timeout: 20000 }, async () => {
    const submitted = stubTransport([
      ...uiScript("制作视频"),
      { match: "querySelector('video')", result: { src: "https://x/usercontent/download", ready: true, err: null } },
      { match: "credentials", result: { b64: Buffer.from(MP4_BYTES).toString("base64"), contentType: "video/mp4" } },
    ]);
    setGeminiTransportFactory(() => submitted.transport);
    const first = await geminiAdapters.video!.submit({ prompt: "first" }, noMedia, adapterCtx);
    if (!("handle" in first)) throw new Error("expected a handle");
    expect(geminiSessionsForTest().size).toBe(1);
    const polled = await geminiAdapters.video!.poll(first.handle, { prompt: "first" }, noMedia, adapterCtx);
    expect(polled.status).toBe("done");
    expect(geminiSessionsForTest().size).toBe(0);
    const second = stubTransport([...uiScript("制作视频")]);
    setGeminiTransportFactory(() => second.transport);
    const again = await geminiAdapters.video!.submit({ prompt: "second" }, noMedia, adapterCtx);
    expect("handle" in again).toBe(true);
    clearGeminiSessionsForTest();
  });

  it("fails fast with a quota error while a live session exists (S303)", { timeout: 20000 }, async () => {
    const seeded = stubTransport([...uiScript("制作视频")]);
    setGeminiTransportFactory(() => seeded.transport);
    await geminiAdapters.video!.submit({ prompt: "live" }, noMedia, adapterCtx); // leaves one live session
    setGeminiTransportFactory(() => {
      throw new Error("transport must not be constructed when S303 fires");
    });
    try {
      await geminiAdapters.video!.submit({ prompt: "too soon" }, noMedia, adapterCtx);
      throw new Error("expected S303");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.code).toBe("quota");
      expect(err.quota).toBe(true); // R8-G3 flag pinned (R9 Y1)
      expect(err.message).toContain("S303");
    }
  });

  it("maps a video page error to a quota failure and releases the session (R6 Y2)", { timeout: 30000 }, async () => {
    // Video-path S400 pin: without this branch a page-error video degrades to
    // an S410 timeout with no quota labeling, and the session leaks.
    const { transport } = stubTransport([
      ...uiScript("制作视频"),
      { match: "querySelector('video')", result: { src: "", ready: false, err: "已达到使用上限" } },
    ]);
    setGeminiTransportFactory(() => transport);
    const node = new (nodeByType("mediagen.video.GeminiTextToVideo"))({ prompt: "quota-hit" });
    try {
      await node.process();
      throw new Error("expected a quota error");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.code).toBe("quota");
      expect(err.message).toMatch(/S400.*上限/);
    }
    expect(geminiSessionsForTest().size).toBe(0); // released by the terminal-error path
  });

  it("seeds an S303 guard session when the video send click is ambiguous (R5 Y2)", { timeout: 20000 }, async () => {
    // The send-click eval drops the transport after a possible click: the
    // submit must fail non-retryably AND leave a guard session so a blind
    // resubmit hits S303 instead of navigating away from the maybe-generating
    // video.
    const { transport } = stubTransport([
      { match: "Google 账号", result: { logged: true, url: GEMINI_APP } },
      { match: "Upload", result: { ok: true } },
      { match: "制作视频", result: { ok: true, matched: "制作视频" } },
      { match: "rich-textarea", result: { ok: true } },
      { match: "Send", fail: new MediagenChannelError("gemini", "network", "S103: CDP evaluate 失败: connection closed", true) },
    ]);
    setGeminiTransportFactory(() => transport);
    try {
      await geminiAdapters.video!.submit({ prompt: "ambiguous" }, noMedia, adapterCtx);
      throw new Error("expected the ambiguous-submit error");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.retryable).toBe(false);
      expect(err.message).toMatch(/提交结果不确定/);
    }
    expect(geminiSessionsForTest().size).toBe(1); // the guard session
    setGeminiTransportFactory(() => {
      throw new Error("transport must not be constructed when S303 fires");
    });
    await expect(geminiAdapters.video!.submit({ prompt: "rerun" }, noMedia, adapterCtx)).rejects.toThrow(/S303/);
  });

  it("blocks an image submit while a video session is live (image-path S303 backstop, R11 Y2)", { timeout: 20000 }, async () => {
    // The image node creates no session of its own — this backstop is the
    // only guard keeping it from navigating /app away from an unconsumed,
    // quota-billed video during the submit→poll slot gap.
    const seeded = stubTransport([...uiScript("制作视频")]);
    setGeminiTransportFactory(() => seeded.transport);
    await geminiAdapters.video!.submit({ prompt: "live" }, noMedia, adapterCtx); // leaves one live session
    setGeminiTransportFactory(() => {
      throw new Error("transport must not be constructed before the guard runs");
    });
    try {
      await geminiAdapters.image!.submit({ prompt: "too soon" }, noMedia, adapterCtx);
      throw new Error("expected S303");
    } catch (e) {
      // Structured asserts (R12 Y1): a bare /S303/ regex passes vacuously when
      // the stub message itself names S303 — pin the classification instead.
      const err = e as MediagenChannelError;
      expect(err.code).toBe("quota");
      expect(err.quota).toBe(true);
      expect(err.message).toContain("S303");
    }
  });

  it("sweeps stale sessions past the TTL instead of pinning S303 forever", { timeout: 20000 }, async () => {
    const seeded = stubTransport([...uiScript("制作视频")]);
    setGeminiTransportFactory(() => seeded.transport);
    await geminiAdapters.video!.submit({ prompt: "stale" }, noMedia, adapterCtx);
    for (const session of geminiSessionsForTest().values()) {
      session.createdAt = Date.now() - 11 * 60_000; // past the 10-minute TTL
    }
    const fresh = stubTransport([...uiScript("制作视频")]);
    setGeminiTransportFactory(() => fresh.transport);
    const result = await geminiAdapters.video!.submit({ prompt: "after-ttl" }, noMedia, adapterCtx);
    expect("handle" in result).toBe(true); // swept on entry, no S303
    expect(geminiSessionsForTest().size).toBe(1); // the new live session
  });
});
