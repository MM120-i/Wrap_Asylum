export type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
};

// TODO: Add more supported providers later
export type SupportedProvider = "anthropic" | "openai" | "local";

/**
 * Local models are served from any OpenAI-compatible endpoint
 * (Ollama, LM Studio, vLLM, llama.cpp, ...). The id format is
 * `local:<model-name>` where `<model-name>` is the model id the
 * local server knows the model by, e.g. `local:qwen3:8b`.
 */
export type LocalChatModelId = `local:${string}`;

export type AnthropicChatModelId =
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5"
  | "claude-opus-4-6";

export type OpenAIChatModelId = "gpt-5.4" | "gpt-5.4-mini" | "gpt-5.4-nano";

export type SupportedChatModelId =
  | AnthropicChatModelId
  | OpenAIChatModelId
  | LocalChatModelId;

export type SupportedChatModel = {
  id: SupportedChatModelId;
  provider: SupportedProvider;
  pricing: ModelPricing;
};

const LOCAL_MODEL_PRICING: ModelPricing = {
  inputUsdPerMillionTokens: 0,
  outputUsdPerMillionTokens: 0,
};

export const SUPPORTED_CHAT_MODELS = [
  {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    pricing: {
      inputUsdPerMillionTokens: 3,
      outputUsdPerMillionTokens: 15,
    },
  },
  {
    id: "claude-haiku-4-5",
    provider: "anthropic",
    pricing: {
      inputUsdPerMillionTokens: 1,
      outputUsdPerMillionTokens: 5,
    },
  },
  {
    id: "claude-opus-4-6",
    provider: "anthropic",
    pricing: {
      inputUsdPerMillionTokens: 5,
      outputUsdPerMillionTokens: 25,
    },
  },
  {
    id: "gpt-5.4",
    provider: "openai",
    pricing: {
      inputUsdPerMillionTokens: 2.5,
      outputUsdPerMillionTokens: 15,
    },
  },
  {
    id: "gpt-5.4-mini",
    provider: "openai",
    pricing: {
      inputUsdPerMillionTokens: 0.75,
      outputUsdPerMillionTokens: 4.5,
    },
  },
  {
    id: "gpt-5.4-nano",
    provider: "openai",
    pricing: {
      inputUsdPerMillionTokens: 0.2,
      outputUsdPerMillionTokens: 1.25,
    },
  },
] as const satisfies readonly SupportedChatModel[];

export const findSupportedChatModel = (
  modelId: string,
): SupportedChatModel | undefined => {
  const builtIn = SUPPORTED_CHAT_MODELS.find((model) => model.id === modelId);

  if (builtIn != null) {
    return builtIn;
  }

  if (modelId.startsWith("local:")) {
    return {
      id: modelId as LocalChatModelId,
      provider: "local",
      pricing: LOCAL_MODEL_PRICING,
    };
  }

  return undefined;
};

export const DEFAULT_CHAT_MODEL_ID: SupportedChatModelId =
  (process.env.DEFAULT_CHAT_MODEL as SupportedChatModelId | undefined) ??
  "gpt-5.4";