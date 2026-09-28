/**
 * The creation-flow entry cards (PRD § 6.1) — one list, two hosts.
 *
 * The New Project surface shows all seven, Studio shows three (D24 and D30:
 * Image, Workflow and Game are workspace flows). The promise line on each card
 * is PRD § 6.1 and game-prd Appendix A verbatim, kept here so both hosts say
 * the same thing. Entity is the library-oriented addition to that set.
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
    titleKey: "home:entry.game.title",
    description: "From a sentence to a running Godot project, assets checked.",
    descriptionKey: "editor:ui.fromSentenceToRunningGodotProject"
  }
];

/** Studio's three cards (D24). */
export const STUDIO_ENTRY_CARDS: readonly EntryCard[] = ENTRY_CARDS.filter(
  (card) =>
    card.id === "storyboard" || card.id === "video" || card.id === "script"
);
