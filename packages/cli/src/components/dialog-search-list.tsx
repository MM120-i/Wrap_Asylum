import { useCallback, useRef, useState, type ReactNode } from "react";
import {
  ScrollBoxRenderable,
  TextAttributes,
  type InputRenderable,
  type ScrollBarRenderable,
} from "@opentui/core";

import { useKeyboard } from "@opentui/react";
import { useKeyboardLayer } from "../providers/keyboard-layer";

const MAX_VISIBLE_ITEMS = 6;

type DialogSearchListProps<T> = {
  items: T[];
  onSelect: (item: T) => void;
  onHighlight?: (item: T) => void;
  filterFn: (item: T, query: string) => boolean;
  renderItem: (item: T, isSelected: boolean) => ReactNode;
  getKey: (item: T) => string;
  placeholder?: string;
  emptyText?: string;
};

export const DialogSearchList = <T,>({
  items,
  onSelect,
  onHighlight,
  filterFn,
  renderItem,
  getKey,
  placeholder = "Search",
  emptyText = "No results",
}: DialogSearchListProps<T>) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef<InputRenderable>(null);
  const scrollRef = useRef<ScrollBoxRenderable>(null);
  const { isTopLayer } = useKeyboardLayer();
  // const {colors} = useTheme();

  const handleContentChange = useCallback(() => {
    const text = inputRef.current?.value ?? "";
    setSearchValue(text);
    setSelectedIndex(0);

    const scrollBox = scrollRef.current;

    if (scrollBox) {
      scrollBox.scrollTo(0);
    }
  }, []);

  const filtered = searchValue
    ? items.filter((items) => filterFn(items, searchValue))
    : items;

  const visibleHeight = Math.min(filtered.length, MAX_VISIBLE_ITEMS);

  useKeyboard((key) => {
    if (!isTopLayer("dialog")) {
      return;
    }

    switch (key.name) {
      case "enter":
      case "return":
        const item = filtered[selectedIndex];

        if (item) {
          onSelect(item);
        }

        break;

      case "up":
        setSelectedIndex((i) => {
          const newIndex = Math.max(0, i - 1);
          const sb = scrollRef.current;

          if (sb && newIndex < sb.scrollTop) {
            sb.scrollTo(newIndex);
          }

          const item = filtered[newIndex];

          if (item && onHighlight) {
            onHighlight(item);
          }

          return newIndex;
        });

        break;

      case "down":
        setSelectedIndex((i) => {
          const newIndex = Math.min(filtered.length - 1, i + 1);
          const sb = scrollRef.current;

          if (sb) {
            const viewPortHeight = sb.viewport.height;
            const visibleEnd = sb.scrollTop + viewPortHeight - 1;

            if (newIndex > visibleEnd) {
              sb.scrollTo(newIndex - viewPortHeight + 1);
            }
          }

          const item = filtered[newIndex];

          if (item && onHighlight) {
            onHighlight(item);
          }

          return newIndex;
        });

        break;
    }
  });

  return (
    <box flexDirection="column" gap={1}>
      <input
        ref={inputRef}
        placeholder={placeholder}
        focused
        onContentChange={handleContentChange}
      />
      {filtered.length === 0 ? (
        <text attributes={TextAttributes.DIM}>{emptyText}</text>
      ) : (
        <scrollbox ref={scrollRef} height={visibleHeight}>
          {filtered.map((item, i) => {
            const isSelected = i === selectedIndex;

            return (
              <box
                key={getKey(item)}
                flexDirection="row"
                height={1}
                overflow="hidden"
                // TODO: Replace with theme coloring
                backgroundColor={isSelected ? "#89B4FA" : undefined}
                onMouseMove={() => {
                  setSelectedIndex(i);

                  if (onHighlight) {
                    onHighlight(item);
                  }
                }}
                onMouseDown={() => onSelect(item)}
              >
                {renderItem(item, isSelected)}
              </box>
            );
          })}
        </scrollbox>
      )}
    </box>
  );
};
