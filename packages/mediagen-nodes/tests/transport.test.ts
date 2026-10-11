import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CdpGeminiTransport } from "../src/channels/gemini/transport.js";
import type { CdpSocketFactory } from "../src/channels/gemini/cdp.js";
import type { MediagenChannelError } from "../src/index.js";

// Transport-level pins (92 §3 classification table + §1 heal design). All
// offline: global fetch stubbed, CDP sockets faked through CdpSocketFactory.

function catchErr(promise: Promise<unknown>): Promise<MediagenChannelError> {
  return promise.then(
    () => { throw new Error("expected a rejection"); },
    (e) => e as MediagenChannelError,
  );
}

interface FakeSocket {
  readyState: number;
  terminated: boolean;
  sent: string[];
  emit(event: string, arg?: unknown): void;
}

/** Auto-opening fake socket. `autoEcho` replies to Runtime.evaluate with
 * `replyFor` (a frame builder); manual control otherwise. */
function fakeSocketFactory(opts: { autoEcho?: (frame: { id: number; method: string }) => unknown } | undefined):
  { factory: CdpSocketFactory; sockets: FakeSocket[] } {
  const sockets: FakeSocket[] = [];
  const factory: CdpSocketFactory = () => {
    const handlers = new Map<string, Array<(arg?: unknown) => void>>();
    const on = (event: string, cb: (arg?: unknown) => void) => {
      const list = handlers.get(event) ?? [];
      list.push(cb);
      handlers.set(event, list);
      return sock;
    };
    const sock: FakeSocket = {
      readyState: 0,
      terminated: false,
      sent: [],
      emit: (event: string, arg?: unknown) => { for (const cb of [...(handlers.get(event) ?? [])]) cb(arg); },
    };
    // ws surface used by CdpConnection:
    Object.assign(sock, {
      once: (event: string, cb: (arg?: unknown) => void) => on(event, cb),
      on,
      send: (data: string) => {
        sock.sent.push(data);
        const frame = JSON.parse(data) as { id: number; method: string };
        if (opts?.autoEcho) {
          const reply = opts.autoEcho(frame);
          if (reply !== undefined) {
            setTimeout(() => sock.emit("message", Buffer.from(JSON.stringify(reply))), 0);
          }
        }
      },
      terminate: () => { sock.terminated = true; sock.readyState = 3; },
    });
    sockets.push(sock);
    setTimeout(() => { sock.readyState = 1; sock.emit("open"); }, 0);
    return sock as unknown as import("../src/channels/gemini/cdp.js").CdpSocket;
  };
  return { factory, sockets };
}

