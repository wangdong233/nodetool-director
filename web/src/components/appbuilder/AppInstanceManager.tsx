import { useState } from "react";
import {
  useAppInstances,
  useAppInstanceMutations
} from "../../serverState/useAppInstances";
import {
  appInstanceId,
  disposeAppRuntimeStore
} from "./runtime/appRuntimeStore";
import { loadAppInstance } from "./runtime/appInstanceApi";
import { tAttr, tAttrTpl } from "./i18nAttrs";
import { useAppRuntimeContext } from "./runtime/AppRuntimeContext";
import { getAppSessionToken } from "../../lib/appSession";
import {
  creationProjectId,
  tabId,
  useWorkspaceTabsStore
} from "../../stores/WorkspaceTabsStore";
import {
  AlertBanner,
  Caption,
  Dialog,
  EditorButton,
  FlexColumn,
  FlexRow,
  SelectField,
  SPACING,
  TextInput
} from "../ui_primitives";
import ReportBugButton from "../support/ReportBugButton";

interface AppInstanceManagerProps {
  applicationId: string;
  latestVersion?: number;
  onAdvanced: () => void;
}

export default function AppInstanceManager({
  applicationId,
  latestVersion,
  onAdvanced
}: AppInstanceManagerProps): React.ReactElement | null {
  const { instance, flushInstance, refreshInstance } = useAppRuntimeContext();
  const visitor = getAppSessionToken() !== null;
  const scope = {
    application_id: applicationId,
    source_id: `application:${applicationId}`,
    limit: 20
  };
  const list = useAppInstances(scope, !visitor);
  const mutations = useAppInstanceMutations(scope);
  const openTab = useWorkspaceTabsStore((state) => state.openForegroundTab);
  const closeTab = useWorkspaceTabsStore((state) => state.closeTab);
  const setTitle = useWorkspaceTabsStore((state) => state.setTitle);
  const [action, setAction] = useState<
    "new" | "rename" | "duplicate" | "delete" | "advance" | null
  >(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  if (visitor || !instance) {
    return null;
  }
  const choices = list.data?.pages[pageIndex]?.instances ?? [];
  const older = async (): Promise<void> => {
    if (!list.data?.pages[pageIndex + 1]) {
      await list.fetchNextPage();
    }
    setPageIndex((index) => index + 1);
  };
  const navigate = (id: string, title: string) =>
    openTab({
      type: "application",
      ref: applicationId,
      instanceId: id,
      title,
      mode: "view",
      projectId: creationProjectId()
    });
  const select = async (id: string): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await flushInstance?.();
      const selected = choices.find((item) => item.id === id);
      navigate(id, selected?.name ?? tAttr("App instance"));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : tAttr("Could not switch instances.")
      );
    } finally {
      setBusy(false);
    }
  };
  const confirm = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await flushInstance?.();
      const current = await loadAppInstance(instance.id);
      if (action === "new") {
        const created = await mutations.create.mutateAsync({
          application_id: applicationId,
          source_id: scope.source_id,
          name: name.trim(),
          version: latestVersion ?? null,
          snapshot: current.snapshot
        });
        navigate(created.id, created.name);
      } else if (action === "duplicate") {
        const copied = await mutations.duplicate.mutateAsync({
          id: current.id,
          name: name.trim()
        });
        navigate(copied.id, copied.name);
      } else if (action === "rename") {
        const renamed = await mutations.rename.mutateAsync({
          id: current.id,
          expected_revision: current.revision,
          name: name.trim()
        });
        setTitle(applicationId, "application", renamed.name, current.id);
        await refreshInstance?.();
      } else if (action === "advance" && latestVersion !== undefined) {
        await mutations.advance.mutateAsync({
          id: current.id,
          expected_revision: current.revision,
          version: latestVersion
        });
        disposeAppRuntimeStore(
          appInstanceId(`${current.user_id}:${current.id}`)
        );
        onAdvanced();
      } else if (action === "delete") {
        await mutations.remove.mutateAsync(current.id);
        closeTab(tabId("application", applicationId, current.id));
      }
      setAction(null);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Instance action failed."
      );
    } finally {
      setBusy(false);
    }
  };
  const show = (next: NonNullable<typeof action>): void => {
    setName(
      next === "rename"
        ? instance.name
        : next === "duplicate"
          ? `${instance.name} copy`
          : "New instance"
    );
    setAction(next);
    setError(null);
  };
  const named =
    action === "new" || action === "rename" || action === "duplicate";
  return (
    <FlexColumn gap={SPACING.sm} padding={SPACING.lg}>
      <FlexRow gap={SPACING.sm} align="center" sx={{ flexWrap: "wrap" }}>
        <SelectField
          label={tAttr("App instance")}
          value={instance.id}
          disabled={busy}
          options={[
            ...choices,
            ...(choices.some((item) => item.id === instance.id)
              ? []
              : [instance])
          ].map((item) => ({ value: item.id, label: item.name }))}
          onChange={(id) => void select(id)}
        />
        <Caption>
          {instance.version === null
            ? tAttr("Draft working copy")
            : tAttrTpl("pinnedVersion", "Pinned version {{version}}", {
                version: instance.version
              })}
        </Caption>
        <EditorButton
          variant="outlined"
          color="inherit"
          disabled={busy}
          onClick={() => show("new")}
        >
          {tAttr("New instance")}
        </EditorButton>
        <EditorButton
          variant="outlined"
          color="inherit"
          disabled={busy}
          onClick={() => show("rename")}
        >
          Rename
        </EditorButton>
        <EditorButton
          variant="outlined"
          color="inherit"
          disabled={busy}
          onClick={() => show("duplicate")}
        >
          Duplicate
        </EditorButton>
        <EditorButton
          variant="outlined"
          color="inherit"
          disabled={busy}
          onClick={() => show("delete")}
        >
          {tAttr("Delete instance")}
        </EditorButton>
        {latestVersion !== undefined &&
        latestVersion > (instance.version ?? 0) ? (
          <EditorButton
            variant="outlined"
            color="inherit"
            disabled={busy}
            onClick={() => show("advance")}
          >
            {tAttrTpl("advanceToVersion", "Advance to version {{version}}", {
              version: latestVersion
            })}
          </EditorButton>
        ) : null}
        {pageIndex > 0 ? (
          <EditorButton
            variant="outlined"
            color="inherit"
            onClick={() => setPageIndex((index) => index - 1)}
          >
            {tAttr("Newer instances")}
          </EditorButton>
        ) : null}
        {list.hasNextPage || list.data?.pages[pageIndex + 1] ? (
          <EditorButton
            variant="outlined"
            color="inherit"
            disabled={list.isFetchingNextPage}
            onClick={() => void older()}
          >
            {tAttr("Older instances")}
          </EditorButton>
        ) : null}
      </FlexRow>
      {error || list.error ? (
        <AlertBanner
          severity="error"
          action={
            <ReportBugButton
              context={{
                source: "operation-failure",
                summary: "Instance management failed",
                errorText: error ?? list.error?.message
              }}
            />
          }
        >
          {error ?? list.error?.message}
        </AlertBanner>
      ) : null}
      <Dialog
        open={action !== null}
        onClose={() => {
          if (!busy) {
            setAction(null);
          }
        }}
        title={
          action === "advance"
            ? tAttr("Advance instance version")
            : action === "delete"
              ? tAttr("Delete instance")
              : action === "duplicate"
                ? tAttr("Duplicate instance")
                : action === "rename"
                  ? tAttr("Rename instance")
                  : tAttr("New instance")
        }
        onConfirm={() => void confirm()}
        confirmText={action === "delete" ? tAttr("Delete") : tAttr("Save")}
        isLoading={busy}
        confirmDisabled={named && !name.trim()}
        destructive={action === "delete"}
      >
        {named ? (
          <TextInput
            label={tAttr("Instance name")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        ) : (
          <Caption>
            {action === "delete"
              ? tAttr(
                  "This removes the instance, its history and associations. Generated media remains in your library. Running work is not cancelled."
                )
              : tAttr(
                  "Future runs will use the selected published version. Historical runs keep their original version. Incompatible state prevents advancement."
                )}
          </Caption>
        )}
        {error ? <AlertBanner severity="error">{error}</AlertBanner> : null}
      </Dialog>
    </FlexColumn>
  );
}
