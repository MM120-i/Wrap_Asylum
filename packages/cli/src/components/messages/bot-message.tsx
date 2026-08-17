import { Mode } from "@warp-asylum/database/enums";
import type { ClientMessagePart } from "../../hooks/use-chat";
import { useTheme } from "../../providers/theme";
import { TextAttributes } from "@opentui/core";

type Props = {
  parts: ClientMessagePart[];
  model: string;
  mode: Mode;
  duration?: string;
  streaming?: boolean;
};

export const BotMessage = ({
  parts,
  model,
  mode,
  duration,
  streaming = false,
}: Props) => {
  const { colors } = useTheme();
  const text = parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  return (
    <box width={"100%"} alignItems="center">
      <box paddingY={1} width={"100%"}>
        <box paddingX={3} width={"100%"}>
          <text>{text}</text>
        </box>
      </box>
      <box paddingX={3} paddingBottom={1} gap={1} width={"100%"}>
        <box flexDirection="row" gap={2}>
          <text fg={mode == Mode.PLAN ? colors.planMode : colors.primary}>
            &#x25C9;
          </text>
          <box flexDirection="row" gap={1}>
            <text>{mode == Mode.PLAN ? "Plan" : "Build"}</text>
            <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
              &gt;
            </text>
            <text attributes={TextAttributes.DIM}>{model}</text>
            {duration && (
              <>
                <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
                  &gt;
                </text>
                <text attributes={TextAttributes.DIM}>{duration}</text>
              </>
            )}
          </box>
        </box>
      </box>
    </box>
  );
};
