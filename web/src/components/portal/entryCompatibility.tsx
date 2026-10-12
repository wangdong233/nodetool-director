import type { ReactNode } from "react";
import type { Workflow } from "../../stores/ApiTypes";
import type { NodeMetadata } from "../../stores/ApiTypes";
import { formatGenericProviderName, isLocalProvider } from "../../utils/providerDisplay";
import { isRecord, isString } from "../../utils/typePredicates";
import { i18n } from "../../i18n";
import { useTranslation } from "react-i18next";

export interface EntryWorkflowLike {
  input_schema?: unknown;
  graph?: unknown;
  required_providers?: unknown;
  required_models?: unknown;
}

interface ModelRequirement {
  provider?: string;
  id: string;
  selected: boolean;
}

export interface EntryCompatibility {
  inputs: Array<{ name: string; required: boolean | null }>;
  providers: string[];
  selectedModels: ModelRequirement[];
  compatibleModels: ModelRequirement[];
  requiredSettings: string[];
  requiredRuntimes: string[];
  executionLocation: string;
  unknowns: string[];
}

const unique = (values: string[]): string[] => [...new Set(values)];

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter(isString) : [];

const providerFromNodeType = (nodeType: string | undefined): string | undefined => {
  if (!nodeType || nodeType.startsWith("nodetool.")) {
    return undefined;
  }
  return nodeType.split(".")[0] || undefined;
};

