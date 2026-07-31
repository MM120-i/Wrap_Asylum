import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import sessions from "./routes/sessions";
import { sessions as sessionList } from "./store";

const app = new Hono();

app.get("/", (c) => {
  const result = sessionList.map(({ id, title, createdAt }) => ({
    id,
    title,
    createdAt,
  }));
  return c.json(result);
});

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json(
      {
        error: error.message || "Request failed",
      },
      error.status,
    );
  }

  console.error("Unhandled server error", error);

  return c.json(
    {
      error: "Internal server error",
    },
    500,
  );
});

const routes = app.route("/sessions", sessions);

app.notFound((c) =>
  c.json({ error: "Not found" }, 404),
);

export type AppType = typeof routes;

// idletimeout must be high, otherwise llm tool call might not complete
export default {
  port: 3000,
  fetch: app.fetch,
  idleTimeout: 255,
};
