/**
 * The aspect ratios a storyboard can be shot at.
 *
 * One list, because two surfaces offer it — the board's settings form and the
 * setup flow's style step — and a board created at a ratio the settings form
 * does not offer cannot be changed back.
 */
import { i18n } from "../../i18n";

export const ASPECT_OPTIONS = [
  { value: "16:9", label: "16:9 — Widescreen", labelKey: "storyboard:attrs.widescreen" },
  { value: "9:16", label: "9:16 — Vertical", labelKey: "storyboard:attrs.vertical" },
  { value: "1:1", label: "1:1 — Square", labelKey: "storyboard:attrs.square" },
  { value: "4:3", label: "4:3 — Classic", labelKey: "storyboard:attrs.classic" },
  { value: "21:9", label: "21:9 — Cinematic", labelKey: "storyboard:attrs.cinematic" }
] as const;

/** Resolve an aspect option label through i18n at the render point. */
export const aspectOptionLabel = (option: (typeof ASPECT_OPTIONS)[number]): string =>
  i18n.t(option.labelKey, { defaultValue: option.label });

/** What a board is shot at unless the creator says otherwise. */
export const DEFAULT_ASPECT_RATIO = "16:9";

/**
 * The ratio a frame of `width` × `height` is closest to.
 *
 * A sequence stores dimensions, not a ratio, so every surface that needs the
 * ratio derives it: the look step's picker and its cost estimate, and
 * `generateFromBeats` when it stamps the clips it is about to pay to render.
 * Those three disagreeing is what let a portrait timeline send 16:9 requests.
 */
export const aspectOf = (width: number, height: number): string => {
  const ratio = width / height;
  let best: string = ASPECT_OPTIONS[0].value;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const option of ASPECT_OPTIONS) {
    const [w, h] = option.value.split(":").map(Number);
    const gap = Math.abs(ratio - w / h);
    if (gap < bestGap) {
      best = option.value;
      bestGap = gap;
    }
  }
  return best;
};
