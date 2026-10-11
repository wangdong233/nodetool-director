import { describe, expect, it, vi } from "vitest";
import { CdpConnection, type CdpSocket, type CdpSocketFactory } from "../src/channels/gemini/cdp.js";
import { MediagenChannelError } from "../src/index.js";

// Offline CDP client tests through the CdpSocketFactory seam (92 §2 names it
// the cdp test seam). FakeSocket implements exactly the surface cdp.ts uses:
// once/on handlers, send, terminate, readyState (1 = OPEN, matching ws).

const OPEN = 1;

class FakeSocket {
  readyState = 0;
  terminated = false;
  sent: string[] = [];
  private handlers = new Map<string, Array<(arg?: unknown) => void>>();

  once(event: string, cb: (arg?: unknown) => void): this { return this.on(event, cb); }
  on(event: string, cb: (arg?: unknown) => void): this {
    const list = this.handlers.get(event) ?? [];
    list.push(cb);
    this.handlers.set(event, list);
    return this;
  }
  send(data: string): void { this.sent.push(data); }
  terminate(): void { this.terminated = true; this.readyState = 3; }
  emit(event: string, arg?: unknown): void {
    for (const cb of [...(this.handlers.get(event) ?? [])]) cb(arg);
  }
}

/** Factory handing out sockets in order; each is drivable from the test. */
function fakeSockets(): { sockets: FakeSocket[]; factory: CdpSocketFactory } {
  const sockets: FakeSocket[] = [];
  const factory: CdpSocketFactory = () => {
    const s = new FakeSocket();
    sockets.push(s);
    return s as unknown as CdpSocket;
  };
  return { sockets, factory };
}

function openSocket(s: FakeSocket): void {
  s.readyState = OPEN;
  s.emit("open");
}

