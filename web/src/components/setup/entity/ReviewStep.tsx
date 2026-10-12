import type { EntityKind } from "@nodetool-ai/protocol";
import { useTranslation } from "react-i18next";

import {
  BORDER_RADIUS,
  Caption,
  Chip,
  EmptyState,
  FlexColumn,
  FlexRow,
  GAP,
  LoadingSpinner,
  ResponsiveImage,
  Text
} from "../../ui_primitives";
import { getEntityKindChipSx } from "../../entities/entityKind";
import { GalleryFrame } from "../MediaGallery";
import { SETUP_CONTENT_WIDTH, SETUP_MEDIA_WIDTH } from "../layout";

interface ReviewStepProps {
  readonly assetId: string;
  readonly kind: EntityKind;
  readonly name: string;
  readonly descriptor: string;
  readonly tags: readonly string[];
}

export const ReviewStep = ({
  assetId,
  kind,
  name,
  descriptor,
  tags
}: ReviewStepProps) => {
  const { t } = useTranslation();
  return (
  <FlexColumn gap={GAP.spacious} sx={{ maxWidth: SETUP_CONTENT_WIDTH }}>
    <FlexColumn gap={GAP.tight}>
      <Text size="big" component="h1">
        {t("storyboard:attrs.reviewYourEntity", { defaultValue: "Review your entity" })}
      </Text>
      <Text color="secondary">
        {t("setup:entity.thisReferenceAndDescriptorWillBeAvailable", {
          defaultValue:
            "This reference and descriptor will be available anywhere entities can be added."
        })}
      </Text>
    </FlexColumn>

    <GalleryFrame
      locator={`asset://${assetId}`}
      kind="image"
      caption={t("setup:entity.nameReference", { defaultValue: "{{name}} reference", name })}
    >
      <ResponsiveImage
        locator={`asset://${assetId}`}
        alt={t("setup:entity.nameReference", { defaultValue: "{{name}} reference", name })}
        aspectRatio="1/1"
        fit="contain"
        borderRadius={BORDER_RADIUS.md}
        showErrorFallback
        sx={{ width: SETUP_MEDIA_WIDTH, maxWidth: "100%", maxHeight: "44vh" }}
      />
    </GalleryFrame>
    <FlexRow gap={GAP.normal} align="center" wrap>
      <Text size="big">{name}</Text>
      <Chip
        label={kind}
        compact
        variant="outlined"
        sx={getEntityKindChipSx(kind)}
      />
    </FlexRow>
    <Text>{descriptor}</Text>
    {tags.length > 0 ? (
      <Caption color="secondary">
        {t("setup:entity.tagsLabel", {
          defaultValue: "Tags: {{tags}}",
          tags: tags.join(", ")
        })}
      </Caption>
    ) : null}
  </FlexColumn>
  );
};

export default ReviewStep;

interface ReviewFallbackProps {
  readonly loading: boolean;
}

/**
 * What the review shows when there is nothing to review yet: the library is
 * still loading, or the reference is missing or already used by another
 * entity. The footer names what to do about it.
 */
export const ReviewFallback = ({ loading }: ReviewFallbackProps) => {
  const { t } = useTranslation();
  return loading ? (
    <FlexRow gap={GAP.normal} align="center">
      <LoadingSpinner inline size="small" />
      <Text color="secondary">
        {t("setup:entity.loadingYourEntityLibraryEllipsis", {
          defaultValue: "Loading your entity library…"
        })}
      </Text>
    </FlexRow>
  ) : (
    <EmptyState
      variant="empty"
      title={t("setup:entity.noReferenceImageYet", { defaultValue: "No reference image yet" })}
      description={t("setup:entity.goBackToTheReferenceStep", {
        defaultValue:
          "Go back to the reference step and choose or generate one."
      })}
    />
  );
};
