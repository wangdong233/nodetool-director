import { describe, expect, it } from "vitest";
import agnesManifest from "../src/channels/agnes/manifest.json";
import cloudflareManifest from "../src/channels/cloudflare/manifest.json";
import dummyManifest from "../src/channels/dummy/manifest.json";
import hfspacesManifest from "../src/channels/hfspaces/manifest.json";
import siliconflowManifest from "../src/channels/siliconflow/manifest.json";
import zhipuManifest from "../src/channels/zhipu/manifest.json";
import { CHANNELS } from "../src/channels/index.js";
import type { MediagenManifestEntry } from "../src/manifest.js";

const fragments: Record<string, MediagenManifestEntry[]> = {
  zhipu: zhipuManifest as MediagenManifestEntry[],
  agnes: agnesManifest as MediagenManifestEntry[],
  cloudflare: cloudflareManifest as MediagenManifestEntry[],
  siliconflow: siliconflowManifest as MediagenManifestEntry[],
  hfspaces: hfspacesManifest as MediagenManifestEntry[],
  dummy: dummyManifest as MediagenManifestEntry[],
};

describe("mediagen manifest fragments", () => {
  it("covers exactly the registered channels", () => {
    expect(new Set(Object.keys(fragments))).toEqual(new Set(CHANNELS.map((c) => c.channel)));
  });

  it("keeps every entry well-formed with an https source and resolvable enums", () => {
    for (const [channel, entries] of Object.entries(fragments)) {
      for (const entry of entries) {
        expect(entry.configVersion, `${channel}.${entry.className}`).toBe(1);
        expect(entry.channel, `${channel}.${entry.className}`).toBe(channel);
        expect(entry.sourceUrl, `${channel}.${entry.className}`).toMatch(/^https:\/\//);
        expect(entry.className, `${channel}.${entry.className}`).toMatch(/^[A-Z][A-Za-z0-9]*$/);
        expect(entry.models.length, `${channel}.${entry.className}`).toBeGreaterThan(0);
        if (entry.defaultModel !== undefined) {
          expect(entry.models, `${channel}.${entry.className}`).toContain(entry.defaultModel);
        }
        if (entry.wire === "poll") {
          expect((entry.pollIntervalMs ?? 5000) as number).toBeGreaterThan(0);
          expect((entry.timeoutSeconds ?? 600) as number).toBeGreaterThan(0);
        }
        for (const field of entry.fields) {
          if (field.type === "enum") {
            const values = field.values === "@models" ? entry.models : field.values;
            expect(values, `${channel}.${entry.className}.${field.name}`).toBeDefined();
            expect(values!.length, `${channel}.${entry.className}.${field.name}`).toBeGreaterThan(0);
            if (field.default !== undefined) {
              expect(values, `${channel}.${entry.className}.${field.name}`).toContain(field.default);
            }
          }
        }
      }
    }
  });

  it("declares the channel's required settings on every entry", () => {
    for (const [channel, entries] of Object.entries(fragments)) {
      for (const entry of entries) {
        // hfspaces is the only anonymous-capable channel (token optional).
        if (channel === "hfspaces") continue;
        expect((entry.requiredSettings ?? []).length, `${channel}.${entry.className}`).toBeGreaterThan(0);
      }
    }
  });
});
