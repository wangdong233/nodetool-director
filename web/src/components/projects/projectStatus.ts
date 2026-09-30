/**
 * What a project card says about itself, derived from the documents the
 * server returned. Pure: the same summary always reads the same way, and the
 * wording is testable without rendering a card.
 *
 * Only facts the summary carries are stated. A cut's render state is not one
 * of them — nothing records it — so no card claims a project is delivered.
 */

import type { RouterOutputs } from "../../trpc/client";
import { i18n } from "../../i18n";

export type ProjectDetail = RouterOutputs["projects"]["summaries"][number];
export type ProjectDocument = ProjectDetail["documents"][number];
type ProjectDocumentStatus = NonNullable<ProjectDocument["status"]>;

const statusOfKind = <K extends ProjectDocumentStatus["kind"]>(
  documents: readonly ProjectDocument[],
  kind: K
): Extract<ProjectDocumentStatus, { kind: K }> | undefined => {
  for (const doc of documents) {
    if (doc.status?.kind === kind) {
      return doc.status as Extract<ProjectDocumentStatus, { kind: K }>;
    }
  }
  return undefined;
};

/** `123456` → `2:03`. */
export const formatDuration = (durationMs: number): string => {
  const total = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
};

/**
 * The card's one-line status. Documents of the same kind collapse onto the
 * newest of them — a card is a glance, and the overview tab has the rest.
 *
 * `documentsPartial` marks a document-table read that hit its cap: the counts
 * below are read off a truncated list, so the whole line is annotated rather
 * than any one figure inside it.
 */
export const projectStatusLine = (
  documents: readonly ProjectDocument[],
  options?: { documentsPartial?: boolean }
): string => {
  const partialSuffix = options?.documentsPartial ? i18n.t("editor:ui.partialSuffix") : "";
  if (documents.length === 0) {
    return i18n.t("editor:ui.noDocumentsYet") + partialSuffix;
  }
  const parts: string[] = [];

  const board = statusOfKind(documents, "storyboard");
  if (board) {
    parts.push(i18n.t("editor:ui.nShots", { n: board.shots }));
    if (board.shots > 0) {
      parts.push(i18n.t("editor:ui.stillsOfShots", { a: board.stills, b: board.shots }));
    }
  }

  const script = statusOfKind(documents, "script");
  if (script) {
    parts.push(i18n.t("editor:ui.voicedOfLines", { a: script.voiced, b: script.lines }));
    if (script.stale > 0) {
      parts.push(i18n.t("editor:ui.nStale", { n: script.stale }));
    }
  }

  const cut = statusOfKind(documents, "timeline");
  if (cut) {
    parts.push(i18n.t("editor:ui.cutNClips", { n: cut.clips, d: formatDuration(cut.durationMs) }));
  }

  if (parts.length === 0) {
    return i18n.t(documents.length === 1 ? "editor:ui.oneDocument" : "editor:ui.nDocuments", { n: documents.length }) + partialSuffix;
  }
  return parts.join(" · ") + partialSuffix;
};

interface ProjectProgress {
  label: string;
  /** Everything the board set out to render exists. */
  done: boolean;
}

/**
 * The pill over the card's montage: how far the clips have got. A project
 * with no board and no cut gets none rather than an invented one.
 */
export const projectProgress = (
  documents: readonly ProjectDocument[]
): ProjectProgress | null => {
  const board = statusOfKind(documents, "storyboard");
  if (board && board.shots > 0) {
    return {
      label: i18n.t("editor:ui.clipsOfShots", { clips: board.clips, shots: board.shots }),
      done: board.clips === board.shots
    };
  }
  const cut = statusOfKind(documents, "timeline");
  if (cut) {
    return { label: i18n.t("editor:ui.cutWithDuration", { d: formatDuration(cut.durationMs) }), done: false };
  }
  return null;
};

/**
 * A document's own status line — the meta row under its card's name. The
 * project line collapses documents of a kind onto one; this one speaks for
 * exactly the document it is given, and says nothing for the kinds whose
 * status the summary does not derive.
 */
