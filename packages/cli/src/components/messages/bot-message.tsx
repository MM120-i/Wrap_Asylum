import { Mode, type ModeType } from "@warp-asylum/shared";
import { useTheme } from "../../providers/theme";
import { TextAttributes } from "@opentui/core";
import prettyMs from "pretty-ms";

import type { Message } from "../../hooks/use-chat";

type ClientMessagePart = Message["parts"][number];

type ToolPart = Extract<
  ClientMessagePart,
  { type: `tool-${string}` | "dynamic-tool" }
>;

type Props = {
  parts: ClientMessagePart[];
  model: string;
  mode: ModeType;
  durationMs?: string;
  streaming?: boolean;
  interrupted?: boolean;
};

const formatToolName = (name: string): string => {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
};

const isToolpart = (part: ClientMessagePart): part is ToolPart => {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
};

const formatToolArgs = (tc: ToolPart): string => {
  if (!("input" in tc) || tc.input == null) {
    return "";
  }

  if (typeof tc.input !== "object") {
    return String(tc.input);
  }

  return Object.values(tc.input).map(String).join(" ");
};

type PartGroup = {
  type: ClientMessagePart["type"];
  parts: ClientMessagePart[];
  key: string;
};

const groupConsecutiveParts = (parts: ClientMessagePart[]): PartGroup[] => {
  const groups: PartGroup[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (!part) {
      continue;
    }

    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.type === part.type) {
      lastGroup.parts.push(part);
    } else {
      const key = isToolpart(part)
        ? `group-tc-${part.toolCallId}`
        : `group-${part.type}-${i}`;

      groups.push({ type: part.type, parts: [part], key });
    }
  }

  return groups;
};

export const BotMessage = ({ parts, model, mode, durationMs }: Props) => {
  const { colors } = useTheme();

  return (
    <box width={"100%"} alignItems="center">
      {groupConsecutiveParts(parts).map((group, i) => (
        <box key={group.key} width={"100%"} paddingTop={i === 0 ? 0 : 1}>
          {group.parts.map((part, j) => {
            if (part.type === "reasoning") {
              return (
                <box
                  key={`reasoning-${j}`}
                  border={["left"]}
                  borderColor={colors.thinkingBorder}
                  width={"100%"}
                  paddingX={2}
                >
                  <text attributes={TextAttributes.DIM}>
                    <em fg={colors.thinking}>Thinking: </em>
                    {part.text}
                  </text>
                </box>
              );
            }

            if (isToolpart(part)) {
              const toolName =
                part.type === "dynamic-tool"
                  ? part.toolName
                  : part.type.slice("tool-".length);

              return (
                <box
                  key={part.toolCallId}
                  border={["left"]}
                  borderColor={colors.thinkingBorder}
                  width={"100%"}
                  paddingX={2}
                >
                  <text attributes={TextAttributes.DIM}>
                    <em fg={colors.info}>{formatToolName(toolName)}:</em>
                    {formatToolArgs(part)}
                    {part.state !== "output-available" &&
                    part.state !== "output-error"
                      ? "..."
                      : ""}
                    {part.state === "output-error" ? ` ${part.errorText}` : ""}
                  </text>
                </box>
              );
            }

            if (part.type === "text") {
              return (
                <box key={`text-${j}`} paddingX={3} width={"100%"}>
                  <text>{part.text}</text>
                </box>
              );
            }

            return null;
          })}
        </box>
      ))}
      <box paddingX={3} paddingY={1} gap={1} width={"100%"}>
        <box flexDirection="row" gap={2}>
          <text fg={mode === Mode.PLAN ? colors.planMode : colors.primary}>
            &#x25C9;
          </text>
          <box flexDirection="row" gap={1}>
            <text>{mode === Mode.PLAN ? "Plan" : "Build"}</text>
            <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
              &gt;
            </text>
            <text attributes={TextAttributes.DIM}>{model}</text>
            {durationMs != null && (
              <>
                <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
                  &gt;
                </text>
                <text attributes={TextAttributes.DIM}>
                  {prettyMs(Number(durationMs))}
                </text>
              </>
            )}
          </box>
        </box>
      </box>
    </box>
  );
};
