import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";

import { Caption, Dialog, FlexColumn, Text } from "../ui_primitives";
import { useOAuthConnection } from "../../hooks/useOAuthConnection";
import useProviderSignInStore from "../../stores/ProviderSignInStore";
import { OAuthManualCompletionDialog } from "../oauth/OAuthManualCompletionDialog";

/**
 * Renews an expired account sign-in (Codex, Claude) after a run fails on it.
 * The dialog starts the same OAuth flow as the provider settings and closes
 * itself once a fresh token is stored.
 */
const ProviderSignInDialog: React.FC = () => {
  const { t } = useTranslation();
  const provider = useProviderSignInStore((state) => state.provider);
  const dismiss = useProviderSignInStore((state) => state.dismiss);
  const oauth = useOAuthConnection(provider?.oauth ?? null, {
    onConnected: dismiss
  });
  const { cancelManual } = oauth;

  const handleClose = useCallback(() => {
    cancelManual();
    dismiss();
  }, [cancelManual, dismiss]);

  if (!provider) {
    return null;
  }

  return (
    <>
      <Dialog
        open
        onClose={handleClose}
        title={t("editor:ui.signInToAgain", { defaultValue: "Sign in to {{label}} again", label: provider.label })}
        showActions
        onConfirm={oauth.connect}
        onCancel={handleClose}
        confirmText={
          oauth.isConnecting
            ? t("editor:ui.waitingForSignIn", { defaultValue: "Waiting for sign-in…" })
            : t("editor:ui.signInWith", { defaultValue: "Sign in with {{account}}", account: provider.account })
        }
        cancelText={t("editor:ui.notNow", { defaultValue: "Not now" })}
        confirmDisabled={oauth.isConnecting}
        isLoading={oauth.isConnecting}
        minWidth="440px"
      >
        <FlexColumn gap={2}>
          <Text size="small">
            {t("editor:ui.signInExpiredBody", { defaultValue: "Your {{account}} sign-in expired, so {{label}} refused the request. Sign in again, then run the workflow again.", account: provider.account, label: provider.label })}
          </Text>
          <Caption sx={{ opacity: 0.6 }}>
            {t("editor:ui.signInOpensInNewWindow", { defaultValue: "The sign-in opens in a new window. This dialog closes when it finishes." })}
          </Caption>
        </FlexColumn>
      </Dialog>
      <OAuthManualCompletionDialog
        prompt={oauth.manualPrompt}
        label={oauth.label}
        isSubmitting={oauth.isSubmittingManual}
        onSubmit={oauth.submitManualCode}
        onCancel={oauth.cancelManual}
      />
    </>
  );
};

export default memo(ProviderSignInDialog);
