import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { findSupportedChatModel } from "@warp-asylum/shared";

import type {
  SupportedChatModel,
  SupportedChatModelId,
  SupportedProvider,
} from "@warp-asylum/shared";

import type { LanguageModel } from "ai";

type AnthropicModelId = Extract<
  SupportedChatModel,
  { provider: "anthropic" }
>["id"];

type OpenAIModelId = Extract<SupportedChatModel, { provider: "openai" }>["id"];

export type ResolveModel = {
  model: LanguageModel;
  provider: SupportedProvider;
  modelId: SupportedChatModelId;
};

const assertUnsupportedProvider = (provider: never): never => {
  throw new Error(`Unsupported provider: ${provider}`);
};

const resolveAnthropicModel = (modelId: AnthropicModelId): ResolveModel => {
  return {
    model: anthropic(modelId),
    provider: "anthropic",
    modelId,
  };
};

const resolveOpenAiModel = (modelId: OpenAIModelId): ResolveModel => {
  return {
    model: openai(modelId),
    provider: "openai",
    modelId,
  };
};

const resolveSupportedChatModel = (model: SupportedChatModel): ResolveModel => {
  const provider = model.provider;

  switch (provider) {
    case "anthropic":
      return resolveAnthropicModel(model.id);
    case "openai":
      return resolveOpenAiModel(model.id);
    default:
      return assertUnsupportedProvider(provider);
  }
};

export const isSupportedChatModel = (
  modelId: string,
): modelId is SupportedChatModelId => {
  return findSupportedChatModel(modelId) != null;
};

export const resolvedChatModel = (modelId: string): ResolveModel => {
  const model = findSupportedChatModel(modelId);

  if (!model) {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  return resolveSupportedChatModel(model);
};