const GEMINI_PAGE = { type: "page", url: "https://gemini.google.com/app", webSocketDebuggerUrl: "ws://127.0.0.1:9999/devtools/page/x" };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CdpGeminiTransport error classification (92 §3)", () => {
  it("S100: CDP unreachable → auth, non-retryable, launch hint attached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED connect failed"); }));
    const err = await catchErr(new CdpGeminiTransport(9999).open());
    expect(err.code).toBe("auth");
    expect(err.retryable).toBe(false);
    expect(err.message).toMatch(/S100.*不可连/);
    expect(err.message).toMatch(/launch-chrome/);
  });

  it("S103: page target without webSocketDebuggerUrl → network, retryable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => [{ type: "page", url: "https://gemini.google.com/app" }], // no wsDebuggerUrl
    })));
    const err = await catchErr(new CdpGeminiTransport(9999).open());
    expect(err.code).toBe("network");
    expect(err.retryable).toBe(true);
    expect(err.message).toMatch(/S103.*webSocketDebuggerUrl/);
    expect(err.message).not.toMatch(/launch-chrome/); // transient: relaunching would sink an in-flight generation (R26 Y1)
  });

  it("S103: eval before open → network, retryable", async () => {
    const err = await catchErr(new CdpGeminiTransport(9999).eval("1+1"));
    expect(err.code).toBe("network");
    expect(err.retryable).toBe(true);
    expect(err.message).toMatch(/S103.*未连接/);
    expect(err.message).not.toMatch(/launch-chrome/); // R26 Y1
  });

  it("wraps a CDP error frame as retryable S103 instead of leaking a raw Error (R16 Y2)", async () => {
    // cdp.ts rejects CDP error frames as plain Error — the transport's catch
    // must classify it; raw would defeat every adapter retryable check.
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [GEMINI_PAGE] })));
    const { factory, sockets } = fakeSocketFactory(); // auto-open, manual replies
    const transport = new CdpGeminiTransport(9999, factory);
    await transport.open();
    const pending = catchErr(transport.eval("boom", 5_000));
    await new Promise((resolve) => setTimeout(resolve, 10));
    const frame = JSON.parse(sockets[0]!.sent[0]!) as { id: number };
    sockets[0]!.emit("message", Buffer.from(JSON.stringify({ id: frame.id, error: { message: "bad params" } })));
    const err = await pending;
    expect(err.code).toBe("network");
    expect(err.retryable).toBe(true);
    expect(err.message).toMatch(/CDP evaluate 失败.*bad params/);
    expect(err.message).not.toMatch(/launch-chrome/); // R26 Y1
    // The catch must also have disposed+nulled the connection (R3-F3/R18 Y3):
    // a follow-up eval classifies as not-connected instead of reusing a dead socket.
    const second = await catchErr(transport.eval("after-failure", 5_000));
    expect(second.message).toMatch(/S103.*未连接/);
  });

  it("maps page-context exceptionDetails to retryable S103 页面执行异常 (R16 Y2)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [GEMINI_PAGE] })));
    const { factory, sockets } = fakeSocketFactory();
    const transport = new CdpGeminiTransport(9999, factory);
    await transport.open();
    const pending = catchErr(transport.eval("risky", 5_000));
    await new Promise((resolve) => setTimeout(resolve, 10));
    const frame = JSON.parse(sockets[0]!.sent[0]!) as { id: number };
    sockets[0]!.emit("message", Buffer.from(JSON.stringify({
      id: frame.id,
      result: { exceptionDetails: { exception: { description: "TypeError: x is not a function" } } },
    })));
    const err = await pending;
    expect(err.code).toBe("network");
    expect(err.retryable).toBe(true);
    expect(err.message).toMatch(/页面执行异常.*TypeError/);
    expect(err.message).not.toMatch(/launch-chrome/); // transient carries the reopen hint, never the relaunch one (R27)
    // The exceptionDetails branch must also dispose+null the connection
    // (R19 Y1): a surviving stale conn makes the adapter self-heal's
    // t.open() early-return and retries spin to the S410 deadline.
    const second = await catchErr(transport.eval("after-exception", 5_000));
    expect(second.message).toMatch(/S103.*未连接/);
  });

  it("touches the lasso activity file on attach when it exists (R16 Y3)", async () => {
    // Real filesystem in a throwaway HOME (os.homedir honors $HOME on POSIX):
    // the touch's mtime bump is the observable, no module mocking needed.
    const home = mkdtempSync(join(tmpdir(), "gemini-touch-"));
    mkdirSync(join(home, ".cache", "lasso"), { recursive: true });
    const touchPath = join(home, ".cache", "lasso", "chrome-touch-9225");
    writeFileSync(touchPath, "");
    const prevHome = process.env.HOME;
    process.env.HOME = home;
    try {
      vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [GEMINI_PAGE] })));
      const before = statSync(touchPath).mtimeMs;
      await new Promise((resolve) => setTimeout(resolve, 25)); // ensure mtime can advance
      await new CdpGeminiTransport(9225).open();
      expect(statSync(touchPath).mtimeMs).toBeGreaterThan(before); // the touch fired
    } finally {
      process.env.HOME = prevHome;
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe("CdpGeminiTransport openTab self-heal (92 §1)", () => {
  function stubHealFetch(onNavigate: () => boolean) {
    return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/json/new")) {
        return { ok: true, json: async () => GEMINI_PAGE };
      }
      // The real Chrome only lists the new page as a gemini page AFTER the
      // explicit Page.navigate lands (the /json/new url param does not
      // navigate — L1 comment) — model that coupling.
      return { ok: true, json: async () => (onNavigate() ? [GEMINI_PAGE] : []) };
    });
  }

  function navigateObservingFactory(): { factory: CdpSocketFactory; sockets: FakeSocket[]; navigatedToGemini: () => boolean } {
    let navigated = false;
    const { factory, sockets } = fakeSocketFactory({
      autoEcho: (frame) => {
        if (frame.method === "Page.navigate") {
          // Real Chrome: ACK precedes commit. Timer ORDER is the pin's whole
          // substance: the factory's reply setTimeout(0) clamps to 1ms, so
          // the flip needs delay 2 (strictly after the ack) and the settle
          // 3ms (strictly after the flip) — anything tighter collapses to
          // registration order and silently unpins the settle (R18 RED).
          setTimeout(() => { navigated = true; }, 2);
        }
        return { id: frame.id, result: {} };
      },
    });
    return { factory, sockets, navigatedToGemini: () => navigated };
  }

  it("self-heals: PUT /json/new → explicit Page.navigate → re-probe finds the page (R15 Y1 + R16 Y1)", async () => {
    const { factory, sockets, navigatedToGemini } = navigateObservingFactory();
    const putCalls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/json/new")) {
        putCalls.push(String(init?.method));
        return { ok: true, json: async () => GEMINI_PAGE };
      }
      return { ok: true, json: async () => (navigatedToGemini() ? [GEMINI_PAGE] : []) };
    }));
    const transport = new CdpGeminiTransport(9999, factory);
    transport.healNewTabSettleMs = 3; // must exceed the flip's 2ms — see factory note
    const result = await transport.open();
    expect(result.pageUrl).toBe("https://gemini.google.com/app");
    expect(putCalls).toContain("PUT"); // the heal fired
    expect(navigatedToGemini()).toBe(true); // and the navigation actually landed (kills the no-navigate mutant)
    // The temp connection must be disposed — a leaked heal socket pins the
    // event loop and the heal fires exactly when tabs get closed (R18 Y2).
    expect(sockets[0].terminated).toBe(true);
  });

  it("falls through to S101 when the auto-open heal fails (R15 Y1)", async () => {
    let listCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/json/new")) return { ok: false, status: 500 };
      listCalls++;
      return { ok: true, json: async () => [] }; // never a gemini page
    }));
    const transport = new CdpGeminiTransport(9999);
    transport.healNewTabSettleMs = 1;
    const err = await catchErr(transport.open());
    expect(err.code).toBe("auth");
    expect(err.retryable).toBe(false);
    expect(err.message).toMatch(/S101.*自动开页未果/);
    expect(listCalls).toBeGreaterThanOrEqual(2); // re-probed after the failed heal
  });

  it("stays on S101 when the navigate is acked but never commits (R16 Y1 mutant)", { timeout: 15000 }, async () => {
    // Socket acks every frame (navigate resolves fast) but the page never
    // commits to gemini.google.com — list keeps returning [] and open() ends
    // in S101, not a false success. Kills the settle-removal mutant without
    // a 15s navigate timeout.
    const { factory } = fakeSocketFactory({ autoEcho: (frame) => ({ id: frame.id, result: {} }) });
    vi.stubGlobal("fetch", stubHealFetch(() => false));
    const transport = new CdpGeminiTransport(9999, factory);
    transport.healNewTabSettleMs = 1;
    const err = await catchErr(transport.open());
    expect(err.code).toBe("auth");
    expect(err.message).toMatch(/S101/);
  });
});
