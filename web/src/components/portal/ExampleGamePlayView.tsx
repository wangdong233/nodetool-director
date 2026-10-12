import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "../../trpc/client";
import { GamePlayer } from "../game/GamePlayerPage";
import { EmptyState, LoadingSpinner } from "../ui_primitives";
import ReportBugButton from "../support/ReportBugButton";

const Player3D = lazy(() => import("../game/GamePlayer3D"));

interface ExampleGamePlayViewProps {
  slug: string;
}

export default function ExampleGamePlayView({
  slug
}: ExampleGamePlayViewProps) {
  const { t } = useTranslation();
  const query = trpc.games.example.useQuery(
    { slug },
    { staleTime: Infinity, retry: false }
  );
  if (query.isPending) {
    return <LoadingSpinner text={t("editor:ui.loadingGame", { defaultValue: "Loading game" })} />;
  }
  if (query.isError) {
    return (
      <EmptyState
        variant="error"
        title={t("editor:ui.couldNotLoadGame", { defaultValue: "Could not load game" })}
        actionText={t("editor:explorer.retry", { defaultValue: "Retry" })}
        onAction={() => void query.refetch()}
        description={
          <ReportBugButton
            context={{
              source: "panel-crash",
              summary: "Example game failed",
              errorText: query.error.message
            }}
          />
        }
      />
    );
  }
  const { name, document } = query.data;
  return document.schemaVersion === 3 ? (
    <Suspense fallback={<LoadingSpinner text={t("game:player.loading3dPlayer", { defaultValue: "Loading 3D player" })} />}>
      <Player3D gameId={`example:${slug}`} name={name} document={document} />
    </Suspense>
  ) : (
    <GamePlayer gameId={`example:${slug}`} name={name} document={document} />
  );
}
