import { UnifiedModel } from "../../stores/ApiTypes";
import { i18n } from "../../i18n";

export interface ModelComponentProps {
  model: UnifiedModel;
  handleModelDelete?: (modelId: string) => void;
  handleShowInExplorer?: (modelId: string) => void;
  onDownload?: () => void;
  onSelect?: () => void;
  compactView?: boolean;
  showModelStats?: boolean;
}
