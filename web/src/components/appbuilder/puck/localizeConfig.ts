/**
 * Render-time localization of the puck app config.
 *
 * `appConfig` is built at module scope, so its label strings are frozen
 * English — and puck renders them straight from the store's config
 * (AutoField reads `field.label`, the drawer reads `component.label`,
 * selects render `options[].label`). Puck swaps a changed `config` prop into
 * its live store via an effect, so cloning the config with translated labels
 * — inside a `useMemo` keyed on a languageChanged revision (see
 * PuckAppEditor) — localizes every field label, select/radio option, array
 * field, and drawer item without touching puck internals.
 *
 * The walk is shape-aware on purpose: only `label`/`title` props of
 * field-like objects (they carry a string `type`), select/radio `options`
 * entries, component entries, and category titles are rewritten. Document
 * DATA — `defaultProps` (a widget's seeded text, placeholder, tabs) — is
 * never touched: it is authored content, and widgets that render a shipped
 * default translate it at their own render sites via `tAttr` fallback.
 */

import type { Config } from "@puckeditor/core";
import { tAttr } from "../i18nAttrs";

/** True when the object looks like a puck field definition. */
const isFieldLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { type?: unknown }).type === "string";

/** True when the object looks like a select/radio option entry. */
const isOptionLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { label?: unknown }).label === "string" &&
  "value" in (value as Record<string, unknown>);

/** Translate one field definition tree (label, options, array/object sub-fields). */
const localizeField = (field: unknown): unknown => {
  if (!isFieldLike(field)) return field;

  const next: Record<string, unknown> = {};
  let changed = false;
  for (const [key, value] of Object.entries(field)) {
    if (key === "label" && typeof value === "string") {
      next.label = tAttr(value);
      changed = next.label !== value || changed;
      continue;
    }
    if (key === "options") {
      next.options = localizeOptions(value);
      changed = true; // identity change is fine: puck re-reads on config swap
      continue;
    }
    if (
      (key === "arrayFields" || key === "objectFields") &&
      typeof value === "object" &&
      value !== null
    ) {
      next[key] = localizeFields(value as Record<string, unknown>);
      changed = true; // identity change is fine: puck re-reads on config swap
      continue;
    }
    next[key] = value;
  }
  return changed ? next : field;
};

/** Translate a fields record (`{ propName: Field }`). */
const localizeFields = (fields: Record<string, unknown>): Record<string, unknown> => {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    next[key] = localizeField(value);
  }
  return next;
};

/** Translate an option list (`options: [{ label, value }]`). */
const localizeOptions = (options: unknown): unknown =>
  Array.isArray(options)
    ? options.map((option) =>
        isOptionLike(option)
          ? { ...option, label: tAttr(option.label as string) }
          : option
      )
    : options;

/**
 * Clone `config` with every editor-chrome string resolved through `tAttr`.
 * Render/defaults/functions are kept by reference where nothing changed, so
 * React element identity churn stays limited to the label-bearing nodes.
 */
export function localizeAppConfig(config: Config): Config {
  const next: Config = { ...config };

  if (config.root) {
    next.root = {
      ...config.root,
      fields: localizeFields(
        (config.root.fields ?? {}) as Record<string, unknown>
      ) as typeof config.root.fields
    };
  }

  if (config.categories) {
    next.categories = {};
    for (const [id, category] of Object.entries(config.categories)) {
      next.categories[id] = {
        ...category,
        title: tAttr(category.title ?? id)
      };
    }
  }

  if (config.components) {
    next.components = {};
    for (const [id, component] of Object.entries(config.components)) {
      next.components[id] = {
        ...component,
        label: tAttr(component.label ?? id),
        fields: localizeFields(
          (component.fields ?? {}) as Record<string, unknown>
        ) as typeof component.fields
      };
    }
  }

  return next;
}
