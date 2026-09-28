/**
 * Step 1 of the script flow — the idea (PRD § 9.1).
 *
 * A topic in a box that writes straight to the document, so `Continue` has
 * only the stage left to write and a reload resumes with the text intact
 * (D1, D3).
 *
 * The three other ways in sit beside it. Pasted and uploaded words are recorded
 * on the document as its source, apart from the brief: the writer step then
 * splits and attributes them instead of rewriting them, which is what makes an
 * imported script come out in the creator's own words (§ 9.2, criterion 4).
 *
 * The source has its own panel, and only the panel's own actions replace or
 * remove it. Typing in the brief used to re-split it as plain text, which threw
 * a screenplay's speakers and a subtitle's cue timings away (F3).
 */

import React, { memo, useCallback, useMemo, useRef, useState } from "react";

import {
  AlertBanner,
  BORDER_RADIUS,
  Box,
  Caption,
  Dialog,
  EditorButton,
  FlexColumn,
  FlexRow,
  GAP,
  Label,
  PADDING,
  Text,
  TextInput
} from "../../ui_primitives";
import {
  useScriptStore,
  useScriptSetup
} from "../../../stores/script/ScriptStore";
import ScriptCreativeContextFields from "./ScriptCreativeContextFields";
import {
  readScriptSource,
  scriptSourcePatch,
  type ImportedScript
} from "../../../lib/script/importedScript";
import { readScriptSetupContext } from "./scriptSetupContext";
import type { ScriptSetupAttachment } from "./scriptSetupContext";
import { ExampleBriefs } from "../ExampleBriefs";
import { AlternativesColumn } from "../AlternativesColumn";
import type { AlternativeEntry } from "../AlternativesColumn";
import { i18n, useAppLanguage } from "../../../i18n";
import {
  SCRIPT_SUBTITLE_ACCEPT,
  SCRIPT_TEXT_ACCEPT,
  useScriptFileImport
} from "./useScriptFileImport";

/** The § 9.1 inspiration chips. */
const INSPIRATIONS = [
  "A 60-second explainer about how tide clocks work",
  "A podcast intro for a show about failed products",
  "An ad read for a coffee subscription"
];

export interface IdeaStepProps {
  scriptId: string;
  /** Opens a blank script — the flow's escape hatch, stage `done` (PRD § 6.2). */
  onStartBlank: () => void;
}

/** What the panel says a source is, in one line. */
const sourceSummary = (source: ImportedScript): string => {
  const parts = [`${source.label}`, `${source.lines.length} lines`];
  if (source.attributed && source.speakers.length > 0) {
    parts.push(`speakers: ${source.speakers.join(", ")}`);
  } else {
    parts.push("speakers found by the writer");
  }
  if (source.lines.some((line) => line.targetDurationMs !== undefined)) {
    parts.push("cue timings kept");
  }
  return parts.join(" · ");
};

/** How much of the source the panel shows before it says "and N more". */
const PREVIEW_LINES = 3;

interface SourcePanelProps {
  source: ImportedScript;
  onReplace: () => void;
  onRemove: () => void;
}

/**
 * The imported words, named and shown, with the two actions that change them.
 * Nothing else replaces a source: that is what makes an import survive being
 * edited, reloaded and written (F3).
 */
const SourcePanel: React.FC<SourcePanelProps> = ({
  source,
  onReplace,
  onRemove
}) => (
  <FlexColumn
    gap={GAP.normal}
    padding={PADDING.comfortable}
    component="section"
    aria-label={i18n.t("storyboard:attrs.importedScript", { defaultValue: "Imported script" })}
    sx={{
      border: "1px solid",
      borderColor: "divider",
      borderRadius: BORDER_RADIUS.md
    }}
  >
    <FlexColumn gap={GAP.micro}>
      <Label>{i18n.t("storyboard:attrs.yourScriptKeptWordForWord", { defaultValue: "Your script, kept word for word" })}</Label>
      <Caption color="secondary" component="p">
        {sourceSummary(source)}
      </Caption>
    </FlexColumn>
    <FlexColumn
      gap={GAP.micro}
      component="ul"
      sx={{ margin: 0, paddingLeft: 0, listStyle: "none", "& li": { listStyle: "none" } }}
    >
      {source.lines.slice(0, PREVIEW_LINES).map((line, index) => (
        <Caption key={`${index}-${line.text}`} component="li">
          {line.speakerName === "" ? line.text : `${line.speakerName}: ${line.text}`}
        </Caption>
      ))}
      {source.lines.length > PREVIEW_LINES ? (
        <Caption color="secondary" component="li">
          {`and ${source.lines.length - PREVIEW_LINES} more`}
        </Caption>
      ) : null}
    </FlexColumn>
    <FlexRow gap={GAP.normal} wrap>
      <EditorButton variant="outlined" size="small" onClick={onReplace}>{i18n.t("storyboard:attrs.replaceTheseWords", { defaultValue: "Replace these words" })}</EditorButton>
      <EditorButton variant="text" size="small" onClick={onRemove}>{i18n.t("storyboard:attrs.removeThem", { defaultValue: "Remove them" })}</EditorButton>
    </FlexRow>
  </FlexColumn>
);

