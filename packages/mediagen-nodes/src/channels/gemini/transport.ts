/**
 * Gemini web transport — ported from media-gen-mcp src/providers/gemini-web.ts
 * (MIT, Copyright (c) 2026 media-gen-mcp contributors).
 *
 * GeminiTransport is THE test seam (source discipline): unit tests stub the
 * interface, production uses CdpGeminiTransport over the CDP WebSocket client.
 * The HTTP discovery calls below target the operator's own loopback CDP port
 * only — classified `private-integration` in the URL egress inventory (see
 * packages/runtime/tests/url-egress-inventory.ts).
 */
import { existsSync, utimesSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { MediagenChannelError } from "../../mediagen-base.js";
import { CdpConnection, type CdpSocketFactory } from "./cdp.js";

const CHANNEL = "gemini";
const GEMINI_ORIGIN = "https://gemini.google.com";
const DEFAULT_TAB_URL = `${GEMINI_ORIGIN}/app`;
export const DEFAULT_GEMINI_CDP_PORT = 9225;
const CDP_HOST = "127.0.0.1";
const EVAL_TIMEOUT_MS = 30_000;
const NAV_SETTLE_MS = 4_000;

const LAUNCH_HINT =
  "start the channel Chrome: lasso launch-chrome --port 9225 --profile gemini --idle-ms 0 --no-hard-cap (Mac) — on Windows use the documented chrome --remote-debugging-port=9225 command (deploy-windows.md)";

function geminiError(code: "S100" | "S101" | "S102" | "S103", message: string, hint: string = ""): MediagenChannelError {
  // S100/S101/S102 are environment-down preconditions → auth/non-retryable;
  // S103 is transient transport → network/retryable (mapping table in 92 §3).
  // Default hint is EMPTY (R27): a transient must never suggest relaunching
  // the channel Chrome — that action sinks an in-flight billed generation.
  // Environment sites pass their hint explicitly.
  const kind = code === "S103" ? "network" : "auth";
  const retryable = code === "S103";
  return new MediagenChannelError(CHANNEL, kind, `${code}: ${message}${hint ? ` (${hint})` : ""}`, retryable);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface GeminiTransport {
  open(): Promise<{ pageUrl: string }>;
  eval(expression: string, timeoutMs?: number): Promise<unknown>;
  insertText(text: string): Promise<void>;
  navigate(url: string): Promise<void>;
  /** Release the CDP connection (every adapter entry point calls this in finally). */
  dispose?(): void;
}

interface PageTarget {
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

export class CdpGeminiTransport implements GeminiTransport {
  private conn: CdpConnection | null = null;
  private pageUrl = "";
  healNewTabSettleMs = NAV_SETTLE_MS;

  constructor(
    private readonly port: number = DEFAULT_GEMINI_CDP_PORT,
    private readonly socketFactory?: CdpSocketFactory,
  ) {}

  private async listTargets(): Promise<PageTarget[]> {
    try {
      // Inline template literal (loopback CDP discovery) — see file header.
      const res = await fetch(`http://${CDP_HOST}:${this.port}/json/list`, { signal: AbortSignal.timeout(5_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as PageTarget[];
    } catch (e) {
      throw geminiError("S100", `CDP ${CDP_HOST}:${this.port} 不可连(${(e as Error)?.message ?? e})`, LAUNCH_HINT);
    }
  }

  private attachPage(pages: PageTarget[]): { pageUrl: string } {
    const page = pages[0];
    if (!page?.webSocketDebuggerUrl) {
      throw geminiError("S103", "page target 无 webSocketDebuggerUrl(页面可能正在关闭)", "");
    }
    this.pageUrl = page.url;
    this.conn = new CdpConnection(page.webSocketDebuggerUrl, this.socketFactory);
    this.touchActivitySignal();
    return { pageUrl: this.pageUrl };
  }

  /**
   * Lasso idle-reaper double insurance (91 §7): an external CDP consumer
   * touching ~/.cache/lasso/chrome-touch-<port> marks the browser in use.
   * No-op when the file is absent — lasso is not managing this Chrome (the
   * bare `chrome --remote-debugging-port` launch on Windows).
   */
  private touchActivitySignal(): void {
    try {
      const path = join(homedir(), ".cache", "lasso", `chrome-touch-${this.port}`);
      if (existsSync(path)) utimesSync(path, new Date(), new Date());
    } catch {
      // Observation only — the reaper is disabled by the documented launch
      // flags anyway (--idle-ms 0 --no-hard-cap); a failed touch never fails a run.
    }
  }

  private async openTab(url: string): Promise<void> {
    // Loopback CDP tab creation (PUT /json/new) — see file header on egress.
    const res = await fetch(`http://${CDP_HOST}:${this.port}/json/new?${encodeURIComponent(url)}`, {
      method: "PUT",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tab = (await res.json()) as PageTarget;
    const wsUrl = tab?.webSocketDebuggerUrl;
    if (typeof wsUrl !== "string" || !wsUrl) throw new Error("新 tab 无 webSocketDebuggerUrl");
    const tmp = new CdpConnection(wsUrl, this.socketFactory);
    try {
      await tmp.navigate(url);
    } finally {
      tmp.dispose();
    }
  }

  async open(): Promise<{ pageUrl: string }> {
    if (this.conn) return { pageUrl: this.pageUrl };
    const geminiPages = (list: PageTarget[]) =>
      list.filter((t) => t.type === "page" && t.url.startsWith(`${GEMINI_ORIGIN}/`));
    let pages = geminiPages(await this.listTargets());
    if (!pages.length) {
      const tabUrl = DEFAULT_TAB_URL;

      try {
        await this.openTab(tabUrl);
      } catch { /* 开页自愈失败 → 复探后走原 S101 */ }
      await sleep(this.healNewTabSettleMs);
      pages = geminiPages(await this.listTargets());
      if (!pages.length) {
        throw geminiError(
          "S101",
          `CDP 可连但无 gemini.google.com page target(已尝试自动开页未果)`,
          `open ${DEFAULT_TAB_URL} in the channel Chrome`,
        );
      }
    }
    return this.attachPage(pages);
  }

  async eval(expression: string, timeoutMs: number = EVAL_TIMEOUT_MS): Promise<unknown> {
    if (!this.conn) throw geminiError("S103", "CDP 未连接(先 open())", "");
    let r: { exceptionDetails?: { exception?: { description?: string }; text?: string }; result?: { value?: unknown } };
    try {
      r = (await this.conn.evaluate(expression, timeoutMs)) as typeof r;
    } catch (e) {
      if (e instanceof MediagenChannelError) throw e;
      // The socket may still be open (per-command timeout) — release it, or
      // nulling the reference leaks the handle past the adapter's finally.
      this.conn?.dispose();
      this.conn = null;
      throw geminiError("S103", `CDP evaluate 失败: ${(e as Error)?.message ?? e}`, "");
    }
    if (r?.exceptionDetails) {
      const d = r.exceptionDetails;
      this.conn?.dispose();
      this.conn = null;
      throw geminiError("S103", `页面执行异常: ${String(d.exception?.description ?? d.text).slice(0, 300)}`, "页面可能已被导航/关闭;重开 gemini.google.com 后重试");
    }
    return r?.result?.value;
  }

  async insertText(text: string): Promise<void> {
    if (!this.conn) throw geminiError("S103", "CDP 未连接(先 open())", "");
    await this.conn.sendCommand("Input.insertText", { text }, 10_000);
  }

  async navigate(url: string): Promise<void> {
    if (!this.conn) throw geminiError("S103", "CDP 未连接(先 open())", "");
    await this.conn.navigate(url);
  }

  dispose(): void {
    this.conn?.dispose();
    this.conn = null;
  }
}

// ── Page-side probe expressions (ported verbatim; zero-exception contract) ──

export const EXPR_LOGIN = `(() => {
  try {
    const a = document.querySelector('a[aria-label*="Google 账号"],a[aria-label*="Google Account"]');
    const label = a ? a.getAttribute('aria-label') : null;
    return { logged: !!label, account: label ? String(label).slice(0, 120) : null, url: location.href };
  } catch (e) { return { __err: String(e) }; }
})()`;

const jsonLiteral = (v: unknown): string =>
  JSON.stringify(v).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

// Verbatim from the L1 source (gemini-web.ts table T) — real-machine
// verified UI forms. Do not transcribe by hand: diff against the L1 table
// when touching this (R7 R1 caught transcription drift here).
const TOOLS_MENU_LABELS = ["上传和工具", "Upload and tools", "Upload & tools"];
const IMAGE_MODE_ITEMS = ["制作图片", "Create image", "Image"];
const VIDEO_MODE_ITEMS = ["制作视频", "Create video", "Video"];
const SEND_LABELS = ["发送", "Send", "Submit"];

export const exprOpenToolsMenu = (): string => `(() => {
  try {
    const btn = [...document.querySelectorAll('button,[role="button"]')].find(b => {
      const l = (b.getAttribute('aria-label') || '').trim();
      return ${jsonLiteral(TOOLS_MENU_LABELS)}.some(t => l.includes(t));
    });
    if (!btn) return { ok: false, stage: 'menu-btn', visibleLabels: [...document.querySelectorAll('button')].map(b => (b.getAttribute('aria-label')||'').trim()).filter(Boolean).slice(0, 24) };
    btn.click();
    return { ok: true };
  } catch (e) { return { __err: String(e) }; }
})()`;

export const exprClickModeItem = (kind: "image" | "video"): string => {
  const candidates = kind === "image" ? IMAGE_MODE_ITEMS : VIDEO_MODE_ITEMS;
  return `(() => {
    try {
      const ov = document.querySelector('.cdk-overlay-container') || document.body;
      const cands = ${jsonLiteral(candidates)};
      for (const c of cands) {
        const leaves = [...ov.querySelectorAll('*')].filter(el => el.children.length === 0 && (el.textContent || '').trim() === c);
        if (leaves.length) {
          let t = leaves[0];
          for (let i = 0; i < 5 && t; i++) { t.dispatchEvent(new MouseEvent('click', { bubbles: true })); t = t.parentElement; }
          return { ok: true, matched: c };
        }
      }
      return { ok: false, stage: 'menu-item', menuText: (ov.innerText || '').slice(0, 300) };
    } catch (e) { return { __err: String(e) }; }
  })()`;
};

export const EXPR_FOCUS_INPUT = `(() => {
  try {
    const t = document.querySelector('rich-textarea textarea, rich-textarea [contenteditable], textarea');
    if (!t) return { ok: false, stage: 'input' };
    t.focus();
    return { ok: true };
  } catch (e) { return { __err: String(e) }; }
})()`;

export const exprClickSend = (): string => `(() => {
  try {
    const sb = [...document.querySelectorAll('button,[role="button"]')].find(b => {
      const l = (b.getAttribute('aria-label') || '').trim();
      return ${jsonLiteral(SEND_LABELS)}.some(t => l.includes(t)) && !!(b.offsetWidth || b.offsetHeight);
    });
    if (!sb) return { ok: false, stage: 'send-btn' };
    sb.click();
    return { ok: true };
  } catch (e) { return { __err: String(e) }; }
})()`;

export const EXPR_POLL_IMAGE = `(() => {
  try {
    const gen = [...document.images].filter(im => im.naturalWidth > 300 && !/gstatic|googleusercontent\\.com\\/ogw\\//.test(im.src));
    const src = gen.map(im => im.src).find(s => s.startsWith('blob:')) || gen.map(im => im.src).find(Boolean) || null;
    const imgActions = [...document.querySelectorAll('button')].map(b => b.getAttribute('aria-label') || '').filter(l => /下载|分享图片|Download|Share image/.test(l));
    const body = document.body.innerText || '';
    const err = /请检查互联网连接|再试一次|无法生成|达到.{0,8}上限|Something went wrong|try again later|can't generate/i.exec(body);
    return { count: gen.length, src, ready: gen.length > 0 && imgActions.length > 0, err: err ? err[0] : null };
  } catch (e) { return { __err: String(e) }; }
})()`;

export const EXPR_POLL_VIDEO = `(() => {
  try {
    const v = document.querySelector('video');
    const src = v ? String(v.currentSrc || v.src || '') : '';
    const body = document.body.innerText || '';
    const readyMark = /Your video is ready|视频已就绪|视频已生成|is ready/i.test(body);
    const err = /请检查互联网连接|再试一次|无法生成|达到.{0,8}上限|Something went wrong|try again later|can't generate/i.exec(body);
    return { src: src.slice(0, 800), ready: !!src && (readyMark || /usercontent|blob:/.test(src)), err: err ? err[0] : null, dur: v && isFinite(v.duration) ? Math.round(v.duration * 10) / 10 : null };
  } catch (e) { return { __err: String(e) }; }
})()`;

export const EXPR_CANVAS_GRAB = `(async () => {
  try {
    const im = [...document.images].filter(i => i.naturalWidth > 300 && !/gstatic/.test(i.src)).pop();
    if (!im) return { __err: 'no generated image' };
    try { await im.decode(); } catch (e) {}
    const c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    c.getContext('2d').drawImage(im, 0, 0);
    const dataUrl = c.toDataURL('image/jpeg', 0.92);
    const b64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
    return { b64, contentType: 'image/jpeg', w: c.width, h: c.height, bytes: Math.round(b64.length * 3 / 4) };
  } catch (e) { return { __err: String(e && e.message || e) }; }
})()`;

export const exprFetchB64 = (src: string): string => `(async () => {
  try {
    const resp = await fetch(${jsonLiteral(src)}, { credentials: 'include' });
    if (!resp.ok) return { __err: 'HTTP ' + resp.status };
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    return { b64: btoa(bin), contentType: resp.headers.get('content-type') || '', bytes: bytes.length };
  } catch (e) { return { __err: String(e && e.message || e) }; }
})()`;
