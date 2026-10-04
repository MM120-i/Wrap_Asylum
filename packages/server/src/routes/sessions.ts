import { Hono } from "hono";
import { db } from "@warp-asylum/database";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import * as Sentry from "@sentry/hono/bun";
import { requireCreditsBalance } from "../middleware/require-credits-balance";

import type { AuthenticatedEnv } from "../middleware/require-auth";

const createSessionsSchema = z.object({
  title: z.string(),
});

const createSessionValidator = zValidator(
  "json",
  createSessionsSchema,
  (result, c) => {
    if (!result.success) {
      Sentry.logger.warn("Session creation validation failed", {
        path: c.req.path,
        issues: result.error.issues.length,
      });

      return c.json(
        {
          error: "Invalid request body",
        },
        400,
      );
    }
  },
);

const app = new Hono<AuthenticatedEnv>()
  .get("/", async (c) => {
    const userId = c.get("userId");

    const sessions = await db.session.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    Sentry.logger.info("Listed sessions", {
      count: sessions.length,
    });

    return c.json(sessions);
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const userId = c.get("userId");

    const session = await db.session.findUnique({
      where: { id, userId },
    });

    if (!session) {
      Sentry.logger.warn("Session not found", {
        sessionId: id,
        userId: "mock-user",
      });

      return c.json(
        {
          error: "Session not found",
        },
        404,
      );
    }

    Sentry.logger.info("Loaded session", {
      sessionId: session.id,
    });

    return c.json(session);
  })
  .post("/", requireCreditsBalance, createSessionValidator, async (c) => {
    const userId = c.get("userId");
    const data = c.req.valid("json");

    const session = await db.session.create({
      data: {
        ...data,
        userId,
      },
    });

    return c.json(session, 201);
  });

export default app;
