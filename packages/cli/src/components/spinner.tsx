import "opentui-spinner/react";
import { useTheme } from "../providers/theme";
import { Mode, type ModeType } from "@warp-asylum/shared";

type Props = {
  mode?: ModeType;
};

export const Spinner = ({ mode = Mode.BUILD }: Props) => {
  const { colors } = useTheme();
  const activeColor = mode === Mode.PLAN ? colors.planMode : colors.primary;
  return <spinner name="binary" color={activeColor} />;
};
