import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import sessions from "./routes/sessions";
import { sentry } from "@sentry/hono/bun";
import * as Sentry from "@sentry/hono/bun";
import chat from "./routes/chat";
import auth from "./routes/auth";
import { requireAuth } from "./middleware/require-auth";

const app = new Hono();

app.get("/health", (c) => {
  return c.json({ status: "ok" }, 200);
});

app.get("/auth/callback", (c) => {
  const state = c.req.query("state");

  if (!state) {
    return c.text("Missing OAuth state", 400);
  }

  try {
    const [encodedState] = state.split(".");
    const payload = JSON.parse(
      Buffer.from(encodedState!, "base64url").toString("utf8"),
    ) as { port?: unknown };
    const port = payload.port;

    if (
      typeof port !== "number" ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      return c.text("Invalid OAuth callback port", 400);
    }

    const callbackUrl = new URL(`http://127.0.0.1:${port}/callback`);

    for (const [key, value] of new URL(c.req.url).searchParams) {
      callbackUrl.searchParams.append(key, value);
    }

    return c.redirect(callbackUrl.toString());
  } catch {
    return c.text("Invalid OAuth state", 400);
  }
});

app.use(
  sentry(app, {
    dsn: "https://65a4679f77b44b9e50df32cd3a29a108@o4507637662351360.ingest.us.sentry.io/4511831525949440",
    tracesSampleRate: 1.0,
    enableLogs: true,
    sendDefaultPii: true,
  }),
);

app.get("/debug-sentry", () => {
  // Send a log before throwing the error
  Sentry.logger.info("User triggered test error", {
    action: "test_error_endpoint",
  });
  // Send a test metric before throwing the error
  Sentry.metrics.count("test_counter", 1);
  throw new Error("My first Sentry error!");
});

// app.get("/", (c) => {
//   const result = sessionList.map(({ id, title, createdAt }) => ({
//     id,
//     title,
//     createdAt,
//   }));
//   return c.json(result);
// });

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    Sentry.logger.warn("Handled HTTP error", {
      status: error.status,
      message: error.message || "Request failed",
      path: c.req.path,
      method: c.req.method,
    });

    return c.json(
      {
        error: error.message || "Request failed",
      },
      error.status,
    );
  }

  Sentry.logger.error("Unhandled server error", {
    path: c.req.path,
    method: c.req.method,
    message: error instanceof Error ? error.message : "Unknown error",
  });

  return c.json(
    {
      error: "Internal server error",
    },
    500,
  );
});

app.use("/sessions/*", requireAuth);
app.use("/chat/*", requireAuth);

const routes = app
  .route("/auth", auth)
  .route("/sessions", sessions)
  .route("/chat", chat);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export type AppType = typeof routes;

// idletimeout must be high, otherwise llm tool call might not complete
export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
  idleTimeout: 255,
};
