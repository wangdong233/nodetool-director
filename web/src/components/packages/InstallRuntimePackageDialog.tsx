import { memo, useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Caption, Dialog, FlexColumn, Text } from "../ui_primitives";
import useRuntimePackagePromptStore from "../../stores/RuntimePackagePromptStore";
import useRuntimePackagesStore from "../../stores/RuntimePackagesStore";
import { useOpenPackageManagerInNewTab } from "../../hooks/useOpenPackageManager";

/** Model lists a newly installed local runtime can add entries to. */
const MODEL_QUERY_KEYS = [
  "providers",
  "asr-models",
  "tts-models",
  "language-models",
  "embedding-models",
  "image-models",
  "rerank-models"
];

/**
 * Installs the optional package a run or a request failed on, in place. The
 * desktop app installs it; a browser session cannot, so it links to the
 * Package Manager.
 */
const InstallRuntimePackageDialog: React.FC = () => {
  const { t } = useTranslation();
  const packageId = useRuntimePackagePromptStore((s) => s.packageId);
  const dismiss = useRuntimePackagePromptStore((s) => s.dismiss);
  const available = useRuntimePackagesStore((s) => s.available);
  const status = useRuntimePackagesStore((s) =>
    s.statuses.find((p) => p.id === packageId)
  );
  const refresh = useRuntimePackagesStore((s) => s.refresh);
  const install = useRuntimePackagesStore((s) => s.install);
  const openPackageManager = useOpenPackageManagerInNewTab();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<"ask" | "installing" | "done" | "failed">(
    "ask"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!packageId) {
      return;
    }
    setPhase("ask");
    setError(null);
    void refresh();
  }, [packageId, refresh]);

  const handleInstall = useCallback(async () => {
    if (!packageId) {
      return;
    }
    setPhase("installing");
    const ok = await install(packageId);
    if (ok) {
      for (const key of MODEL_QUERY_KEYS) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      setPhase("done");
    } else {
      setError(useRuntimePackagesStore.getState().error);
      setPhase("failed");
    }
  }, [packageId, install, queryClient]);

  if (!packageId) {
    return null;
  }

  const name = status?.name ?? packageId;
  const installed = phase === "done" || (status?.installed ?? false);

  if (!available) {
    return (
      <Dialog
        open
        onClose={dismiss}
        title={`${name} is not installed`}
        showActions
        onConfirm={() => {
          openPackageManager();
          dismiss();
        }}
        onCancel={dismiss}
        confirmText="Open Package Manager"
        cancelText="Close"
        minWidth="440px"
      >
        <Text size="small">
          This needs {name}. Only the desktop app can install it. Install it
          in the Package Manager of the machine that runs NodeTool.
        </Text>
      </Dialog>
    );
  }

  if (installed) {
    return (
      <Dialog
        open
        onClose={dismiss}
        title={t("editor:ui.runtimeInstalledTitle", {
          defaultValue: "{{name}} is installed",
          name
        })}
        showActions
        onConfirm={dismiss}
        onCancel={dismiss}
        confirmText={t("editor:ui.done", { defaultValue: "Done" })}
        cancelText={t("ui:attrs.close", { defaultValue: "Close" })}
        minWidth="440px"
      >
        <Text size="small">
          {t("editor:ui.tryAgainToUseIt", { defaultValue: "Try again to use it." })}
        </Text>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={phase === "installing" ? undefined : dismiss}
      title={t("editor:ui.installNameQuestion", {
        defaultValue: "Install {{name}}?",
        name
      })}
      showActions
      onConfirm={handleInstall}
      onCancel={dismiss}
      confirmText={
        phase === "installing"
          ? t("editor:ui.installing", { defaultValue: "Installing…" })
          : t("editor:ui.install", { defaultValue: "Install" })
      }
      cancelText={t("editor:ui.notNow", { defaultValue: "Not now" })}
      confirmDisabled={phase === "installing"}
      cancelDisabled={phase === "installing"}
      isLoading={phase === "installing"}
      minWidth="440px"
    >
      <FlexColumn gap={2}>
        <Text size="small">
          {t("editor:ui.nameIsNotInstalledInstallItNowThenTryAgain", {
            defaultValue: "{{name}} is not installed. Install it now, then try again.",
            name
          })}
        </Text>
        {status?.description && (
          <Caption sx={{ opacity: 0.7 }}>{status.description}</Caption>
        )}
        {phase === "failed" && (
          <Caption sx={{ color: "error.main" }}>
            {error ??
              t("editor:ui.theInstallFailedTryAgainFromThePackageManager", {
                defaultValue:
                  "The install failed. Try again from the Package Manager."
              })}
          </Caption>
        )}
      </FlexColumn>
    </Dialog>
  );
};

export default memo(InstallRuntimePackageDialog);
