/**
 * mediagen-factory: manifest entries → BaseNode subclasses (higgsfield-factory
 * pattern). Owns field validation, media input resolution, adapter dispatch,
 * polling, safe download and output ref emission.
 */
import { applyContentCardBody, BaseNode, classifyFields, defaultForPropType, propertyOf, registerDeclaredProperty } from "@nodetool-ai/node-sdk";
import type { NodeClass, NodeValue, PropOptions } from "@nodetool-ai/node-sdk";
import type { ProcessingContext } from "@nodetool-ai/runtime";
import { getChannelAdapters } from "./channels/index.js";
import type { MediaBag, PollResult } from "./adapters/types.js";
import {
  executeMediagenCall,
  getChannelSecrets,
  imageRefFromBytes,
  MediagenChannelError,
  pollUntilDone,
  resolveMediaInput,
  safeDownload,
  videoRefFromBytes,
} from "./mediagen-base.js";
import { resolveFieldValues } from "./manifest.js";
import type { MediagenField, MediagenManifestEntry } from "./manifest.js";

type Context = ProcessingContext & {
  storage?: { store?: (key: string, bytes: Uint8Array, mime?: string) => Promise<string> };
};
type MediaOutput = { type: "image" | "video"; uri: string; data?: string };
type Output = { output: MediaOutput };

const MEDIA_TYPES = new Set(["image", "video", "audio"]);
const MEDIA_LIST_TYPES = new Set(["list[image]", "list[video]", "list[audio]"]);
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_TIMEOUT_SECONDS = 600;

function isEmptyMediaRef(value: NodeValue): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, NodeValue>;
  return record.uri === "" && record.data === null && record.asset_id === null;
}

function scalar(value: NodeValue, type: MediagenField["type"]): NodeValue {
  if (type === "int" && typeof value === "number") return Math.trunc(value);
  return value;
}

function validateNumericRange(field: MediagenField, value: NodeValue): void {
  if (typeof value !== "number") return;
  if (field.min !== undefined && value < field.min) throw new Error(`${field.name} must be at least ${field.min}`);
  if (field.max !== undefined && value > field.max) throw new Error(`${field.name} must be at most ${field.max}`);
}

async function toMediaOutput(
  entry: MediagenManifestEntry,
  result: Extract<PollResult, { status: "done" }>,
  context: Context | undefined,
  jobId: string,
): Promise<MediaOutput> {
  const bytes = result.kind === "bytes" ? result.data : (await safeDownload(entry.channel, result.url, context?.signal)).bytes;
  const store = context?.storage?.store;
  if (store) {
    const key = `mediagen-${entry.outputType}-${entry.channel}-${jobId}`;
    const uri = await store(key, bytes, entry.outputType === "image" ? undefined : "video/mp4");
    return { type: entry.outputType, uri };
  }
  const ref = entry.outputType === "image" ? imageRefFromBytes(bytes) : videoRefFromBytes(bytes);
  return { type: ref.type, uri: "", data: ref.data };
}

