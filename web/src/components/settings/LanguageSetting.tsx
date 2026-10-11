import { useMemo } from "react";
import {
  SUPPORTED_LANGUAGES,
  useAppLanguage,
  type AppLanguage,
} from "../../i18n";
import { useTranslation } from "react-i18next";
import { SelectField } from "../ui_primitives";

/**
 * Language picker for the General settings section (director/93 §2).
 * Default English; switching loads the zh-CN catalogs lazily and persists
 * to localStorage under `nodetool-language`. Labels read from the catalogs
 * (endonyms), never a parallel hardcoded map.
 */
export function LanguageSetting() {
  const { t } = useTranslation("settings");
  const { language, setLanguage } = useAppLanguage();
  const options = useMemo(
    () =>
      [...SUPPORTED_LANGUAGES].map((lang) => ({
        value: lang,
        label:
          lang === "en"
            ? t("settings:general.languageEnglish")
            : t("settings:general.languageChinese"),
      })),
    [t],
  );
  return (
    <SelectField
      label={t("general.language")}
      value={language}
      onChange={(value) => {
        void setLanguage(value as AppLanguage);
      }}
      options={options}
    />
  );
}
