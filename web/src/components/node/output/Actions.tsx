import React, { memo } from "react";
import { CopyButton, Box } from "../../ui_primitives";
import { i18n } from "../../../i18n";

type ActionsProps = {
  copyValue?: unknown;
};

const Actions: React.FC<ActionsProps> = ({ copyValue }) => {
  if (copyValue === undefined || copyValue === null) {
    return null;
  }
  return (
    <Box className="actions">
      <CopyButton value={copyValue} buttonSize="small" tabIndex={-1} />
    </Box>
  );
};

export default memo(Actions);
