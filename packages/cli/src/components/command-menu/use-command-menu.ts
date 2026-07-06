import { useRef, useState, useMemo, useEffect, type RefObject } from "react";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { getFilteredCommands } from "./filter-commands";
import type { Command } from "./types";
import { useKeyboardLayer } from "../../providers/keyboard-layer";

type UseCommandMenuReturn = {
  showCommandMenu: boolean;
  commandQuery: string;
  selectedIndex: number;
  scrollRef: RefObject<ScrollBoxRenderable | null>;
  handleContentChange: (text: string) => void;
  resolveCommand: (index: number) => Command | undefined;
  setSelectedIndex: (index: number) => void;
};

export const useCommandMenu = (): UseCommandMenuReturn => {
  const [textValue, setTextValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);
  const { push, pop, isTopLayer } = useKeyboardLayer();

  useEffect(() => {
    return () => {
      pop("command");
    };
  }, [pop]);

  const commandQuery =
    showCommandMenu && textValue.startsWith("/") ? textValue.slice(1) : "";

  const filteredCommands = useMemo(
    () => getFilteredCommands(commandQuery),
    [commandQuery],
  );

  const close = () => {
    setShowCommandMenu(false);
    pop("command");
  };

  const handleContentChange = (text: string) => {
    setTextValue(text);
    setSelectedIndex(0);

    const scrollBox = scrollRef.current;

    if (scrollBox) {
      scrollBox.scrollTo(0);
    }

    const prefix = text.startsWith("/") ? text.slice(1) : null;

    if (prefix !== null && !prefix.includes(" ")) {
      setShowCommandMenu(true);

      // TODO: Refactor this sketchy keyboard responder layer. That string is hardcoded and can be anything and it'll break the entire component
      push("command", () => {
        close();
        return true;
      });
    } else {
      close();
    }
  };

  const resolveCommand = (index: number): Command | undefined => {
    const command = filteredCommands[index];

    if (command) {
      close();
    }

    return command;
  };

  useKeyboard((key) => {
    if (!showCommandMenu || !isTopLayer("command")) {
      return;
    }

    switch (key.name) {
      case "escape":
        key.preventDefault();
        close();
        break;

      case "up":
        key.preventDefault();
        setSelectedIndex((i: number) => {
          const newIndex = Math.max(0, i - 1);
          const sb = scrollRef.current;

          if (sb && newIndex < sb.scrollTop) {
            sb.scrollTo(newIndex);
          }

          return newIndex;
        });

        break;

      case "down":
        key.preventDefault();
        setSelectedIndex((i: number) => {
          if (filteredCommands.length === 0) {
            return 0;
          }

          const newIndex = Math.min(filteredCommands.length - 1, i + 1);
          const sb = scrollRef.current;

          if (sb) {
            const viewPortHeight = sb.viewport.height;
            const visibleEnd = sb.scrollTop + viewPortHeight - 1;

            if (newIndex > visibleEnd) {
              sb.scrollTo(newIndex - viewPortHeight + 1);
            }
          }

          return newIndex;
        });

        break;
    }
  });

  return {
    showCommandMenu,
    commandQuery,
    selectedIndex,
    scrollRef,
    handleContentChange,
    resolveCommand,
    setSelectedIndex,
  };
};
