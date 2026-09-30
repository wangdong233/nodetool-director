/** @jsxImportSource @emotion/react */
/**
 * Full-page wrapper for the chain editor.
 * Handles loading an existing workflow or starting fresh.
 */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { LoadingSpinner, Text, FlexColumn } from "../ui_primitives";
import { ChainEditor } from "./ChainEditor";
import { useChainEditorStore } from "./useChainEditorStore";
import { trpcClient } from "../../trpc/client";
import type { Workflow } from "../../stores/ApiTypes";
import { i18n } from "../../i18n";
import { useTranslation } from "react-i18next";

const ChainEditorPage: React.FC = () => {
  const { t } = useTranslation();
  const { workflowId } = useParams<{ workflowId?: string }>();
  const [loading, setLoading] = useState(!!workflowId);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflow = useChainEditorStore((s) => s.loadWorkflow);
  const newWorkflow = useChainEditorStore((s) => s.newWorkflow);

  useEffect(() => {
    const init = async () => {
      try {
        if (workflowId) {
          const data = await trpcClient.workflows.get.query({ id: workflowId });
          if (!data) {
            setError(i18n.t("editor:ui.workflowNotFound", { defaultValue: "Workflow not found" }));
            return;
          }
          loadWorkflow(data as Workflow);
        } else {
          newWorkflow();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : i18n.t("editor:ui.failedToLoadWorkflow", { defaultValue: "Failed to load workflow" }));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [workflowId, loadWorkflow, newWorkflow]);

  if (loading) {
    return (
      <FlexColumn align="center" justify="center" fullHeight fullWidth gap={2}>
        <LoadingSpinner size="large" />
        <Text color="secondary">{t("editor:ui.loadingWorkflow", { defaultValue: "Loading workflow…" })}</Text>
      </FlexColumn>
    );
  }

  if (error) {
    return (
      <FlexColumn align="center" justify="center" fullHeight fullWidth gap={2}>
        <Text color="error">{error}</Text>
      </FlexColumn>
    );
  }

  return <ChainEditor />;
};

export default ChainEditorPage;
