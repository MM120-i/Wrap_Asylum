import { Polar } from "@polar-sh/sdk";

type PolarServer = "sandbox" | "production";

const getRequiredEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }

  return value;
};

export const getPolarAccessToken = () => {
  return getRequiredEnv("POLAR_ACCESS_TOKEN");
};

export const getPolarProductId = () => {
  return getRequiredEnv("POLAR_PRODUCT_ID");
};

export const getPolarCreditsMeterId = () => {
  return getRequiredEnv("POLAR_CREDITS_METER_ID");
};

export const getPolarServer = (): PolarServer => {
  const server = process.env.POLAR_SERVER;

  if (!server) {
    return "sandbox";
  }

  if (server !== "sandbox" && server !== "production") {
    throw new Error("POLAR_SERVER must be either 'sandbox' or 'production'");
  }

  return server;
};

let polarClient: Polar | null = null;

const getPolarClient = (): Polar | null => {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;

  if (!accessToken) {
    return null;
  }

  if (!polarClient) {
    polarClient = new Polar({
      accessToken,
      server: getPolarServer(),
    });
  }

  return polarClient;
};

const requirePolarClient = (): Polar => {
  const client = getPolarClient();

  if (!client) {
    throw new Error("Billing is not configured (missing POLAR_ACCESS_TOKEN)");
  }

  return client;
};

const hasStatusCode = (error: unknown): error is { statusCode: number } => {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  );
};

type CreateCheckoutUrlParams = {
  customerExternalId: string;
  requestUrl: string;
};

export const createCheckoutUrl = async ({
  customerExternalId,
  requestUrl,
}: CreateCheckoutUrlParams) => {
  const result = await requirePolarClient().checkouts.create({
    products: [getPolarProductId()],
    successUrl: new URL("/billing/success", requestUrl).toString(),
    externalCustomerId: customerExternalId,
    metadata: { source: "warpasylum-cli" },
  });

  return result;
};

export const createCustomerPolarUrl = async ({
  customerExternalId,
  requestUrl,
}: CreateCheckoutUrlParams) => {
  const result = await requirePolarClient().customerSessions.create({
    externalCustomerId: customerExternalId,
    returnUrl: new URL("/billing/success", requestUrl).toString(),
  });

  return result.customerPortalUrl;
};

export const getAvaliableCreditBalance = async (customerExternalId: string) => {
  try {
    const customerState =
      await requirePolarClient().customers.getStateExternal({
      externalId: customerExternalId,
    });

    const matchingMeters = customerState.activeMeters.filter(
      (meter) => meter.meterId === getPolarCreditsMeterId(),
    );

    if (matchingMeters.length > 1) {
      throw new Error("Expected exactly one matching Polar credits meter");
    }

    const creditsMeter = matchingMeters[0];

    return creditsMeter?.balance ?? 0;
  } catch (error) {
    if (hasStatusCode(error) && error.statusCode === 404) {
      return 0;
    }

    throw error;
  }
};

type IngestAiUsageParams = {
  externalCustomerId: string;
  eventId: string;
  credits: number;
};

export const ingestAiUsage = async ({
  externalCustomerId,
  eventId,
  credits,
}: IngestAiUsageParams) => {
  if (credits <= 0) {
    return;
  }

  const client = getPolarClient();

  if (!client) {
    return;
  }

  await client.events.ingest({
    events: [
      {
        name: "warpasylum_usage",
        externalId: eventId,
        externalCustomerId,
        metadata: { credits },
      },
    ],
  });
};
