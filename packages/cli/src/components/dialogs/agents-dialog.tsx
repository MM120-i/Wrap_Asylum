import { useCallback } from "react";
import { useDialog } from "../../providers/dialog";
import { DialogSearchList } from "../dialog-search-list";
import { Mode } from "@warp-asylum/database/enums";

type AgentsDialogContentProps = {
  currentMode: Mode;
  onSelectMode: (mode: Mode) => void;
};

const getModelLabel = (mode: Mode) => {
  return mode === Mode.PLAN ? "Plan" : "Build";
};

const AVAILABLE_MODES: Mode[] = [Mode.BUILD, Mode.PLAN];

export const AgentsDialogContent = ({
  currentMode,
  onSelectMode,
}: AgentsDialogContentProps) => {
  const dialog = useDialog();

  const handleSelect = useCallback(
    (nextMode: Mode) => {
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