const modelIdFromRecord = (value: Record<string, unknown>): string | undefined => {
  for (const key of ["id", "model", "model_id", "endpoint_id"]) {
    const candidate = value[key];
    if (isString(candidate) && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
};

const addModel = (
  models: ModelRequirement[],
  id: string,
  provider: string | undefined,
  selected: boolean
): void => {
  const key = `${provider ?? ""}/${id}`;
  if (!models.some((model) => `${model.provider ?? ""}/${model.id}` === key)) {
    models.push({ id, provider, selected });
  }
};

const collectModelSelections = (
  value: unknown,
  providerHint: string | undefined,
  models: ModelRequirement[],
  keyHint = ""
): void => {
  if (Array.isArray(value)) {
    value.forEach((item) =>
      collectModelSelections(item, providerHint, models, keyHint)
    );
    return;
  }
  if (!isRecord(value)) {
    if (
      isString(value) &&
      (keyHint === "model" || keyHint.endsWith("_model") || keyHint === "model_id") &&
      value.trim()
    ) {
      addModel(models, value.trim(), providerHint, true);
    }
    return;
  }

  const provider = isString(value.provider) ? value.provider : providerHint;
  const id = modelIdFromRecord(value);
  if (id && (value.type === undefined || isString(value.type))) {
    addModel(models, id, provider, true);
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "provider" || key === "id" || key === "name" || key === "type") {
      continue;
    }
    collectModelSelections(child, provider, models, key);
  }
};

const inputNamesFromSchema = (
  schema: unknown
): Array<{ name: string; required: boolean | null }> | null => {
  if (!isRecord(schema) || !isRecord(schema.properties)) {
    return null;
  }
  const required = new Set(stringArray(schema.required));
  return Object.entries(schema.properties).map(([name, value]) => ({
    name:
      isRecord(value) && isString(value.title) && value.title.trim()
        ? value.title.trim()
        : name,
    required: required.has(name)
  }));
};

const graphNodes = (graph: unknown): Array<Record<string, unknown>> => {
  if (!isRecord(graph) || !Array.isArray(graph.nodes)) {
    return [];
  }
  return graph.nodes.filter(isRecord);
};

const inputNamesFromGraph = (
  workflows: EntryWorkflowLike[]
): Array<{ name: string; required: boolean | null }> => {
  const names: Array<{ name: string; required: boolean | null }> = [];
  for (const workflow of workflows) {
    for (const node of graphNodes(workflow.graph)) {
      const type = isString(node.type) ? node.type : "";
      const data = isRecord(node.data) ? node.data : null;
      if (!type.includes(".input.") || !data || !isString(data.name)) {
        continue;
      }
      const name = data.name.trim();
      if (name && !names.some((input) => input.name === name)) {
        names.push({ name, required: null });
      }
    }
  }
  return names;
};

const formatRequiredModel = (model: ModelRequirement): string => {
  const provider = model.provider
    ? formatGenericProviderName(model.provider)
    : i18n.t("editor:ui.unknownProvider", { defaultValue: "Unknown provider" });
  return `${provider} / ${model.id}`;
};

const executionLocation = (providers: string[]): string => {
  const local = providers.some((provider) => isLocalProvider(provider));
  const remote = providers.some((provider) => !isLocalProvider(provider));
  if (local && remote) return i18n.t("editor:ui.execLocalAndProviderHosted");
  if (local) return i18n.t("editor:ui.execLocal");
  if (remote) return i18n.t("editor:ui.execProviderHosted");
  return i18n.t("editor:ui.execUnknownNotDeclared");
};

export const getWorkflowCompatibility = (
  workflow: Workflow | EntryWorkflowLike,
  metadata: Record<string, NodeMetadata>
): EntryCompatibility => {
  const workflows = [workflow];
  return getCompatibility(workflows, metadata);
};

const getCompatibility = (
  workflows: EntryWorkflowLike[],
  metadata: Record<string, NodeMetadata>
): EntryCompatibility => {
  const schemaInputs = workflows
    .map((workflow) => inputNamesFromSchema(workflow.input_schema))
    .filter((inputs): inputs is Array<{ name: string; required: boolean | null }> => inputs !== null);
  const inputs = schemaInputs.length
    ? schemaInputs.flat().filter(
        (input, index, all) => all.findIndex((candidate) => candidate.name === input.name) === index
      )
    : inputNamesFromGraph(workflows);

  const selectedModels: ModelRequirement[] = [];
  const compatibleModels: ModelRequirement[] = [];
  const providers: string[] = [];
  const requiredSettings: string[] = [];
  const requiredRuntimes: string[] = [];
  let missingMetadata = false;

  for (const workflow of workflows) {
    providers.push(...stringArray(workflow.required_providers));
    for (const model of stringArray(workflow.required_models)) {
      const slash = model.indexOf("/");
      addModel(
        selectedModels,
        slash > 0 ? model.slice(slash + 1) : model,
        slash > 0 ? model.slice(0, slash) : undefined,
        true
      );
    }

    for (const node of graphNodes(workflow.graph)) {
      const nodeType = isString(node.type) ? node.type : undefined;
      const nodeMetadata = nodeType ? metadata[nodeType] : undefined;
      if (!nodeMetadata) missingMetadata = true;
      if (nodeMetadata) {
        requiredSettings.push(...nodeMetadata.required_settings);
        requiredRuntimes.push(...nodeMetadata.required_runtimes ?? []);
        if (!selectedModels.length) {
          for (const model of nodeMetadata.recommended_models) {
            if (model.id) {
              addModel(
                compatibleModels,
                model.id,
                model.provider ?? undefined,
                false
              );
            }
          }
        }
      }
      collectModelSelections(
        node.data,
        providerFromNodeType(nodeType),
        selectedModels
      );
      collectModelSelections(
        node.dynamic_properties,
        providerFromNodeType(nodeType),
        selectedModels
      );
    }
  }

  const uniqueProviders = unique([
    ...providers,
    ...selectedModels.flatMap((model) => (model.provider ? [model.provider] : [])),
    ...compatibleModels.flatMap((model) => (model.provider ? [model.provider] : []))
  ]);
  const unknowns: string[] = [];
  if (!inputs.length) {
    unknowns.push(
      workflows.some((workflow) => workflow.graph)
        ? "No inputs are declared"
        : "Input requirements are unknown"
    );
  } else if (inputs.some((input) => input.required === null)) {
    unknowns.push("Which inputs are required is unknown");
  }
  if (!selectedModels.length && !compatibleModels.length) {
    unknowns.push("Provider/model requirements are unknown");
  } else if (!selectedModels.length) {
    unknowns.push("No model is selected; compatible options are shown only as guidance");
  }
  if (uniqueProviders.some((provider) => !provider.trim())) {
    unknowns.push("A provider is not declared for one or more models");
  }
  if (uniqueProviders.some((provider) => !isLocalProvider(provider)) && !requiredSettings.length) {
    unknowns.push("Credential requirements are not declared");
  }
  if (missingMetadata && !requiredRuntimes.length) {
    unknowns.push("Runtime requirements are unknown for some nodes");
  }

  return {
    inputs,
    providers: uniqueProviders,
    selectedModels,
    compatibleModels,
    requiredSettings: unique(requiredSettings),
    requiredRuntimes: unique(requiredRuntimes),
    executionLocation: executionLocation(uniqueProviders),
    unknowns: unique(unknowns)
  };
};

interface CompatibilityDetailsProps {
  compatibility: EntryCompatibility;
}

/**
 * `unknowns` carries English sentinel strings (the `startsWith` check below
 * and any consumer comparing entries depend on them), so localization happens
 * at render time through this closed map keyed by the exact English source.
 */
const COMPAT_UNKNOWN_KEYS: Record<string, string> = {
  "No inputs are declared": "editor:ui.compatUnknownNoInputs",
  "Input requirements are unknown": "editor:ui.compatUnknownInputReq",
  "Which inputs are required is unknown": "editor:ui.compatUnknownWhichInputs",
  "Provider/model requirements are unknown": "editor:ui.compatUnknownProviderModel",
  "No model is selected; compatible options are shown only as guidance":
    "editor:ui.compatUnknownNoModelSelected",
  "A provider is not declared for one or more models": "editor:ui.compatUnknownNoProvider",
  "Credential requirements are not declared": "editor:ui.compatUnknownCreds",
  "Runtime requirements are unknown for some nodes": "editor:ui.compatUnknownRuntime"
};

export const CompatibilityDetails = ({
  compatibility
}: CompatibilityDetailsProps): ReactNode => {
  const { t } = useTranslation();
  const inputRequirementsUnknown = compatibility.unknowns.some((unknown) =>
    unknown.startsWith("Input requirements are unknown")
  );
  const inputLabel = compatibility.inputs.length
    ? compatibility.inputs
        .map((input) =>
          input.required === true
            ? t("editor:ui.compatInputRequired", { defaultValue: "{{name}} (required)", name: input.name })
            : input.required === false
              ? t("editor:ui.compatInputOptional", { defaultValue: "{{name}} (optional)", name: input.name })
              : t("editor:ui.compatInputRequirementUnknown", { defaultValue: "{{name}} (requirement unknown)", name: input.name })
        )
        .join(", ")
    : inputRequirementsUnknown
      ? t("editor:ui.unknown", { defaultValue: "Unknown" })
      : t("editor:ui.noneDeclared", { defaultValue: "None declared" });
  const modelLabel = compatibility.selectedModels.length
    ? compatibility.selectedModels.map(formatRequiredModel).join(", ")
    : compatibility.compatibleModels.length
      ? t("editor:ui.notSelectedSuffix", { v: compatibility.compatibleModels.map(formatRequiredModel).join(", ") })
      : t("editor:ui.unknown", { defaultValue: "Unknown" });
  const providerLabel = compatibility.providers.length
    ? compatibility.providers.map(formatGenericProviderName).join(", ")
    : t("editor:ui.unknownProvider", { defaultValue: "Unknown provider" });
  const providerModelLabel = compatibility.selectedModels.length
    ? compatibility.selectedModels.map(formatRequiredModel).join(", ")
    : compatibility.compatibleModels.length
      ? t("editor:ui.notSelectedSuffix", { v: compatibility.compatibleModels.map(formatRequiredModel).join(", ") })
      : `${providerLabel} / ${modelLabel}`;

  return (
    <span className="entry-compat" aria-label={t("editor:ui.compatibilityDetails", { defaultValue: "Compatibility details" })}>
      <span>{t("editor:ui.compatInputs", { v: inputLabel })}</span>
      <span>{t("editor:ui.compatProviderModel", { v: providerModelLabel })}</span>
      <span>{t("editor:ui.compatExecution", { v: compatibility.executionLocation })}</span>
      {compatibility.requiredSettings.length > 0 && (
        <span>{t("editor:ui.compatRequiredSetup", { v: compatibility.requiredSettings.join(", ") })}</span>
      )}
      {compatibility.requiredRuntimes.length > 0 && (
        <span>{t("editor:ui.compatRuntime", { v: compatibility.requiredRuntimes.join(", ") })}</span>
      )}
      {compatibility.unknowns.map((unknown) => (
        <span key={unknown}>
          {t(
            COMPAT_UNKNOWN_KEYS[unknown] ?? "editor:ui.compatUnknown",
            COMPAT_UNKNOWN_KEYS[unknown]
              ? { defaultValue: unknown }
              : { v: unknown }
          )}
        </span>
      ))}
    </span>
  );
};