/** send() registers a command only after `await connect()` resolves — flush
 * the microtask queue before reading sent frames or emitting further events. */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe("CdpConnection", () => {
  it("routes responses to the pending command by id", async () => {
    const { sockets, factory } = fakeSockets();
    const conn = new CdpConnection("ws://x", factory);
    const pending = conn.evaluate("1+1", 5_000);
    const sock = sockets[0];
    openSocket(sock);
    await flush();
    const frame = JSON.parse(sock.sent[0]) as { id: number; method: string; params: { expression: string } };
    expect(frame.method).toBe("Runtime.evaluate");
    expect(frame.params.expression).toBe("1+1");
    sock.emit("message", Buffer.from(JSON.stringify({ id: frame.id, result: { value: 42 } })));
    await expect(pending).resolves.toEqual({ value: 42 });
  });

  it("times a command out and ignores its late response", async () => {
    const { sockets, factory } = fakeSockets();
    const conn = new CdpConnection("ws://x", factory);
    const pending = conn.evaluate("slow", 20);
    const sock = sockets[0];
    openSocket(sock);
    await flush();
    await expect(pending).rejects.toThrow(/超时/);
    // The late reply must be dropped silently (pending entry was deleted).
    const frame = JSON.parse(sock.sent[0]) as { id: number };
    sock.emit("message", Buffer.from(JSON.stringify({ id: frame.id, result: {} })));
  });

  it("rejects a CDP error frame as a plain Error", async () => {
    const { sockets, factory } = fakeSockets();
    const conn = new CdpConnection("ws://x", factory);
    const pending = conn.evaluate("boom", 5_000);
    const sock = sockets[0];
    openSocket(sock);
    await flush();
    const frame = JSON.parse(sock.sent[0]) as { id: number };
    sock.emit("message", Buffer.from(JSON.stringify({ id: frame.id, error: { message: "bad params" } })));
    await expect(pending).rejects.toThrow(/bad params/);
  });

  it("rejects all pending on close and reconnects on the next command", async () => {
    const { sockets, factory } = fakeSockets();
    const conn = new CdpConnection("ws://x", factory);
    const first = conn.evaluate("a", 5_000);
    openSocket(sockets[0]);
    await flush();
    const second = conn.sendCommand("Input.insertText", { text: "x" }, 5_000);
    await flush();
    sockets[0].emit("close");
    await expect(first).rejects.toThrow(/已断开/);
    await expect(second).rejects.toThrow(/已断开/);
    // Next command opens a fresh socket.
    const retry = conn.evaluate("b", 5_000);
    openSocket(sockets[1]);
    await flush();
    const frame = JSON.parse(sockets[1].sent[0]) as { id: number };
    sockets[1].emit("message", Buffer.from(JSON.stringify({ id: frame.id, result: { value: "ok" } })));
    await expect(retry).resolves.toEqual({ value: "ok" });
  });

  it("ignores a late close from a superseded socket (regression: successor clobber)", async () => {
    const { sockets, factory } = fakeSockets();
    const conn = new CdpConnection("ws://x", factory);
    const first = conn.evaluate("a", 5_000);
    const sockA = sockets[0];
    openSocket(sockA);
    await flush();
    const frameA = JSON.parse(sockA.sent[0]) as { id: number };
    sockA.emit("message", Buffer.from(JSON.stringify({ id: frameA.id, result: {} })));
    await first;

    // sockA drifts to CLOSING without a close event; the next command must
    // open sockB. sockA's late close must NOT null the connection or reject
    // sockB's pending command.
    sockA.readyState = 2;
    const onB = conn.evaluate("b", 5_000);
    openSocket(sockets[1]);
    await flush();
    sockA.emit("close"); // the late close under test
    const frameB = JSON.parse(sockets[1].sent[0]) as { id: number };
    sockets[1].emit("message", Buffer.from(JSON.stringify({ id: frameB.id, result: { value: "alive" } })));
    await expect(onB).resolves.toEqual({ value: "alive" });
  });

  it("dispose rejects in-flight commands and terminates the socket", async () => {
    const { sockets, factory } = fakeSockets();
    const conn = new CdpConnection("ws://x", factory);
    const pending = conn.evaluate("in-flight", 60_000);
    openSocket(sockets[0]);
    await flush();
    conn.dispose();
    await expect(pending).rejects.toThrow(/已释放/);
    expect(sockets[0].terminated).toBe(true);
  });

  it("times out a socket that never completes the handshake (R10 Y2)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    try {
      const { sockets, factory } = fakeSockets();
      const conn = new CdpConnection("ws://x", factory);
      const pending = conn.evaluate("x", 60_000); // socket created, never opens/errors/closes
      const verdict = pending.catch((e: Error) => e.message);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(await verdict).toMatch(/CDP WebSocket 连接超时/);
      expect(sockets[0].terminated).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a late open after dispose does not resurrect the connection (R6 Y1)", async () => {
    const { sockets, factory } = fakeSockets();
    const conn = new CdpConnection("ws://x", factory);
    const pending = conn.evaluate("a", 5_000); // socket A connecting
    conn.dispose(); // disposed while connecting — A terminated below
    expect(sockets[0].terminated).toBe(true);
    // A late open still fires (handshake completed before terminate landed):
    // it must be refused, not assigned as this.ws.
    sockets[0].emit("open");
    sockets[0].emit("close");
    await expect(pending).rejects.toThrow(/已释放/);
  });

  it("terminates a socket that is still connecting when dispose() runs (R5 Y3)", async () => {
    const { sockets, factory } = fakeSockets();
    const conn = new CdpConnection("ws://x", factory);
    const pending = conn.evaluate("early", 5_000); // socket created, never opened
    conn.dispose();
    expect(sockets[0].terminated).toBe(true);
    sockets[0].emit("close"); // real terminate() fires a close event
    await expect(pending).rejects.toThrow(/建立前被关闭/);
  });

  it("ignores a non-JSON frame and keeps serving the next command (R16 Y3)", async () => {
    const { sockets, factory } = fakeSockets();
    const conn = new CdpConnection("ws://x", factory);
    const first = conn.evaluate("a", 5_000);
    const sock = sockets[0];
    openSocket(sock);
    await flush();
    // Garbage frame mid-flight must be dropped, not crash the ws handler.
    sock.emit("message", Buffer.from("not json at all"));
    const frame = JSON.parse(sock.sent[0]) as { id: number };
    sock.emit("message", Buffer.from(JSON.stringify({ id: frame.id, result: { value: "ok" } })));
    await expect(first).resolves.toEqual({ value: "ok" });
    // And the connection still works for a follow-up command.
    const second = conn.evaluate("b", 5_000);
    await flush(); // the send registers on a microtask after connect() resolves
    const frame2 = JSON.parse(sock.sent[1]) as { id: number };
    sock.emit("message", Buffer.from(JSON.stringify({ id: frame2.id, result: { value: 2 } })));
    await expect(second).resolves.toEqual({ value: 2 });
  });

  it("rejects a synchronous send failure as S103 instead of throwing raw (R16 Y3)", async () => {
    const sockets: FakeSocket[] = [];
    const factory: CdpSocketFactory = () => {
      const s = new FakeSocket();
      sockets.push(s);
      // readyState stays CONNECTING → connect() opens it via emit; but make
      // send() throw synchronously once open.
      (s as unknown as { send: (d: string) => void }).send = (): void => {
        throw new Error("WebSocket is already in CLOSING state");
      };
      return s as unknown as CdpSocket;
    };
    const conn = new CdpConnection("ws://x", factory);
    // Handler attached at creation: the send throws synchronously once the
    // socket opens, so a late .catch would fire unhandledRejection first
    // (R17 R1 — green counts with exit 1).
    const pending = conn.evaluate("a", 5_000).catch((e: Error) => e);
    sockets[0].readyState = 1;
    sockets[0].emit("open");
    const err = await pending;
    expect(err.message).toMatch(/发送失败|S103/);
  });

  it("rejects with a retryable network error when the socket errors during connect", async () => {
    const { sockets, factory } = fakeSockets();
    const conn = new CdpConnection("ws://x", factory);
    const pending = conn.evaluate("a", 5_000);
    sockets[0].emit("error", new Error("ECONNREFUSED"));
    try {
      await pending;
      throw new Error("expected a rejection");
    } catch (e) {
      const err = e as MediagenChannelError;
      expect(err.code).toBe("network");
      expect(err.retryable).toBe(true);
    }
  });
});
