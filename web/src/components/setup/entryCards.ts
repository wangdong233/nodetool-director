/**
 * The creation-flow entry cards (PRD § 6.1) — one list, two hosts.
 *
 * New Project starts with Image, Storyboard, and Workflow and reveals the
 * other formats on request. Studio shows Storyboard, Video, and Script
 * (D24 and D30: Image, Workflow and Game are workspace flows). Shared copy
 * comes from PRD § 6.1 and game-prd Appendix A. Entity adds library creation.
 *
 * `disabled` with a `disabledReason` naming the phase is how a card waits for
 * its flow to be built. All seven are live now; the field stays on the type for
 * the next one.
 */

import type { OptionCardItem } from "./OptionCardGrid";

export type EntryFlowId =
  | "entity"
  | "storyboard"
  | "video"
  | "script"
  | "image"
  | "workflow"
  | "game";

export interface EntryCard extends OptionCardItem {
  id: EntryFlowId;
}

export const ENTRY_CARDS: readonly EntryCard[] = [
  {
    id: "entity",
    title: "Entity",
    titleKey: "home:entry.entity.title",
    description: "Create a reusable character, place, style, or prop.",
    descriptionKey: "editor:ui.createReusableCharacterPlaceStyleProp"
  },
  {
    id: "storyboard",
    title: "Storyboard",
    titleKey: "editor:ui.storyboard",
    description: "From a sentence to a rendered board in four steps.",
    descriptionKey: "editor:ui.fromSentenceToRenderedBoard"
  },
  {
    id: "video",
    title: "Video",
    titleKey: "editor:ui.video",
    description: "From a sentence to a cut on the timeline, no board.",
    descriptionKey: "editor:ui.fromSentenceToCutNoBoard"
  },
  {
    id: "script",
    title: "Script",
    titleKey: "editor:ui.script",
    description: "From a topic to voiced lines, ready to place.",
    descriptionKey: "editor:ui.fromTopicToVoicedLines"
  },
  {
    id: "image",
    title: "Image",
    titleKey: "editor:ui.image",
    description: "From a description to a picked variation in the editor.",
    descriptionKey: "editor:ui.fromDescriptionToPickedVariation"
  },
  {
    id: "workflow",
    title: "Workflow",
    titleKey: "editor:ui.workflow",
    description: "From a task to a running graph, with the plan reviewed first.",
    descriptionKey: "editor:ui.fromTaskToRunningGraph"
  },
  {
    id: "game",
    title: "Game",
    description: "From an idea to a playable game, with the design reviewed first."
  }
];

/** Studio's three cards (D24). */
export const STUDIO_ENTRY_CARDS: readonly EntryCard[] = ENTRY_CARDS.filter(
  (card) =>
    card.id === "storyboard" || card.id === "video" || card.id === "script"
);