export function createMediagenNodeClass(spec: MediagenManifestEntry): NodeClass {
  const Node = class extends BaseNode {
    async process(context?: Context): Promise<Output> {
      const secrets = getChannelSecrets(spec.channel, spec.requiredSettings ?? [], this._secrets);
      const adapters = getChannelAdapters(spec.channel);
      const scalarInput: Record<string, NodeValue> = {};
      const media: MediaBag = {};
      for (const field of spec.fields) {
        const value = propertyOf(this, field.name);
        const empty = value === undefined || value === null || value === "" || isEmptyMediaRef(value) || (Array.isArray(value) && value.length === 0);
        if (empty) {
          if (field.required) throw new MediagenChannelError(spec.channel, "params", `${field.name} is required`);
          continue;
        }
        if (MEDIA_TYPES.has(field.type)) {
          media[field.name] = resolveMediaInput(value, context);
        } else if (MEDIA_LIST_TYPES.has(field.type)) {
          if (!Array.isArray(value)) throw new MediagenChannelError(spec.channel, "params", `${field.name} must be a list`);
          if (field.maxItems !== undefined && value.length > field.maxItems) {
            throw new MediagenChannelError(spec.channel, "params", `${field.name} accepts at most ${field.maxItems} items`);
          }
          media[field.name] = value.map((item) => resolveMediaInput(item, context));
        } else {
          const values = resolveFieldValues(spec, field);
          if (field.type === "enum" && values && !values.some((allowed) => allowed === value)) {
            // Structured rejection mirrors higgsfield-factory enum handling.
            throw new MediagenChannelError(spec.channel, "params", `${field.name} has an unsupported value`);
          }
          const normalized = scalar(value, field.type);
          validateNumericRange(field, normalized);
          scalarInput[field.name] = normalized;
        }
      }
      const adapterContext = { secrets, signal: context?.signal, fetchFn: fetch };
      const jobId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      if (spec.wire === "poll") {
        const adapter = adapters.video;
        if (!adapter) throw new MediagenChannelError(spec.channel, "params", `channel ${spec.channel} has no video adapter`);
        const params = { ...scalarInput, prompt: String(scalarInput.prompt ?? "") };
        const submitted = await executeMediagenCall(spec.channel, () => adapter.submit(params, media, adapterContext));
        if (!("handle" in submitted)) {
          if (submitted.status === "failed") throw failedAsError(spec.channel, submitted);
          throw new MediagenChannelError(spec.channel, "result", "submit returned no handle");
        }
        const result = await executeMediagenCall(spec.channel, () =>
          pollUntilDone(
            spec.channel,
            () => adapter.poll(submitted.handle, params, media, adapterContext),
            {
              intervalMs: spec.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
              timeoutMs: (spec.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS) * 1000,
              signal: context?.signal,
            },
          ),
        );
        if (result.status === "failed") throw failedAsError(spec.channel, result);
        return { output: await toMediaOutput(spec, result, context, jobId) };
      }
      const adapter = adapters.image;
      if (!adapter) throw new MediagenChannelError(spec.channel, "params", `channel ${spec.channel} has no image adapter`);
      const params = { ...scalarInput, prompt: String(scalarInput.prompt ?? "") };
      const result = await executeMediagenCall(spec.channel, () => adapter.submit(params, media, adapterContext));
      if (result.status === "failed") throw failedAsError(spec.channel, result);
      if (result.status === "running") throw new MediagenChannelError(spec.channel, "result", "inline adapter returned running");
      return { output: await toMediaOutput(spec, result, context, jobId) };
    }
  };
  Object.defineProperties(Node, {
    name: { value: spec.className },
    nodeType: { value: `mediagen.${spec.moduleName}.${spec.className}` },
    title: { value: spec.title },
    description: { value: spec.description },
    requiredSettings: { value: spec.requiredSettings ?? [] },
    autoSaveAsset: { value: true },
    metadataOutputTypes: { value: { output: spec.outputType } },
  });
  applyContentCardBody(Node);
  const classification = classifyFields(spec.fields.map((field) => ({ name: field.name, propType: field.type })));
  Object.defineProperties(Node, {
    inlineFields: { value: classification.inlineFields },
    inputFields: { value: classification.inputFields },
  });
  for (const field of spec.fields) {
    let initialDefault: unknown;
    if (field.name === "model") {
      initialDefault = spec.defaultModel ?? spec.models[0];
    } else {
      initialDefault = Object.prototype.hasOwnProperty.call(field, "default") ? field.default : defaultForPropType(field.type);
    }
    const options: PropOptions = { type: field.type, default: initialDefault };
    if (field.title) options.title = field.title;
    if (field.description) options.description = field.description;
    const values = resolveFieldValues(spec, field);
    if (values) options.values = values;
    if (field.min !== undefined) options.min = field.min;
    if (field.max !== undefined) options.max = field.max;
    registerDeclaredProperty(Node, field.name, options);
  }
  return Node as NodeClass;
}

function failedAsError(channel: string, result: Extract<PollResult, { status: "failed" }>): MediagenChannelError {
  const code = result.quota ? "quota" : "result";
  return new MediagenChannelError(channel, code, result.message ?? result.code, result.retryable ?? false, result.quota ?? false);
}

export function loadMediagenNodesFromManifest(manifest: MediagenManifestEntry[]): readonly NodeClass[] {
  return manifest.map(createMediagenNodeClass);
}
