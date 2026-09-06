import "opentui-spinner/react";
import { useTheme } from "../providers/theme";
import { Mode } from "@warp-asylum/database/enums";

type Props = {
  mode?: Mode;
};

export const Spinner = ({ mode = Mode.BUILD }: Props) => {
  const { colors } = useTheme();
  const activeColor = mode === Mode.PLAN ? colors.planMode : colors.primary;
  return <spinner name="binary" color={activeColor} />;
};
