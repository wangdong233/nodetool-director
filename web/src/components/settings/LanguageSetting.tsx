import { useMemo } from "react";
import {
  SUPPORTED_LANGUAGES,
  useAppLanguage,
  type AppLanguage,
} from "../../i18n";
import { useTranslation } from "react-i18next";
import { Select, MenuItem } from "@mui/material";
import { Text } from "../ui_primitives";

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: "English",
  "zh-CN": "简体中文",
};

/**
 * Language picker for the General settings section (director/93 §2).
 * Default English; switching loads the zh-CN catalogs lazily and persists
 * to localStorage under `nodetool-language`.
 */
export function LanguageSetting({ dense = false }: { dense?: boolean }) {
  const { t } = useTranslation("settings");
  const { language, setLanguage } = useAppLanguage();
  const options = useMemo(() => [...SUPPORTED_LANGUAGES], []);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Text className="language-setting-label">{t("general.language")}</Text>
      <Select<AppLanguage>
        value={language}
        onChange={(event) => {
          void setLanguage(event.target.value as AppLanguage);
        }}
        size={dense ? "small" : "medium"}
        aria-label={t("general.language")}
        sx={{ minWidth: 160 }}
      >
        {options.map((lang) => (
          <MenuItem key={lang} value={lang}>
            {LANGUAGE_LABELS[lang]}
          </MenuItem>
        ))}
      </Select>
    </div>
  );
}
