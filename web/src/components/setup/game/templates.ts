/**
 * The three shipped templates as the Design step's cards (game-prd § 4.2).
 *
 * A card is copy and art only. What a template actually asks for — its slots,
 * its Godot minor, its hook scripts — comes from `games.templates` at render
 * time, because a card that hardcoded eight slots would go on saying eight
 * after the manifest gained a ninth. The meta line is composed from the live
 * manifest by {@link templateMeta}.
 *
 * The art is the shipped `package://` tile `scripts/make-game-style-tiles.mjs`
 * draws from the template's own placeholder assets, so a card reads as the loop
 * it names.
 */

import type { OptionCardItem } from "../OptionCardGrid";
import type { GameTemplate } from "../../../hooks/game/useGameTemplates";

/** The package the template card art ships in. */
export const GAME_TEMPLATE_ART_PACKAGE = "nodetool-base";

/** The `package://` URI of one template's card art. */
export const gameTemplateArt = (id: string): string =>
  `package://${GAME_TEMPLATE_ART_PACKAGE}/templates/game-${id}.png`;

/** Title and one line per shipped template id (game-prd § 4.2). */
export const GAME_TEMPLATE_COPY: Readonly<
  Record<
    string,
    {
      title: string;
      titleKey?: string;
      description: string;
      descriptionKey?: string;
    }
  >
> = {
  platformer: {
    title: "Platformer",
    titleKey: "editor:ui.platformer",
    description: "Run, jump and stomp across a side-scrolling level.",
    descriptionKey: "editor:ui.runJumpStompSideScrolling"
  },
  topdown: {
    title: "Top-down",
    titleKey: "editor:ui.topDown",
    description: "Explore a room-by-room world from above.",
    descriptionKey: "editor:ui.exploreRoomByRoomFromAbove"
  },
  shmup: {
    title: "Shoot-em-up",
    titleKey: "editor:ui.shootEmUp",
    description: "Fly, dodge and shoot through waves of enemies.",
    descriptionKey: "editor:ui.flyDodgeShootThroughWaves"
  }
};

/** "8 slots · 3 hook scripts", read off the live manifest. */
export const templateMeta = (template: GameTemplate): string => {
  const slots = template.slots.length;
  const hooks = template.hooks.length;
  return `${slots} slot${slots === 1 ? "" : "s"} · ${hooks} hook script${
    hooks === 1 ? "" : "s"
  }`;
};

/**
 * The cards, in the order the server listed the templates.
 *
 * A template the copy table does not name still gets a card, titled by its id:
 * a fourth template shipped by a later phase is a card with no line, not a
 * template a creator cannot pick.
 */
export const templateCards = (
  templates: readonly GameTemplate[]
): OptionCardItem[] =>
  templates.map((template) => {
    const copy = GAME_TEMPLATE_COPY[template.id];
    return {
      id: template.id,
      title: copy?.title ?? template.id,
      titleKey: copy?.titleKey,
      descriptionKey: copy?.descriptionKey,
      description: copy?.description,
      meta: templateMeta(template),
      image: gameTemplateArt(template.id)
    };
  });
