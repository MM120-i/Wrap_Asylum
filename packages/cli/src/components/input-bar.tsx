import type { KeyBinding } from "@opentui/core";
import { StatusBar } from "./status-bar";

type Props = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
};

export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
  { name: "enter", shift: true, action: "newline" },
  { name: "return", shift: true, action: "newline" },
  { name: "enter", action: "submit" },
  { name: "return", action: "submit" },
];

export const InputBar = ({ disabled = false }: Props) => {
  return (
    <box width={"100%"} alignItems="center">
      <box border={["left"]} borderColor={"cyan"}>
        <box
          position="relative"
          justifyContent="center"
          paddingX={2}
          paddingY={1}
          backgroundColor={"#1A1A24"}
          width={"100%"}
          gap={1}
        >
          <textarea
            focused={!disabled}
            height={3}
            width={45}
            keyBindings={TEXTAREA_KEY_BINDINGS}
            placeholder={`Ask anything... "Fix a bug in the database"`}
          />
          <StatusBar />
        </box>
      </box>
    </box>
  );
};
