import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { Header } from "./components/header";
import { InputBar } from "./components/input-bar";

const App = () => {
  return (
    <box
      alignItems="center"
      justifyContent="center"
      backgroundColor="#0D0D12"
      width="100%"
      height="100%"
      minWidth="100%"
      minHeight="100%"
      flexGrow={1}
      flexShrink={0}
      gap={2}
    >
      <Header />
      <box width={"100%"} maxWidth={78} paddingX={2}>
        <InputBar onSubmit={() => {}} />
      </box>
    </box>
  );
};

const renderer = await createCliRenderer();
createRoot(renderer).render(<App />);
