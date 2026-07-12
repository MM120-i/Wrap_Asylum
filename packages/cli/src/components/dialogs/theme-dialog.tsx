import { useCallback, useEffect, useRef } from "react";
import { useDialog } from "../../providers/dialog";
import { useTheme } from "../../providers/theme";
import { DialogSearchList } from "../dialog-search-list";
import { THEMES } from "../../theme";

import type { Theme } from "../../theme";

export const ThemeDialogContent = () => {
  const dialog = useDialog();
  const { setTheme, previewTheme, currentTheme, colors } = useTheme();
  const originalThemeRef = useRef(currentTheme);
  const confirmedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (!confirmedRef.current) {
        setTheme(originalThemeRef.current);
      }
    };
  }, [setTheme]);

  const handleSelect = useCallback(
    (theme: Theme) => {
      confirmedRef.current = true;
      setTheme(theme);
      dialog.close();
    },
    [setTheme, dialog],
  );

  const handleHighlight = useCallback(
    (theme: Theme) => {
      previewTheme(theme);
    },
    [previewTheme],
  );

  return (
    <DialogSearchList
      items={THEMES}
      onSelect={handleSelect}
      onHighlight={handleHighlight}
      filterFn={(t, query) =>
        t.name.toLowerCase().includes(query.toLowerCase())
      }
      renderItem={(theme, isSelected) => (
        <text
          selectable={false}
          fg={isSelected ? colors.background : colors.primary}
        >
          {theme.name === originalThemeRef.current.name
            ? "\u0020\u2022\u0020"
            : "\u0020\u0020\u0020"}
          {theme.name}
        </text>
      )}
      getKey={(t) => t.name}
      placeholder="Search themes"
      emptyText="No matching themes"
    />
  );
};
