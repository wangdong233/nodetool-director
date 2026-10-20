import { isModelSelected } from "@nodetool-ai/protocol";
import { FormField } from "../../ui_primitives";
import LanguageModelSelect from "../../properties/LanguageModelSelect";
import useGlobalChatStore from "../../../stores/GlobalChatStore";
import { SetupFooterField } from "../SetupFooterField";
import { useTranslation } from "react-i18next";

function BriefModelPicker({ readOnly = false }: { readOnly?: boolean }) {
  const { t } = useTranslation();
  const model = useGlobalChatStore((state) => state.selectedModel);
  const setSelectedModel = useGlobalChatStore((state) => state.setSelectedModel);
  return (
    <LanguageModelSelect
      value={isModelSelected(model) ? model.id : ""}
      provider={model?.provider}
      onChange={setSelectedModel}
      placeholder={t("setup:image.briefModel", { defaultValue: "Brief model" })}
      disabled={readOnly}
    />
  );
}

/** The brief model, for the shell's footer beside the estimate it prices. */
export function BriefModelFooterField({ readOnly }: { readOnly?: boolean }) {
  const { t } = useTranslation();
  return (
    <SetupFooterField label={t("setup:image.briefModel", { defaultValue: "Brief model" })}>
      <BriefModelPicker readOnly={readOnly} />
    </SetupFooterField>
  );
}

export default function BriefModelSelect() {
  const { t } = useTranslation();
  return (
    <FormField
      label={t("storyboard:attrs.languageModelForTheBrief", { defaultValue: "Language model for the brief" })}
      sx={{ width: "100%", maxWidth: 320 }}
    >
      <BriefModelPicker />
    </FormField>
  );
}
