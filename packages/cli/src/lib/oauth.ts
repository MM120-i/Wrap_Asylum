import open from "open";
import { saveAuth } from "./auth";

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

type OAuthState = {
  nonce: string;
  port: number;
};

const toBase64Url = (input: Uint8Array | string) => {
  return Buffer.from(input).toString("base64url");
};

const createPkceChallenge = async (verifier: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );

  return toBase64Url(new Uint8Array(digest));
};

const encodeState = (state: OAuthState) => {
  return toBase64Url(JSON.stringify(state));
};

const decodeState = (state: string) => {
  const [encoded] = state.split(".");

  if (!encoded) {
    throw new Error("Invalid state");
  }

  return JSON.parse(Buffer.from(encoded, "base64url").toString()) as OAuthState;
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : String(error);
};

export const performLogin = async () => {
  const clerkFrontendApi = process.env.CLERK_FRONTEND_API;
  const clientId = process.env.CLERK_OAUTH_CLIENT_ID;
  const apiUrl = process.env.API_URL ?? "http://localhost:3000";

  if (!clerkFrontendApi) {
    throw new Error("CLERK_FRONTEND_API is not set");
  }

  if (!clientId) {
    throw new Error("CLERK_OAUTH_CLIENT_ID is not set");
  }

  const nonce = crypto.randomUUID();
  const codeVerifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const codeChallenge = await createPkceChallenge(codeVerifier);
  let settled = false;

  return new Promise<{ token: string }>((resolve, reject) => {
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        const url = new URL(request.url);

        if (url.pathname !== "/callback") {
          return new Response("Not found", { status: 404 });
        }

        const error = url.searchParams.get("error");

        if (error) {
          const message = url.searchParams.get("error_description") ?? error;
          settled = true;
          reject(new Error(message));
          setTimeout(() => server.stop(), 500);

          return new Response(`Authentication failed: ${message}`, {
            status: 400,
          });
        }

        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (!code || !state) {
          settled = true;
          reject(new Error("Missing code or state"));
          setTimeout(() => server.stop(), 500);

          return new Response("Bad request", { status: 400 });
        }

        try {
          const payload = decodeState(state);

          if (payload.nonce !== nonce) {
            throw new Error("State mismatch");
          }
        } catch (error) {
          settled = true;
          reject(error);
          setTimeout(() => server.stop(), 500);

          return new Response("Invalid state", { status: 400 });
        }

        try {
          const redirectUri = `${apiUrl.replace(/\/$/, "")}/auth/callback`;

          const tokenRes = await fetch(`${clerkFrontendApi}/oauth/token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code,
              redirect_uri: redirectUri,
              client_id: clientId,
              code_verifier: codeVerifier,
            }),
          });

          if (!tokenRes.ok) {
            const details = await tokenRes.text();
            throw new Error(details || "Failed to exchange authorization code");
          }

          const tokenData = (await tokenRes.json()) as {
            access_token: unknown;
          };

          if (
            typeof tokenData.access_token !== "string" ||
            tokenData.access_token.length === 0
          ) {
            throw new Error("Invalid authentication response");
          }

          settled = true;
          saveAuth({ token: tokenData.access_token });
          resolve({ token: tokenData.access_token });
          setTimeout(() => server.stop(), 500);

          return new Response("Authenticated! You can close this tab");
        } catch (error) {
          settled = true;
          reject(error);
          const message = getErrorMessage(error);
          setTimeout(() => server.stop(), 500);

          return new Response(`Authentication failed: ${message}`, {
            status: 400,
          });
        }
      },
    });

    const port = server.port;

    if (typeof port !== "number") {
      server.stop();
      reject(new Error("Failed to start callback server"));
      return;
    }

    const state = encodeState({ port, nonce });
    const redirectUri = `${apiUrl.replace(/\/$/, "")}/auth/callback`;
    const authorizedUrl = new URL(`${clerkFrontendApi}/oauth/authorize`);

    authorizedUrl.searchParams.set("response_type", "code");
    authorizedUrl.searchParams.set("client_id", clientId);
    authorizedUrl.searchParams.set("redirect_uri", redirectUri);
    authorizedUrl.searchParams.set("scope", "openid email profile");
    authorizedUrl.searchParams.set("state", state);
    authorizedUrl.searchParams.set("prompt", "login");
    authorizedUrl.searchParams.set("code_challenge", codeChallenge);
    authorizedUrl.searchParams.set("code_challenge_method", "S256");

    void open(authorizedUrl.toString()).catch(() => {
      console.log(
        `Failed to open browser automatically. Open this URL to sign in:\n${authorizedUrl.toString()}`,
      );
    });

    setTimeout(() => {
      if (!settled) {
        settled = true;
        server.stop();
        reject(new Error("Login timed out"));
      }
    }, LOGIN_TIMEOUT_MS);
  });
};
