import { useMemo, useState, type ReactElement } from "react";
import { filterGameAssetCatalog, gameAssetCatalog, gameAssetSiblingRebinds, type AnyGameDocument,
  type GameAssetCatalogEntry, type GameAssetMediaKind, type GameAssetReference } from "@nodetool-ai/protocol";
import type { AnyGameDocumentOp } from "@nodetool-ai/game-runtime";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import { trpc, trpcClient } from "../../../../trpc/client";
import ReportBugButton from "../../../support/ReportBugButton";
import { Caption, Chip, Dialog, EditorButton, EmptyState, FlexColumn, FlexRow, Label, ScrollArea, SearchInput, SelectField,
  SelectableListItem, SPACING, TabGroup, Text, TextInput, TruncatedText } from "../../../ui_primitives";
import GameAssetThumbnail from "./GameAssetThumbnail";
import { GAME_ASSET_KIND_FILTERS, candidatesForSlot, panelGenerationKind, shortDigest, type GameAssetBrowserTab,
  type GameAssetPanelGenerationKind, type GameAssetSource } from "./gameAssetBrowserModel";

export interface GameAssetBrowserProps {
  readonly gameId: string;
  readonly document: AnyGameDocument;
  /** Runs `edit` on the server, which binds onto the current draft, then merges that draft into the local one. */
  readonly runServerEdit: (edit: () => Promise<unknown>) => Promise<void>;
  readonly onOps: (ops: AnyGameDocumentOp[]) => void;
  readonly onSelectEntity: (sceneId: string, entityId: string) => void;
  /** Drafts a prompt in the assistant, for slots whose generation needs a provider node the panel cannot pick. */
  readonly onAskAssistant: (prompt: string) => void;
}

interface GenerationDraft {
  readonly slot: string;
  readonly kind: GameAssetPanelGenerationKind;
  readonly prompt: string;
  readonly preparation?: Readonly<Record<string, unknown>>;
}

const TABS: readonly GameAssetBrowserTab[] = ["assets", "prefabs", "scenes"];

/** Label of one media kind in the type filter; kinds not in game.json reuse the common type filters. */
function kindLabel(t: TFunction, kind: GameAssetMediaKind): string {
  switch (kind) {
    case "image": return t("common:typeFilters.image", { defaultValue: "Images" });
    case "audio": return t("common:typeFilters.audio", { defaultValue: "Audio" });
    case "font": return t("game:assets.kindFont", { defaultValue: "Fonts" });
    case "model": return t("game:assets.kindModel", { defaultValue: "Models" });
    case "collider": return t("game:assets.kindCollider", { defaultValue: "Colliders" });
    case "hdri": return t("game:assets.kindHdri", { defaultValue: "HDRIs" });
  }
}

function referenceLabel(t: TFunction, reference: GameAssetReference): string {
  const where = reference.kind === "entity" ? `${reference.sceneId}/${reference.name ?? reference.entityId}`
    : reference.kind === "scene" ? t("game:sceneTree.sceneName", { name: reference.name ?? reference.sceneId, defaultValue: `Scene ${reference.name ?? reference.sceneId}` })
    : reference.kind === "prefab" ? t("game:assets.prefabRef", { id: `${reference.prefabId}${reference.entityId ? `/${reference.entityId}` : ""}`, defaultValue: `Prefab ${reference.prefabId}${reference.entityId ? `/${reference.entityId}` : ""}` })
    : t("game:inspector.gameSettings", { defaultValue: "Game settings" });
  return `${where} · ${reference.path}`;
}

function ReferenceList({ references, onSelectEntity }: {
  readonly references: readonly GameAssetReference[];
  readonly onSelectEntity: (sceneId: string, entityId: string) => void;
}): ReactElement {
  const { t } = useTranslation();
  if (references.length === 0) { return <Caption>{t("game:assets.notUsedBy", { defaultValue: "Not used by any entity, scene or prefab." })}</Caption>; }
  return <FlexColumn gap={SPACING.micro}>
    {references.map((reference) => {
      const { sceneId, entityId } = reference;
      const label = referenceLabel(t, reference);
      return reference.kind === "entity" && sceneId && entityId
        ? <SelectableListItem key={label} onClick={() => onSelectEntity(sceneId, entityId)} aria-label={t("game:assets.selectAria", { name: label, defaultValue: `Select ${label}` })}>
          <TruncatedText>{label}</TruncatedText>
        </SelectableListItem>
        : <Caption key={label}>{label}</Caption>;
    })}
  </FlexColumn>;
}

/**
 * The bottom-dock asset browser: every bound asset, prefab and scene of the
 * draft, where each asset is used, and the slot actions — generate,
 * regenerate with a new prompt, or bind a staged candidate in place.
 */