export const documentStatusLine = (document: ProjectDocument): string => {
  const status = document.status;
  if (!status) return "";
  switch (status.kind) {
    case "storyboard":
      return i18n.t("editor:ui.nShotsStills", { a: status.shots, b: status.stills, c: status.shots });
    case "script":
      return i18n.t("editor:ui.nLinesVoiced", { a: status.lines, unit: i18n.t(status.lines === 1 ? "editor:ui.oneLine" : "editor:ui.nLinesUnit"), b: status.voiced });
    case "timeline":
      return i18n.t("editor:ui.nClipsDuration", { a: status.clips, unit: i18n.t(status.clips === 1 ? "editor:ui.oneClip" : "editor:ui.clipsUnit"), d: formatDuration(status.durationMs) });
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
};

interface DocumentProgress {
  label: string;
  tone: "done" | "rendering" | "warning";
}

/**
 * The pill beside a document's name: how far its own work has got. A board
 * counts its clips, a script its drift, a cut its length — and a kind with
 * nothing derived gets no pill rather than an invented one.
 */
export const documentProgress = (
  document: ProjectDocument
): DocumentProgress | null => {
  const status = document.status;
  if (!status) return null;
  switch (status.kind) {
    case "storyboard":
      if (status.shots === 0) return null;
      return {
        label: `clips ${status.clips}/${status.shots}`,
        tone: status.clips === status.shots ? "done" : "rendering"
      };
    case "script":
      if (status.stale > 0) {
        const lines = status.stale === 1 ? "line" : "lines";
        return { label: `${status.stale} ${lines} stale`, tone: "warning" };
      }
      if (status.lines > 0 && status.voiced === status.lines) {
        return { label: "voiced", tone: "done" };
      }
      return null;
    case "timeline":
      // Whether a cut has been rendered is not recorded, so the pill reports
      // its length — the one thing the sequence row does know.
      return { label: formatDuration(status.durationMs), tone: "rendering" };
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
};

/** A document's share of the ledger, naming what nothing priced. */
export const formatDocumentSpend = (document: ProjectDocument): string => {
  const amount = `$${document.spendUsd.toFixed(2)}`;
  return document.unpricedCount > 0
    ? `${amount} · ${document.unpricedCount} unpriced`
    : amount;
};

/** The step a project is waiting on, and the document that performs it. */
interface ProjectNextStep {
  label: string;
  document: ProjectDocument;
}

/**
 * What to do next, read off the documents in the order a spot is made: render
 * the stills, render the clips, voice what drifted or was never voiced, then
 * cut.
 *
 * The action opens the document the step happens in rather than firing the
 * render itself — the render's own controls (model, shot selection, cost) live
 * on that surface, and a button here that spent money without showing them
 * would be spending on the user's behalf.
 */
export const projectNextStep = (
  documents: readonly ProjectDocument[]
): ProjectNextStep | null => {
  const board = documents.find((doc) => doc.status?.kind === "storyboard");
  const boardStatus =
    board?.status?.kind === "storyboard" ? board.status : null;
  if (board && boardStatus && boardStatus.shots > 0) {
    if (boardStatus.stills < boardStatus.shots) {
      return { label: "Render stills", document: board };
    }
    if (boardStatus.clips < boardStatus.shots) {
      return { label: i18n.t("editor:ui.renderClips"), document: board };
    }
  }

  const script = documents.find((doc) => doc.status?.kind === "script");
  const scriptStatus =
    script?.status?.kind === "script" ? script.status : null;
  if (script && scriptStatus && scriptStatus.stale > 0) {
    const lines = scriptStatus.stale === 1 ? "line" : "lines";
    return { label: `Re-voice ${scriptStatus.stale} ${lines}`, document: script };
  }
  if (script && scriptStatus) {
    const unvoiced = scriptStatus.lines - scriptStatus.voiced - scriptStatus.stale;
    if (unvoiced > 0) {
      const lines = unvoiced === 1 ? "line" : "lines";
      return { label: `Voice ${unvoiced} ${lines}`, document: script };
    }
  }

  const cut = documents.find((doc) => doc.status?.kind === "timeline");
  if (cut) {
    return { label: i18n.t("editor:ui.renderMaster", { defaultValue: "Render master" }), document: cut };
  }
  // Reached only when the board rendered everything it set out to: the first
  // block returns while stills or clips are still short.
  if (board && boardStatus && boardStatus.shots > 0) {
    return { label: i18n.t("editor:ui.assembleTimeline", { defaultValue: "Assemble timeline" }), document: board };
  }
  return null;
};

/**
 * `$4.12`, and what the ledger could not price rather than a silent zero. A
 * `partial` ledger read means rows were capped out of the sum, so the figure
 * is a lower bound, marked with a leading `≥`.
 */
export const formatSpend = (spend: ProjectDetail["spend"]): string => {
  const amount = `${spend.partial ? "≥" : ""}$${spend.totalUsd.toFixed(2)}`;
  return spend.unpricedCount > 0
    ? `${amount} · ${spend.unpricedCount} unpriced`
    : amount;
};
