import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import sessions from "./routes/sessions";
import { sessions as sessionList } from "./store";
import { sentry } from "@sentry/hono/bun";
import * as Sentry from "@sentry/hono/bun";

const app = new Hono();

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

const routes = app.route("/sessions", sessions);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export type AppType = typeof routes;

// idletimeout must be high, otherwise llm tool call might not complete
export default {
  port: 3000,
  fetch: app.fetch,
  idleTimeout: 255,
};
