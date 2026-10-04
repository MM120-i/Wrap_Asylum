import { useCallback } from "react";
import { useDialog } from "../../providers/dialog";
import { DialogSearchList } from "../dialog-search-list";
import { Mode, type ModeType } from "@warp-asylum/shared";

type AgentsDialogContentProps = {
  currentMode: ModeType;
  onSelectMode: (mode: ModeType) => void;
};

const getModelLabel = (mode: ModeType) => {
  return mode === Mode.PLAN ? "Plan" : "Build";
};

const AVAILABLE_MODES: ModeType[] = [Mode.BUILD, Mode.PLAN];

export const AgentsDialogContent = ({
  currentMode,
  onSelectMode,
}: AgentsDialogContentProps) => {
  const dialog = useDialog();

  const handleSelect = useCallback(
    (nextMode: ModeType) => {
      onSelectMode(nextMode);
      dialog.close();
    },
    [onSelectMode, dialog],
  );

  return (
    <DialogSearchList
      items={AVAILABLE_MODES}
      onSelect={handleSelect}
      filterFn={(item, query) =>
        getModelLabel(item).toLowerCase().includes(query.toLowerCase())
      }
      renderItem={(item, isSelected) => (
        <text selectable={false} fg={isSelected ? "black" : "white"}>
          {item === currentMode ? "\u2022" : " "}
          {getModelLabel(item)}
        </text>
      )}
      getKey={(item) => item}
      placeholder="Search agents"
      emptyText="No matching agents"
    />
  );
};
