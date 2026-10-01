import {
  SUPPORTED_CHAT_MODELS,
  findSupportedChatModel,
  type ModelPricing,
} from "@warp-asylum/shared";

import type { LanguageModelUsage } from "ai";

type CalculateCreditsForUsageParams = {
  provider: string;
  model: string;
  usage: LanguageModelUsage;
};

type BillableUsage = {
  credits: number;
};

type TokenCounts = {
  inputTokens: number;
  outputTokens: number;
};

const TOKENS_PER_MILLION = 1_000_000;
const CAD_PER_CREDIT = 0.01;

const getUsdToCadRate = (): number => {
  const raw = process.env.USD_TO_CAD_EXCHANGE_RATE;

  if (raw == null || raw === "") {
    return 1.37;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("USD_TO_CAD_EXCHANGE_RATE must be a positive number");
  }

  return parsed;
};

const getTokenCounts = (usage: LanguageModelUsage): TokenCounts => {
  const inputTokens = usage.inputTokens;
  const outputTokens = usage.outputTokens;

  if (
    inputTokens == null ||
    outputTokens == null ||
    !Number.isFinite(inputTokens) ||
    !Number.isFinite(outputTokens) ||
    !Number.isInteger(inputTokens) ||
    !Number.isInteger(outputTokens) ||
    inputTokens < 0 ||
    outputTokens < 0
  ) {
    throw new Error("Credit conversion requires input and output token counts");
  }

  return { inputTokens, outputTokens };
};

const getModelPricing = (provider: string, model: string): ModelPricing => {
  const supportedModel = findSupportedChatModel(model);

  if (!supportedModel || supportedModel.provider !== provider) {
    if (
      !SUPPORTED_CHAT_MODELS.some(
        (supportedModel) => supportedModel.provider === provider,
      )
    ) {
      throw new Error(`Unsupported billing provider: ${provider}`);
    }

    throw new Error(`Unsupported billing model: ${model}`);
  }

  return supportedModel.pricing;
};

export const estimateCostUsd = (
  { inputTokens, outputTokens }: TokenCounts,
  pricing: ModelPricing,
) => {
  return (
    (inputTokens * pricing.inputUsdPerMillionTokens +
      outputTokens * pricing.outputUsdPerMillionTokens) /
    TOKENS_PER_MILLION
  );
};

export const estimateCostCad = (
  { inputTokens, outputTokens }: TokenCounts,
  pricing: ModelPricing,
) => {
  return (
    estimateCostUsd({ inputTokens, outputTokens }, pricing) * getUsdToCadRate()
  );
};

export const convertCadToCredits = (costCad: number) => {
  if (costCad <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(costCad / CAD_PER_CREDIT));
};

export const calculateCreditsForUsage = ({
  provider,
  model,
  usage,
}: CalculateCreditsForUsageParams): BillableUsage => {
  const tokenCounts = getTokenCounts(usage);
  const pricing = getModelPricing(provider, model);
  const costCad = estimateCostCad(tokenCounts, pricing);

  return { credits: convertCadToCredits(costCad) };
};
