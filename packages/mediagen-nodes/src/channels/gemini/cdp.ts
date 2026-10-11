/**
 * CDP WebSocket client — ported from media-gen-mcp src/providers/cdp-client.ts
 * (MIT, Copyright (c) 2026 media-gen-mcp contributors).
 *
 * Behavior contract (mirrors the source, which 670 tests guarded):
 * - lazy connect + message routing (id→pending) + per-command timeout;
 *   a closed connection self-invalidates and reconnects on the next call
 * - on close, all pending commands reject (page navigation/close scenario)
 * - a socket factory is injectable so unit tests never open a real socket
 */
import WebSocket from "ws";
import { MediagenChannelError } from "../../mediagen-base.js";

export type CdpSocket = WebSocket;

/** Injectable socket factory (tests stub this; production uses `ws`). */
export type CdpSocketFactory = (wsUrl: string) => CdpSocket;

const defaultSocketFactory: CdpSocketFactory = (wsUrl) =>
  new WebSocket(wsUrl, { perMessageDeflate: false });

const CHANNEL = "gemini";

function cdpError(code: string, message: string): MediagenChannelError {
  // S103 = transient transport-level failure → network/retryable per the
  // error-mapping table in director/channels/92.
  return new MediagenChannelError(CHANNEL, "network", `CDP ${code}: ${message}`, true);
}

export class CdpConnection {
  private ws: CdpSocket | null = null;
  /** Socket created but not yet open — dispose must terminate it too. */
  private connectingSocket: CdpSocket | null = null;
  /** Set by dispose(): a late `open` on a still-connecting socket must not
   * resurrect a connection the caller already released (R6 Y1). */
  private disposed = false;
  private opening: Promise<void> | null = null;
  private nextId = 0;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  constructor(
    private readonly wsUrl: string,
    private readonly socketFactory: CdpSocketFactory = defaultSocketFactory,
  ) {}

  private connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.opening) return this.opening;
    this.opening = new Promise<void>((resolve, reject) => {
      let settled = false;
      const ws = this.socketFactory(this.wsUrl);
      this.connectingSocket = ws;
      const detachConnecting = (): void => {
        if (this.connectingSocket === ws) this.connectingSocket = null;
      };
      const onOpenTimeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          detachConnecting();
          try { ws.terminate(); } catch { /* already dead */ }
          reject(cdpError("S103", "CDP WebSocket 连接超时"));
        }
      }, 10_000);
      ws.once("open", () => {
        if (settled) return;
        settled = true;
        detachConnecting();
        clearTimeout(onOpenTimeout);
        if (this.disposed) {
          // dispose() ran while this socket was connecting — it already
          // terminated what it could see; honor it instead of resurrecting
          // a live handle on a released connection.
          try { ws.terminate(); } catch { /* already dead */ }
          reject(cdpError("S103", "CDP 连接已释放(dispose)"));
          return;
        }
        this.ws = ws;
        resolve();
      });
      ws.once("error", (e: Error) => {
        if (settled) return;
        settled = true;
        detachConnecting();
        clearTimeout(onOpenTimeout);
        reject(cdpError("S103", `CDP WebSocket 错误: ${e.message}`));
      });
      ws.once("close", () => {
        detachConnecting();
        if (!settled) {
          // Closed while still connecting (dispose during connect, or the
          // server refused) — settle the opening promise instead of hanging.
          settled = true;
          clearTimeout(onOpenTimeout);
          reject(cdpError("S103", "CDP 连接在建立前被关闭"));
          return;
        }
        // A late close from a superseded socket (connect raced a CLOSING
        // socket and opened a successor) must not clobber the live one —
        // reject pending only when this socket is still the current one.
        if (this.ws !== ws) return;
        this.ws = null;
        for (const [, p] of this.pending) p.reject(cdpError("S103", "CDP 连接已断开(页面可能被导航/关闭)"));
        this.pending.clear();
      });
      ws.on("message", (raw: WebSocket.RawData) => {
        try {
          const m = JSON.parse(raw.toString()) as { id?: number; error?: { message?: string }; result?: unknown };
          if (m?.id != null && this.pending.has(m.id)) {
            const p = this.pending.get(m.id)!;
            this.pending.delete(m.id);
            if (m.error) p.reject(new Error(m.error.message ?? "CDP error"));
            else p.resolve(m.result);
          }
        } catch { /* 非 JSON 帧忽略 */ }
      });
    }).finally(() => {
      this.opening = null;
    });
    return this.opening;
  }

  private async send(method: string, params: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
    await this.connect();
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(cdpError("S103", `CDP ${method} 超时(>${Math.round(timeoutMs / 1000)}s)`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      try {
        (this.ws as CdpSocket).send(JSON.stringify({ id, method, params }));
      } catch (e) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(cdpError("S103", `CDP 发送失败: ${(e as Error)?.message ?? e}`));
      }
    });
  }

  async evaluate(expression: string, timeoutMs: number): Promise<unknown> {
    return this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, timeoutMs);
  }

  /** Raw CDP command (Input.insertText etc.) — same pending routing/timeout. */
  sendCommand(method: string, params: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
    return this.send(method, params, timeoutMs);
  }

  navigate(url: string, timeoutMs = 15_000): Promise<void> {
    return this.send("Page.navigate", { url }, timeoutMs).then(() => undefined);
  }

  /** Detach now (a live WS handle pins the event loop; temp connections must dispose). */
  dispose(): void {
    this.disposed = true;
    // Terminate BOTH candidates: with a stale CLOSING ws and a successor
    // still connecting, `ws ?? connecting` would short-circuit and leak the
    // successor (R6 Y1).
    for (const s of [this.ws, this.connectingSocket]) {
      if (s) { try { s.terminate(); } catch { /* already closed */ } }
    }
    this.ws = null;
    this.connectingSocket = null;
    // An in-flight command must error, not hang forever on a cleared map.
    for (const [, p] of this.pending) p.reject(cdpError("S103", "CDP 连接已释放(dispose)"));
    this.pending.clear();
  }
}