export default function GameAssetBrowser({ gameId, document, runServerEdit, onOps, onSelectEntity, onAskAssistant }: GameAssetBrowserProps): ReactElement {
  const { t } = useTranslation();
  const dimension = document.schemaVersion === 3 ? "3d" : "2d";
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<GameAssetMediaKind | "all">("all");
  const [tab, setTab] = useState<GameAssetBrowserTab>("assets");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [generation, setGeneration] = useState<GenerationDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queries = trpc.useUtils();
  const { data: server } = trpc.games.assetBrowser.useQuery({ id: gameId }, { staleTime: 15_000 });
  const catalog = useMemo(() => gameAssetCatalog(document), [document]);
  const filtered = useMemo(() => filterGameAssetCatalog(catalog, { query, kind: kind === "all" ? undefined : kind }), [catalog, query, kind]);
  const selected = catalog.assets.find((entry) => entry.slot === selectedSlot) ?? filtered.assets[0] ?? null;
  const counts = { assets: filtered.assets.length, prefabs: filtered.prefabs.length, scenes: filtered.scenes.length };

  const run = async (edit: () => Promise<unknown>): Promise<void> => {
    setBusy(true);
    try {
      await runServerEdit(edit);
      await queries.games.assetBrowser.invalidate({ id: gameId });
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  const install = (slot: string, digest: string): Promise<void> =>
    run(() => trpcClient.games.installStagedCandidate.mutate({ id: gameId, slot, digest }));
  const generate = (draft: GenerationDraft): Promise<void> => run(() => {
    const request: Parameters<typeof trpcClient.games.generateAsset.mutate>[0] = {
      id: gameId, slot: draft.slot, kind: draft.kind, prompt: draft.prompt };
    if (draft.preparation) { request.preparation = { ...draft.preparation }; }
    return trpcClient.games.generateAsset.mutate(request);
  });

  const sourceOf = (entry: GameAssetCatalogEntry): GameAssetSource => ({ kind: "asset", assetId: entry.assetId });
  const bindingOf = (slot: string) => document.assets[slot];
  const boundsOf = (slot: string) => {
    const binding = bindingOf(slot);
    return binding && "bounds" in binding && binding.mediaKind === "model" ? binding.bounds : undefined;
  };

  const detail = (entry: GameAssetCatalogEntry): ReactElement => {
    const request = server?.slot_requests[entry.slot];
    const generationKind = panelGenerationKind(request, entry.mediaKind, dimension);
    const candidates = server ? candidatesForSlot(server.candidates, entry.slot, entry.mediaKind) : [];
    const workspaceId = server?.candidate_workspace_id;
    const rebinds = document.schemaVersion !== 3 && entry.staleSiblings.length > 0 && entry.mediaKind === "image"
      ? (() => {
        const parent = document.assets[entry.slot];
        return parent ? gameAssetSiblingRebinds(document.assets, entry.slot, parent) : null;
      })() : null;
    const verb = request?.source === "recorded" ? t("timeline:attrs.regenerate", { defaultValue: "Regenerate" }) : t("editor:ui.generate", { defaultValue: "Generate" });
    return <FlexColumn gap={SPACING.md}>
      <FlexRow gap={SPACING.md} align="flex-start">
        <GameAssetThumbnail source={sourceOf(entry)} mediaKind={entry.mediaKind} digest={entry.digest} label={entry.slot}
          bounds={boundsOf(entry.slot)} size="detail" />
        <FlexColumn gap={SPACING.xs} sx={{ minWidth: 0 }}>
          <Label>{entry.slot}</Label>
          <Caption>{entry.mediaKind} · {shortDigest(entry.digest)}{entry.siblingOf ? ` · ${t("game:assets.frameOf", { slot: entry.siblingOf, defaultValue: `frame of ${entry.siblingOf}` })}` : ""}</Caption>
          {!entry.siblingOf && <FlexRow gap={SPACING.xs} wrap>
            {generationKind
              ? <EditorButton disabled={busy} onClick={() => setGeneration({ slot: entry.slot, kind: generationKind,
                prompt: request?.prompt ?? "", preparation: request?.preparation })}>{verb}</EditorButton>
              : <EditorButton disabled={busy} onClick={() => onAskAssistant(`Generate a new ${request?.kind ?? entry.mediaKind} asset for the "${entry.slot}" slot with generate_game_asset and install it.${request?.prompt ? ` Prompt: ${request.prompt}` : ""}`)}>
                {t("game:assets.askToGenerate", { defaultValue: "Ask the assistant to generate" })}
              </EditorButton>}
          </FlexRow>}
        </FlexColumn>
      </FlexRow>
      {rebinds && <FlexColumn gap={SPACING.xs}>
        <Caption role="status">{t("game:assets.frameBindingsStale", { count: entry.staleSiblings.length, defaultValue: `${entry.staleSiblings.length} frame bindings still point at the previous image.` })}</Caption>
        {rebinds.ops.length > 0 && <EditorButton disabled={busy} onClick={() => onOps([...rebinds.ops])}>{t("game:assets.moveFrames", { defaultValue: "Move frames onto this image" })}</EditorButton>}
        {rebinds.skipped.length > 0 && <Caption>{t("game:assets.framesOutside", { names: rebinds.skipped.join(", "), defaultValue: `${rebinds.skipped.join(", ")} fall outside this image and stay on the previous one.` })}</Caption>}
      </FlexColumn>}
      <FlexColumn gap={SPACING.xs}>
        <Label>{t("game:assets.usedBy", { defaultValue: "Used by" })}</Label>
        <ReferenceList references={entry.usedBy} onSelectEntity={onSelectEntity} />
      </FlexColumn>
      {!entry.siblingOf && <FlexColumn gap={SPACING.xs}>
        <Label>{t("game:assets.stagedCandidates", { defaultValue: "Staged candidates" })}</Label>
        {candidates.length === 0 || !workspaceId
          ? <Caption>{t("game:assets.noStagedFiles", { kind: kindLabel(t, entry.mediaKind), defaultValue: `No staged ${entry.mediaKind} files. Generated and staged files appear here.` })}</Caption>
          : candidates.map((candidate) => {
            const current = candidate.digest === entry.digest;
            return <FlexRow key={candidate.digest} gap={SPACING.sm} align="center">
              <GameAssetThumbnail source={{ kind: "workspace", workspaceId, path: candidate.path }} mediaKind={candidate.media_kind}
                digest={candidate.digest} label={t("game:assets.candidate", { digest: shortDigest(candidate.digest), defaultValue: `Candidate ${shortDigest(candidate.digest)}` })} />
              <FlexColumn sx={{ flex: 1, minWidth: 0 }}>
                <TruncatedText>{candidate.prompt ?? shortDigest(candidate.digest)}</TruncatedText>
                <Caption>{candidate.slot ? t("game:assets.madeFor", { slot: candidate.slot, defaultValue: `Made for ${candidate.slot}` }) : t("game:assets.unrecorded", { defaultValue: "Unrecorded" })} · {new Date(candidate.modified_at).toLocaleString()}</Caption>
              </FlexColumn>
              {current ? <Chip compact label={t("editor:ui.current", { defaultValue: "Current" })} />
                : <EditorButton disabled={busy} onClick={() => void install(entry.slot, candidate.digest)}>{t("editor:ui.use", { defaultValue: "Use" })}</EditorButton>}
            </FlexRow>;
          })}
      </FlexColumn>}
    </FlexColumn>;
  };

  const tabLabel = (tab: GameAssetBrowserTab): string => tab === "assets" ? t("game:panels.assets", { defaultValue: "Assets" })
    : tab === "prefabs" ? t("game:sceneTree.prefabs", { defaultValue: "Prefabs" })
    : t("game:assets.tabScenes", { defaultValue: "Scenes" });

  const list = tab === "assets"
    ? filtered.assets.map((entry) => <SelectableListItem key={entry.slot} selected={entry.slot === selected?.slot}
      onClick={() => setSelectedSlot(entry.slot)} aria-label={t("game:assets.assetAria", { slot: entry.slot, defaultValue: `Asset ${entry.slot}` })}>
      <GameAssetThumbnail source={sourceOf(entry)} mediaKind={entry.mediaKind} digest={entry.digest} label={entry.slot} bounds={boundsOf(entry.slot)} />
      <FlexColumn sx={{ flex: 1, minWidth: 0 }}>
        <TruncatedText>{entry.slot}</TruncatedText>
        <Caption>{entry.mediaKind} · {t("game:assets.usedXTimes", { count: entry.usedBy.length, defaultValue: `used ${entry.usedBy.length}×` })}{entry.staleSiblings.length ? ` · ${t("game:assets.framesOutOfDate", { defaultValue: "frames out of date" })}` : ""}</Caption>
      </FlexColumn>
    </SelectableListItem>)
    : tab === "prefabs"
      ? filtered.prefabs.map((prefab) => <FlexColumn key={prefab.id} gap={SPACING.xs} sx={{ py: SPACING.xs }}>
        <Label>{prefab.id}</Label>
        <Caption>{t("game:assets.prefabCounts", { entities: prefab.entityCount, instances: prefab.usedBy.length, defaultValue: `${prefab.entityCount} entities · ${prefab.usedBy.length} instances` })}</Caption>
        <FlexRow gap={SPACING.xs} wrap>{prefab.assets.map((slot) => <Chip key={slot} compact label={slot}
          onClick={() => { setTab("assets"); setSelectedSlot(slot); }} />)}</FlexRow>
        <ReferenceList references={prefab.usedBy} onSelectEntity={onSelectEntity} />
      </FlexColumn>)
      : filtered.scenes.map((scene) => <FlexColumn key={scene.id} gap={SPACING.xs} sx={{ py: SPACING.xs }}>
        <FlexRow gap={SPACING.xs} align="center"><Label>{scene.name}</Label>{scene.entry && <Chip compact label={t("game:assets.entryChip", { defaultValue: "Entry" })} />}</FlexRow>
        <Caption>{t("game:assets.sceneCounts", { entities: scene.entityCount, assets: scene.assets.length, defaultValue: `${scene.entityCount} entities · ${scene.assets.length} assets` })}</Caption>
        <FlexRow gap={SPACING.xs} wrap>{scene.assets.map((slot) => <Chip key={slot} compact label={slot}
          onClick={() => { setTab("assets"); setSelectedSlot(slot); }} />)}</FlexRow>
      </FlexColumn>);

  return <FlexColumn fullHeight sx={{ minHeight: 0 }} aria-label={t("game:assets.browserAria", { defaultValue: "Asset browser" })}>
    <FlexRow gap={SPACING.sm} align="center" sx={{ px: SPACING.md, py: SPACING.xs }}>
      <SearchInput value={query} onChange={setQuery} placeholder={t("game:assets.searchPlaceholder", { defaultValue: "Search assets, prefabs, scenes" })} ariaLabel={t("game:assets.searchAria", { defaultValue: "Search assets" })} size="small" fullWidth />
      <SelectField label={t("editor:asset.info.type", { defaultValue: "Type" })} hideLabel size="small" value={kind} onChange={(value) => setKind(value as GameAssetMediaKind | "all")}
        options={[{ value: "all", label: t("game:assets.allTypes", { defaultValue: "All types" }) }, ...GAME_ASSET_KIND_FILTERS[dimension].map((value) => ({ value, label: kindLabel(t, value) }))]} />
    </FlexRow>
    <TabGroup size="small" value={tab} onChange={(value) => setTab(value as GameAssetBrowserTab)}
      tabs={TABS.map((value) => ({ value, label: `${tabLabel(value)} (${counts[value]})` }))} />
    {error && <FlexRow gap={SPACING.sm} align="center" sx={{ px: SPACING.md }}>
      <Caption color="error" role="alert" sx={{ flex: 1, minWidth: 0 }}>{error}</Caption>
      <ReportBugButton context={{ source: "panel-crash", summary: "Game asset browser action failed", errorText: error }} />
    </FlexRow>}
    <FlexRow sx={{ flex: 1, minHeight: 0 }}>
      <ScrollArea thin sx={{ flex: 1, minWidth: 0, px: SPACING.xs }}>
        {list.length ? list : <EmptyState size="small" title={query || kind !== "all" ? t("game:assets.nothingMatches", { defaultValue: "Nothing matches" }) : t("game:assets.noTab", { tab: tabLabel(tab).toLowerCase(), defaultValue: `No ${tab}` })}
          description={query || kind !== "all" ? t("game:assets.clearFilters", { defaultValue: "Clear the search or the type filter." }) : undefined} />}
      </ScrollArea>
      {tab === "assets" && selected && <ScrollArea thin sx={{ flex: 1.4, minWidth: 0, px: SPACING.md, py: SPACING.xs, borderLeft: 1, borderColor: "divider" }}>
        {detail(selected)}
      </ScrollArea>}
    </FlexRow>
    <Dialog open={generation !== null} title={generation ? t("game:assets.generateSlot", { slot: generation.slot, defaultValue: `Generate ${generation.slot}` }) : ""} onClose={() => setGeneration(null)}
      showActions confirmText={t("game:assets.generateAndInstall", { defaultValue: "Generate and install" })} isLoading={busy} onConfirm={() => {
        if (!generation || !generation.prompt.trim()) { return; }
        const draft = generation;
        setGeneration(null);
        void generate(draft);
      }}>
      <FlexColumn gap={SPACING.sm}>
        <Text>{t("game:assets.stagedNote", { defaultValue: "The result is staged under the game's assets and bound to the slot. Earlier files stay listed as candidates." })}</Text>
        <TextInput label={t("editor:ui.prompt", { defaultValue: "Prompt" })} multiline rows={5} value={generation?.prompt ?? ""}
          onChange={(event) => setGeneration((current) => current ? { ...current, prompt: event.target.value } : current)} />
        {generation?.preparation && <Caption>{t("game:assets.preparationValue", { value: JSON.stringify(generation.preparation), defaultValue: `Preparation: ${JSON.stringify(generation.preparation)}` })}</Caption>}
      </FlexColumn>
    </Dialog>
  </FlexColumn>;
}
