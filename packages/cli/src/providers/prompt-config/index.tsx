import {
  useContext,
  useState,
  useCallback,
  createContext,
  type ReactNode,
} from "react";

import {
  DEFAULT_CHAT_MODEL_ID,
  Mode,
  type SupportedChatModelId,
  type ModeType,
} from "@warp-asylum/shared";

type PromptConfigContextValue = {
  mode: ModeType;
  toggleMode: () => void;
  setMode: (mode: ModeType) => void;
  model: SupportedChatModelId;
  setModel: (model: SupportedChatModelId) => void;
};

const PromptConfigContext = createContext<PromptConfigContextValue | null>(
  null,
);

export const usePromptConfig = (): PromptConfigContextValue => {
  const value = useContext(PromptConfigContext);

  if (!value) {
    throw new Error(
      "usePromptConfig must be used within a PromptConfigProvider",
    );
  }

  return value;
};

type PromptConfigProviderProps = {
  children: ReactNode;
};

export const PromptConfigProvider = ({
  children,
}: PromptConfigProviderProps) => {
  const [mode, setMode] = useState<ModeType>(Mode.BUILD);

  const [model, setModel] = useState<SupportedChatModelId>(
    DEFAULT_CHAT_MODEL_ID,
  );

  const toggleMode = useCallback(() => {
    setMode((m) => (m === Mode.BUILD ? Mode.PLAN : Mode.BUILD));
  }, []);

  return (
    <PromptConfigContext value={{ mode, toggleMode, setMode, model, setModel }}>
      {children}
    </PromptConfigContext>
  );
};