/**
 * What the project composer sent along (F4). It is shown rather than used: the
 * writer works from the brief and the source, and these are on the document so
 * the editor and the agent find them where the creator left them.
 */
const CarriedContext: React.FC<{
  attachments: readonly ScriptSetupAttachment[];
  entityCount: number;
}> = ({ attachments, entityCount }) => (
  <FlexColumn
    gap={GAP.micro}
    component="section"
    aria-label={i18n.t("ui2:attrs.broughtFromYourProject", { defaultValue: "Brought from your project" })}
  >
    <Label>{i18n.t("ui2:attrs.broughtFromYourProject", { defaultValue: "Brought from your project" })}</Label>
    <Caption color="secondary" component="p">
      {[
        attachments.length > 0
          ? `${attachments.length} ${attachments.length === 1 ? "reference" : "references"}`
          : null,
        entityCount > 0
          ? `${entityCount} ${entityCount === 1 ? "entity" : "entities"}`
          : null
      ]
        .filter((part) => part !== null)
        .join(" · ")}
      {" — kept on the script for the editor and the agent."}
    </Caption>
    {attachments.length > 0 ? (
      <FlexColumn
        gap={GAP.micro}
        component="ul"
        sx={{ margin: 0, paddingLeft: 0, listStyle: "none", "& li": { listStyle: "none" } }}
      >
        {attachments.map((attachment) => (
          <Caption key={attachment.uri} component="li">
            {attachment.name}
          </Caption>
        ))}
      </FlexColumn>
    ) : null}
  </FlexColumn>
);

