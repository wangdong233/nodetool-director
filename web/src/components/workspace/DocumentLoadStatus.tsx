import ReportBugButton from "../support/ReportBugButton";
import type { DocumentLoadState } from "../../stores/documentSync";
import { EmptyState, FlexColumn, LoadingSpinner, EditorButton } from "../ui_primitives";
import { useTranslation } from "react-i18next";
interface DocumentLoadStatusProps {
  state: Exclude<DocumentLoadState, "ready">;
  /** The document type, lowercase, as it reads mid-sentence: "storyboard". */
  label: string;
  onRetry?: () => void;
  onClose?: () => void;
  closeLabel?: string;
}

/**
 * What a document surface shows in place of itself until its initial server
 * load settles.
 *
 * The store-backed surfaces (storyboard, script, JS script) seed an empty
 * document on mount and fill it in when the server responds, so rendering them
 * straight away shows an empty document — indistinguishable from a document
 * that really is empty. This shows the load instead.
 */
const DocumentLoadStatus = ({ state, label, onRetry, onClose, closeLabel = "Close tab" }: DocumentLoadStatusProps) => {
  const { t } = useTranslation();
  return (
  <FlexColumn
    fullWidth
    fullHeight
    align="center"
    justify="center"
    sx={{ minHeight: 0 }}
  >
    {state === "loading" ? (
      <LoadingSpinner
        text={t("ui2:attrs.loadingDocument", {
          defaultValue: "Loading {{label}}…",
          label
        })}
      />
    ) : (
      <EmptyState
        variant="error"
        title={t("ui2:attrs.couldNotLoadDocument", {
          defaultValue: "Could not load this {{label}}",
          label
        })}
        description={onRetry
          ? t("ui2:attrs.loadFailedUnavailable", {
              defaultValue: "The document could not be loaded. It may be unavailable or you may need to reconnect."
            })
          : t("ui2:attrs.loadFailedRetry", {
              defaultValue: "The document could not be loaded. Close the tab and open it again to retry."
            })}
        actionText={onRetry ? t("common:action.retry", { defaultValue: "Retry" }) : undefined}
        onAction={onRetry}
      />
    )}
    {state === "error" && <ReportBugButton context={{ source: "panel-crash", summary: `Could not load this ${label}` }} />}
    {state === "error" && onClose && (
      <EditorButton onClick={onClose}>{closeLabel}</EditorButton>
    )}
  </FlexColumn>
)
  };

export default DocumentLoadStatus;
