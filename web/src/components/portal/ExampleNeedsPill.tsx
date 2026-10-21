import { memo } from "react";
import { useTranslation } from "react-i18next";
import { StatusPill } from "../ui_primitives";
import { exampleNeedsLabel, type ExampleNeeds } from "../../utils/exampleNeeds";

interface ExampleNeedsPillProps {
  /** What the example asks for. Nothing renders when it is unknown. */
  needs: ExampleNeeds | null | undefined;
}

/** "Runs as is", or the model or key an example card needs before it runs. */
const ExampleNeedsPill = ({ needs }: ExampleNeedsPillProps) => {
  const { t } = useTranslation();
  if (!needs) {
    return null;
  }
  const { labelKey, label, runsAsIs } = exampleNeedsLabel(needs);
  return (
    <StatusPill
      tone={runsAsIs ? "done" : "neutral"}
      data-testid="example-needs"
      sx={{ alignSelf: "flex-start" }}
    >
      {t(labelKey, { defaultValue: label })}
    </StatusPill>
  );
};

export default memo(ExampleNeedsPill);
