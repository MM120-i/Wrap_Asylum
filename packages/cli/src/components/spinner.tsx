import "opentui-spinner/react";
import { useTheme } from "../providers/theme";

export const Spinner = () => {
  const { colors } = useTheme();
  return <spinner name="binary" color={colors.primary} />;
};
