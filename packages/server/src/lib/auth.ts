import { createClerkClient } from "@clerk/backend";

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("CLERK_SECRET_KEY env variable is required");
}

if (!process.env.CLERK_PUBLISHABLE_KEY) {
  throw new Error("CLERK_PUBLISHABLE_KEY env variable is required");
}

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
});

export type OAuthAuthSuccess = {
  userid: string;
};

export type OAuthAuthFailure = {
  reason: string | null;
};

export const authenticateOAuthRequest = async (
  request: Request,
): Promise<OAuthAuthSuccess | OAuthAuthFailure> => {
  const requestState = await clerkClient.authenticateRequest(request, {
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
