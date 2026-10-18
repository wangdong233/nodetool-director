import WorkflowForm from "./WorkflowForm";
import { Workflow } from "../../stores/ApiTypes";
import { Dialog } from "../ui_primitives";
import { useTranslation } from "react-i18next";

interface WorkflowFormModalProps {
  open: boolean;
  onClose: () => void;
  workflow: Workflow;
  availableTags?: string[];
}

const WorkflowFormModal = ({
  open,
  onClose,
  workflow,
  availableTags
}: WorkflowFormModalProps) => {
  const { t } = useTranslation("editor");
  return (
    <Dialog
      className="workflow-form-modal"
      open={open}
      onClose={onClose}
      title={t("editor:ui.workflowSettings", { defaultValue: "Workflow settings" })}
      maxWidth="sm"
      fullWidth
    >
      <WorkflowForm workflow={workflow} availableTags={availableTags} />
    </Dialog>
  );
};

export default WorkflowFormModal;
