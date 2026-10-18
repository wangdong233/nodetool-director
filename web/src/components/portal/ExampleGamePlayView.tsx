import { lazy, Suspense } from "react";
import { trpc } from "../../trpc/client";
import { GamePlayer } from "../game/GamePlayerPage";
import { EmptyState, LoadingSpinner } from "../ui_primitives";
import ReportBugButton from "../support/ReportBugButton";
import { useTranslation } from "react-i18next";

const Player3D = lazy(() => import("../game/GamePlayer3D"));

interface ExampleGamePlayViewProps {
  slug: string;
}

/** Opened by a game card's Play button, so the game starts without a second click. */
export default function ExampleGamePlayView({
  slug
}: ExampleGamePlayViewProps) {
  const { t } = useTranslation();
  const query = trpc.games.example.useQuery(
    { slug },
    { staleTime: Infinity, retry: false }
  );
  if (query.isPending) {
    return <LoadingSpinner text="Loading game" />;
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
    <Suspense fallback={<LoadingSpinner text="Loading 3D player" />}>
      <Player3D
        gameId={`example:${slug}`}
        name={name}
        document={document}
        autoPlay
      />
    </Suspense>
  ) : (
    // Embedded in the Examples tab: the workspace owns the browser tab title.
    <GamePlayer
      gameId={`example:${slug}`}
      name={name}
      document={document}
      setsDocumentTitle={false}
      autoPlay
    />
  );
}
