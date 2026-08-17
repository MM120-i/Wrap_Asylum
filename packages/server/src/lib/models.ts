import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { findSupportedChatModel } from "@warp-asylum/shared";

import type {
  SupportedChatModel,
  SupportedChatModelId,
  SupportedProvider,
  AnthropicChatModelId,
  OpenAIChatModelId,
  LocalChatModelId,
} from "@warp-asylum/shared";

import type { LanguageModel } from "ai";

export type ResolveModel = {
  model: LanguageModel;
  provider: SupportedProvider;
  modelId: SupportedChatModelId;
};

const assertUnsupportedProvider = (provider: never): never => {
  throw new Error(`Unsupported provider: ${provider}`);
};

const resolveAnthropicModel = (
  modelId: AnthropicChatModelId,
): ResolveModel => {
  return {
    model: anthropic(modelId),
    provider: "anthropic",
    modelId,
  };
};

const resolveOpenAiModel = (modelId: OpenAIChatModelId): ResolveModel => {
  return {
    model: openai(modelId),
    provider: "openai",
    modelId,
  };
};

const resolveLocalModel = (modelId: LocalChatModelId): ResolveModel => {
  const baseURL = process.env.LOCAL_MODEL_BASE_URL;

  if (!baseURL) {
    throw new Error(
      "LOCAL_MODEL_BASE_URL is not set. Point it at your local model server, e.g. http://localhost:11434/v1 for Ollama.",
    );
  }

  const local = createOpenAICompatible({
    name: "local",
    baseURL,
    apiKey: process.env.LOCAL_MODEL_API_KEY ?? "local",
  });

  const modelName = modelId.slice("local:".length);

  return {
    model: local(modelName),
    provider: "local",
    modelId,
  };
};

const resolveSupportedChatModel = (model: SupportedChatModel): ResolveModel => {
  const provider = model.provider;

  switch (provider) {
    case "anthropic":
      return resolveAnthropicModel(model.id as AnthropicChatModelId);
    case "openai":
      return resolveOpenAiModel(model.id as OpenAIChatModelId);
    case "local":
      return resolveLocalModel(model.id as LocalChatModelId);
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