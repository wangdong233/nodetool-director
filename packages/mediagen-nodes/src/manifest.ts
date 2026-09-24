/**
 * Manifest types + per-channel fragment loader. Each channel owns its
 * self-contained directory src/channels/<channel>/{adapter.ts, manifest.json}:
 * adding a channel = one directory + one registry line in channels/index.ts
 * (+ url-egress registration, H5).
 */
import { loadPackageAssetJson } from "@nodetool-ai/config";

export type MediagenFieldType =
  | "str"
  | "int"
  | "float"
  | "bool"
  | "enum"
  | "image"
  | "video"
  | "audio"
  | "list[image]"
  | "list[video]"
  | "list[audio]";

export interface MediagenField {
  name: string;
  type: MediagenFieldType;
  title?: string;
  description?: string;
  default?: unknown;
  /** Literal enum values, or "@models" to reference the entry's models array. */
  values?: Array<string | number> | "@models";
  min?: number;
  max?: number;
  maxItems?: number;
  required?: boolean;
}

export interface MediagenManifestEntry {
  configVersion: 1;
  /** Channel id — must exist in the ADAPTERS registry (adapters/index.ts). */
  channel: string;
  className: string;
  moduleName: string;
  /** "inline" = synchronous image; "poll" = submit→poll video. */
  wire: "inline" | "poll";
  outputType: "image" | "video";
  title: string;
  description: string;
  /** API reference URL (manifest integrity test enforces https). */
  sourceUrl: string;
  models: Array<string>;
  defaultModel?: string;
  pollIntervalMs?: number;
  timeoutSeconds?: number;
  requiredSettings?: Array<string>;
  fields: MediagenField[];
}

export function resolveFieldValues(entry: MediagenManifestEntry, field: MediagenField): Array<string | number> | undefined {
  if (field.values === "@models") return entry.models;
  return field.values;
}

/**
 * Load the combined manifest. Sources live per-channel in
 * src/channels/<channel>/manifest.json; the package build merges them into a
 * single dist/mediagen-manifest.json (flat packaged layout requires unique
 * asset basenames — five "manifest.json" entries would collide).
 */
export function loadMediagenManifest(): MediagenManifestEntry[] {
  return loadPackageAssetJson<MediagenManifestEntry[]>(
    { pkg: "@nodetool-ai/mediagen-nodes", path: "mediagen-manifest.json" },
    import.meta.url,
  );
}
