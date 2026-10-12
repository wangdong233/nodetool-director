import { useEffect, useState, type ReactNode } from "react";
import { useStore, type StoreApi } from "zustand";
import { useTranslation } from "react-i18next";

import { GAME_LAYOUT_PRESETS } from "../../../stores/game/GamePanelLayout";
import type { GamePanelLayoutState } from "../../../stores/game/GamePanelLayoutStore";
import type { GamePanelRegistration } from "./panelRegistry";
import { Caption, EditorButton, FlexRow, SelectField, SPACING, TextInput } from "../../ui_primitives";
import ReportBugButton from "../../support/ReportBugButton";
import { gamePanelTitle } from "../gameI18n";

interface GameLayoutMenuProps {
  readonly store: StoreApi<GamePanelLayoutState>;
  readonly panels: readonly Pick<GamePanelRegistration, "id" | "title">[];
}

export function GameLayoutMenu({ store, panels }: GameLayoutMenuProps): ReactNode {
  const { t } = useTranslation();
  const customLayouts = useStore(store, (state) => state.customLayouts);
  const hidden = useStore(store, (state) => state.layout.hidden);
  const hiddenPanels = panels.filter((panel) => hidden.includes(panel.id));
  const [selected, setSelected] = useState("Default");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setSelected("Default"); setName(""); setError(null); }, [store]);
  const custom = customLayouts.some((entry) => entry.name === selected);
  const act = (action: () => void): void => {
    try { action(); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t("game:layout.unableToChange", { defaultValue: "Unable to change saved layout" })); }
  };
  return <FlexRow gap={SPACING.sm} align="center" sx={{ px: SPACING.md, py: SPACING.xs }}>
    {hiddenPanels.length > 0 && <SelectField label={t("game:layout.showPanel", { defaultValue: "Show panel" })} value=""
      options={[{ value: "", label: t("game:layout.choosePanel", { defaultValue: "Choose a panel" }), disabled: true }, ...hiddenPanels.map((panel) => ({ value: panel.id, label: gamePanelTitle(t, panel.id, panel.title) }))]}
      onChange={(panelId) => act(() => store.getState().dispatch({ type: "reveal", panelId }))} />}
    <SelectField label={t("game:layout.gameLayout", { defaultValue: "Game layout" })} value={selected}
      options={[...GAME_LAYOUT_PRESETS.map((value) => ({ value, label: value })), ...customLayouts.map((entry) => ({ value: entry.name, label: entry.name }))]}
      onChange={setSelected} />
    <EditorButton onClick={() => act(() => store.getState().selectLayout(selected))}>{t("game:layout.applyLayout", { defaultValue: "Apply layout" })}</EditorButton>
    <TextInput label={t("game:layout.layoutName", { defaultValue: "Layout name" })} compact value={name} onChange={(event) => setName(event.target.value)} />
    <EditorButton disabled={!name.trim()} onClick={() => act(() => { store.getState().saveLayout(name); setSelected(name.trim()); })}>{t("game:layout.saveLayout", { defaultValue: "Save layout" })}</EditorButton>
    <EditorButton disabled={!custom || !name.trim()} onClick={() => act(() => { store.getState().renameLayout(selected, name); setSelected(name.trim()); })}>{t("game:layout.renameLayout", { defaultValue: "Rename layout" })}</EditorButton>
    <EditorButton disabled={!custom} onClick={() => act(() => { store.getState().deleteLayout(selected); setSelected("Default"); })}>{t("game:layout.deleteLayout", { defaultValue: "Delete layout" })}</EditorButton>
    {error && <FlexRow gap={SPACING.xs} align="center"><Caption role="alert" color="error">{error}</Caption>
      <ReportBugButton context={{ source: "panel-crash", summary: "Game layout could not be changed", errorText: error }} />
    </FlexRow>}
  </FlexRow>;
}