const IdeaStepInternal: React.FC<IdeaStepProps> = ({
  scriptId,
  onStartBlank
}) => {
  const setup = useScriptSetup(scriptId);
  const setSetup = useScriptStore((state) => state.setSetup);
  const creativeContext = useScriptStore(
    (state) => state.scripts[scriptId]?.creativeContext
  );
  const setCreativeContext = useScriptStore((state) => state.setCreativeContext);
  const imports = useScriptFileImport(scriptId);
  const textInput = useRef<HTMLInputElement>(null);
  const subtitleInput = useRef<HTMLInputElement>(null);
  const briefField = useRef<HTMLElement | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");

  const brief = setup?.brief ?? "";
  const source = readScriptSource(setup);
  const carried = readScriptSetupContext(setup);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setSetup(scriptId, { brief: event.target.value });
    },
    [scriptId, setSetup]
  );

  // The picked file is read once; resetting the value lets the same file be
  // picked again after a refusal.
  const handlePicked = useCallback(
    (importFile: (file: File) => Promise<void>) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) {
          void importFile(file);
        }
      },
    []
  );

  const usePasted = useCallback(() => {
    imports.pasteText(pasted);
    setPasting(false);
  }, [imports, pasted]);

  const replaceSource = useCallback(() => {
    setPasted(source?.text ?? "");
    setPasting(true);
  }, [source]);

  const removeSource = useCallback(() => {
    setSetup(scriptId, scriptSourcePatch(null));
  }, [scriptId, setSetup]);

  const { version: languageVersion } = useAppLanguage();
  const alternatives: AlternativeEntry[] = useMemo(
    () => [
      {
        id: "paste",
        title: source ? i18n.t("storyboard:attrs.pasteDifferentWords", { defaultValue: "Paste different words" }) : i18n.t("storyboard:attrs.pasteYourScript", { defaultValue: "Paste your script" }),
        description: i18n.t("editor:ui.wordsKeptExactlyAsWritten", { defaultValue: "Words you already have, kept exactly as you wrote them" }),
        onSelect: () => {
          setPasted("");
          setPasting(true);
        }
      },
      {
        id: "upload",
        title: i18n.t("storyboard:attrs.uploadAFile", { defaultValue: "Upload a file" }),
        description: i18n.t("editor:ui.txtPdfDocxFinalDraft", { defaultValue: "TXT, PDF, DOCX or Final Draft" }),
        onSelect: () => textInput.current?.click(),
        disabled: imports.importing,
        disabledReason: imports.importing ? i18n.t("storyboard:attrs.readingYourFile", { defaultValue: "Reading your file…" }) : undefined
      },
      {
        id: "subtitles",
        title: i18n.t("storyboard:attrs.importSubtitles", { defaultValue: "Import subtitles" }),
        description: i18n.t("editor:ui.srtOrVttEachCueTimedLine", { defaultValue: "SRT or VTT — each cue becomes a timed line" }),
        onSelect: () => subtitleInput.current?.click(),
        disabled: imports.importing,
        disabledReason: imports.importing ? i18n.t("storyboard:attrs.readingYourFile", { defaultValue: "Reading your file…" }) : undefined
      },
      {
        id: "blank",
        title: i18n.t("editor:ui.startWithBlankScript", { defaultValue: "Start with a blank script" }),
        description: i18n.t("editor:ui.skipQuestionsWriteYourself", { defaultValue: "Skip the questions and write it yourself" }),
        onSelect: onStartBlank
      }
    ],
    [languageVersion, imports.importing, onStartBlank, source]
  );

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "minmax(0, 2fr) minmax(240px, 1fr)"
        },
        gap: GAP.spacious,
        alignItems: "start"
      }}
    >
      <FlexColumn gap={GAP.comfortable}>
        <FlexColumn gap={GAP.tight}>
          <Text size="big" component="h2">
            {i18n.t("editor:ui.whatSTheScriptAbout")}
          </Text>
          <Text size="normal" color="secondary">
            {i18n.t("editor:ui.weLlWriteItInLinesYouCanVoice")}
          </Text>
        </FlexColumn>

        {carried.attachments.length > 0 || carried.entityIds.length > 0 ? (
          <CarriedContext
            attachments={carried.attachments}
            entityCount={carried.entityIds.length}
          />
        ) : null}

        {source ? (
          <SourcePanel
            source={source}
            onReplace={replaceSource}
            onRemove={removeSource}
          />
        ) : null}

        <TextInput
          inputRef={briefField}
          value={brief}
          autoFocus
          multiline
          rows={5}
          label={source ? i18n.t("storyboard:attrs.notesForTheWriter", { defaultValue: "Notes for the writer" }) : i18n.t("storyboard:attrs.yourScript", { defaultValue: "Your script" })}
          hideLabel
          placeholder={
            source
              ? i18n.t("storyboard:attrs.optionalSayWhoReadsWhatOrHowToSplitTheLines", { defaultValue: "Optional: say who reads what, or how to split the lines." })
              : i18n.t("storyboard:attrs.describeTheTopicAudienceAndMessageForANewScript", { defaultValue: "Describe the topic, audience and message for a new script." })
          }
          helperText={
            source
              ? i18n.t("storyboard:attrs.yourImportedWordsAreKeptAsWrittenAnythingHereOnlyGuidesHowTheyAreSplitAndWhoReadsThem", { defaultValue: "Your imported words are kept as written. Anything here only guides how they are split and who reads them." })
              : "Text entered here is a writing brief and may be rewritten. Use Paste your script or Upload a file to preserve existing words."
          }
          onChange={handleChange}
        />

        <ScriptCreativeContextFields
          value={creativeContext}
          onChange={(next) => setCreativeContext(scriptId, next)}
        />

        {imports.error ? (
          <AlertBanner severity="error" onClose={imports.clearError}>
            {imports.error}
          </AlertBanner>
        ) : null}

        <ExampleBriefs
          examples={INSPIRATIONS}
          brief={brief}
          briefRef={briefField}
          onSelect={(value) => setSetup(scriptId, { brief: value })}
        />
      </FlexColumn>

      <AlternativesColumn
        label={i18n.t("storyboard:attrs.otherWaysToStart", { defaultValue: "Other ways to start" })}
        alternatives={alternatives}
      />

      {/* The cards are the controls; these inputs only open the picker. */}
      <input
        type="file"
        hidden
        ref={textInput}
        accept={SCRIPT_TEXT_ACCEPT}
        aria-label={i18n.t("storyboard:attrs.uploadAFile", { defaultValue: "Upload a file" })}
        onChange={handlePicked(imports.importText)}
      />
      <input
        type="file"
        hidden
        ref={subtitleInput}
        accept={SCRIPT_SUBTITLE_ACCEPT}
        aria-label={i18n.t("storyboard:attrs.importSubtitles", { defaultValue: "Import subtitles" })}
        onChange={handlePicked(imports.importSubtitles)}
      />

      <Dialog
        open={pasting}
        onClose={() => setPasting(false)}
        title={source ? i18n.t("storyboard:attrs.replaceYourScript", { defaultValue: "Replace your script" }) : i18n.t("storyboard:attrs.pasteYourScript", { defaultValue: "Paste your script" })}
        showActions
        confirmText={i18n.t("editor:ui.useThisText", { defaultValue: "Use this text" })}
        onConfirm={usePasted}
        onCancel={() => setPasting(false)}
        fullWidth
        maxWidth="sm"
      >
        <TextInput
          value={pasted}
          autoFocus
          multiline
          rows={12}
          label={i18n.t("storyboard:attrs.yourScript", { defaultValue: "Your script" })}
          hideLabel
          placeholder={i18n.t("storyboard:attrs.pasteItHereWe'llSplitItIntoLinesAndLeaveTheWordsAlone", { defaultValue: "Paste it here. We'll split it into lines and leave the words alone." })}
          onChange={(event) => setPasted(event.target.value)}
        />
      </Dialog>
    </Box>
  );
};

export const IdeaStep = memo(IdeaStepInternal);
IdeaStep.displayName = "ScriptIdeaStep";

export default IdeaStep;
