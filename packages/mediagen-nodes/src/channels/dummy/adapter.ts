import type { ChannelAdapters } from "../../adapters/types.js";

/**
 * M6b mount drill: the smallest possible channel — a static 1×1 PNG, no
 * network, no secrets. Proves a new channel mounts with exactly: this
 * directory + one registry line in channels/index.ts + the manifest entry.
 */
const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const dummyImage = {
  kind: "image" as const,
  async submit(): Promise<{ status: "done"; kind: "bytes"; data: Uint8Array; mime: string }> {
    return {
      status: "done",
      kind: "bytes",
      data: new Uint8Array(Buffer.from(PNG_1X1_BASE64, "base64")),
      mime: "image/png",
    };
  },
};

export const dummyAdapters: ChannelAdapters = { image: dummyImage };
