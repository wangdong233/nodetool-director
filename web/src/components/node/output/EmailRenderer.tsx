/** @jsxImportSource @emotion/react */
import React, { memo } from "react";
import { useTheme } from "@mui/material/styles";
import { MaybeMarkdown } from "./markdown";
import { outputStyles } from "./styles";
import { useTranslation } from "react-i18next";

export type Email = {
  sender: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
};

export const EmailRenderer: React.FC<{ value: Email }> = ({ value }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <div css={outputStyles(theme)}>
      <div className="email-header">
        <p>
          <strong>{t("editor:ui.from2", { defaultValue: "From:" })}</strong> {value.sender}
        </p>
        <p>
          <strong>To:</strong> {value.to}
        </p>
        {value.cc && (
          <p>
            <strong>CC:</strong> {value.cc}
          </p>
        )}
        <p>
          <strong>Subject:</strong> {value.subject}
        </p>
      </div>
      <div className="email-body">
        <MaybeMarkdown text={value.body} />
      </div>
    </div>
  );
};

export default memo(EmailRenderer);
