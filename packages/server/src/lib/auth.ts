import { createClerkClient } from "@clerk/backend";

let clerkClient: ReturnType<typeof createClerkClient> | null = null;

const getClerkClient = () => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;

  if (!secretKey || !publishableKey) {
    return null;
  }

  if (!clerkClient) {
    clerkClient = createClerkClient({ secretKey, publishableKey });
  }

  return clerkClient;
};

export type OAuthAuthSuccess = {
  userid: string;
};

export type OAuthAuthFailure = {
  reason: string | null;
};

export const authenticateOAuthRequest = async (
  request: Request,
): Promise<OAuthAuthSuccess | OAuthAuthFailure> => {
  const client = getClerkClient();

  if (!client) {
    return { reason: "unexpected-error" };
  }

  const requestState = await client.authenticateRequest(request, {
    acceptsToken: "oauth_token",
  });

  if (!requestState.isAuthenticated) {
    return { reason: requestState.reason ?? null };
  }

  const auth = requestState.toAuth();

  if (auth.tokenType !== "oauth_token" || !auth.userId) {
    return { reason: "token-type-mismatch" };
  }

  const expectedClientId = process.env.CLERK_OAUTH_CLIENT_ID;

  if (expectedClientId && auth.clientId !== expectedClientId) {
    return { reason: "token-type-mismatch" };
  }

  return { userid: auth.userId };
};
