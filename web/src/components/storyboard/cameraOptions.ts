/**
 * cameraOptions
 *
 * The vocabularies the Edit Shot dialog offers for a shot's camera direction.
 * They are suggestions, not a schema: `CameraDirection` holds free strings, and
 * an agent or an imported screenplay may write anything. {@link cameraOptions}
 * therefore keeps whatever the shot already carries as an option of its own, so
 * opening a select never silently rewrites a value it does not recognise.
 *
 * The strings are also storage values: the camera-pass schema enums and the
 * shotlist CSV importer compare against them, so they stay English. Only the
 * select labels localize, through the `storyboard:attrs` key family below.
 */

import type { SelectOption } from "../ui_primitives";
import { i18n } from "../../i18n";

export const FRAMING_OPTIONS = [
  "extreme wide",
  "wide",
  "medium wide",
  "medium",
  "medium close-up",
  "close-up",
  "extreme close-up",
  "over-the-shoulder",
  "two-shot",
  "insert"
] as const;

export const LENS_OPTIONS = [
  "14mm",
  "18mm",
  "24mm",
  "28mm",
  "35mm",
  "50mm",
  "85mm",
  "135mm",
  "macro",
  "anamorphic"
] as const;

export const ANGLE_OPTIONS = [
  "eye level",
  "low angle",
  "high angle",
  "overhead",
  "bird's eye",
  "worm's eye",
  "dutch angle"
] as const;

export const MOVEMENT_OPTIONS = [
  "static",
  "slow push in",
  "slow pull out",
  "pan left",
  "pan right",
  "tilt up",
  "tilt down",
  "dolly in",
  "dolly out",
  "tracking",
  "handheld",
  "crane up",
  "crane down",
  "orbit",
  "zoom in",
  "zoom out"
] as const;

export const EQUIPMENT_OPTIONS = [
  "handheld",
  "tripod",
  "steadicam",
  "gimbal",
  "dolly",
  "slider",
  "crane",
  "drone"
] as const;

/**
 * Storage value → full dictionary key for the label. The full key path is
 * spelled out as a literal so the dead-key guard sees the reference (this
 * subtree is not a whitelisted dynamic template). Values absent from the
 * table (focal lengths, free strings) keep the value as their label.
 */
const CAMERA_LABEL_KEYS: Record<string, string> = {
  // framing
  "extreme wide": "storyboard:attrs.framingExtremeWide",
  wide: "storyboard:attrs.framingWide",
  "medium wide": "storyboard:attrs.framingMediumWide",
  medium: "storyboard:attrs.framingMedium",
  "medium close-up": "storyboard:attrs.framingMediumCloseUp",
  "close-up": "storyboard:attrs.framingCloseUp",
  "extreme close-up": "storyboard:attrs.framingExtremeCloseUp",
  "over-the-shoulder": "storyboard:attrs.framingOverTheShoulder",
  "two-shot": "storyboard:attrs.framingTwoShot",
  insert: "storyboard:attrs.framingInsert",
  // lens
  macro: "storyboard:attrs.lensMacro",
  anamorphic: "storyboard:attrs.lensAnamorphic",
  // angle
  "eye level": "storyboard:attrs.angleEyeLevel",
  "low angle": "storyboard:attrs.angleLow",
  "high angle": "storyboard:attrs.angleHigh",
  overhead: "storyboard:attrs.angleOverhead",
  "bird's eye": "storyboard:attrs.angleBirdsEye",
  "worm's eye": "storyboard:attrs.angleWormsEye",
  "dutch angle": "storyboard:attrs.angleDutch",
  // movement
  static: "storyboard:attrs.movementStatic",
  "slow push in": "storyboard:attrs.movementSlowPushIn",
  "slow pull out": "storyboard:attrs.movementSlowPullOut",
  "pan left": "storyboard:attrs.movementPanLeft",
  "pan right": "storyboard:attrs.movementPanRight",
  "tilt up": "storyboard:attrs.movementTiltUp",
  "tilt down": "storyboard:attrs.movementTiltDown",
  "dolly in": "storyboard:attrs.movementDollyIn",
  "dolly out": "storyboard:attrs.movementDollyOut",
  tracking: "storyboard:attrs.movementTracking",
  handheld: "storyboard:attrs.movementHandheld",
  "crane up": "storyboard:attrs.movementCraneUp",
  "crane down": "storyboard:attrs.movementCraneDown",
  orbit: "storyboard:attrs.movementOrbit",
  "zoom in": "storyboard:attrs.movementZoomIn",
  "zoom out": "storyboard:attrs.movementZoomOut",
  // equipment
  tripod: "storyboard:attrs.equipmentTripod",
  steadicam: "storyboard:attrs.equipmentSteadicam",
  gimbal: "storyboard:attrs.equipmentGimbal",
  dolly: "storyboard:attrs.equipmentDolly",
  slider: "storyboard:attrs.equipmentSlider",
  crane: "storyboard:attrs.equipmentCrane",
  drone: "storyboard:attrs.equipmentDrone"
};

/**
 * A vocabulary value as a select label: localized when the vocabulary knows it,
 * the raw value otherwise (focal lengths, agent-written free strings).
 */
export const cameraOptionLabel = (value: string): string => {
  const key = CAMERA_LABEL_KEYS[value];
  return key ? i18n.t(key, { defaultValue: value }) : value;
};

/** The suggested values plus an empty entry, with `current` kept when it is new. */
export const cameraOptions = (
  suggestions: readonly string[],
  current: string
): SelectOption[] => {
  const options: SelectOption[] = [{ value: "", label: "—" }];
  for (const value of suggestions) {
    options.push({ value, label: cameraOptionLabel(value) });
  }
  if (current !== "" && !suggestions.includes(current)) {
    options.push({ value: current, label: current });
  }
  return options;
};
