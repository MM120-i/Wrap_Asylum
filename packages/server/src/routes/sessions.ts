import { Hono } from "hono";
// import { HTTPException } from "hono/http-exception";
import { db } from "@warp-asylum/database";
import { Role, Mode, MessageStatus } from "@warp-asylum/database/enums";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { findSupportedChatModel } from "@warp-asylum/shared";

import {
  sessions,
  nextId as _nextId,
  type MockMessage,
  type MockSession,
} from "../store";

let nextId = _nextId;

const createSessionsSchema = z.object({
  title: z.string(),
  cwd: z.string().optional(),
  initialMessage: z
    .object({
      role: z.enum(Role),
      content: z.string(),
      mode: z.enum(Mode),
      model: z
        .string()
        .refine((id) => !!findSupportedChatModel(id), "Unsupported model"),
    })
    .optional(),
});

const createSessionValidator = zValidator(
  "json",
  createSessionsSchema,
  (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: "Invalid request body",
        },
        400,
      );
    }
  },
);

const app = new Hono()
  .get("/", async (c) => {
    const sessions = await db.session.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    return c.json(sessions);
  })
  .get("/:id", async (c) => {
    // await new Promise((r) => setTimeout(r, 5000)); // Simulates slow session loading

    // throw new HTTPException(500, {
    //   // Simulates session loading error
    //   message: "Mock error: Session loading failed",
    // });

    const id = c.req.param("id");
    const session = await db.session.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!session) {
      return c.json(
        {
          error: "Session not found",
        },
        404,
      );
    }

    return c.json(session);
  })
  .post("/", createSessionValidator, async (c) => {
    // await new Promise((r) => setTimeout(r, 5000)); // Simulates slow session loading

    // throw new HTTPException(500, {
    //   // Simulates session loading error
    //   message: "Mock error: Session loading failed",
    // });

    const { initialMessage, ...data } = c.req.valid("json");

    const session = await db.session.create({
      data: {
        ...data,
        userId: "mock-user",
        ...(initialMessage && {
          messages: {
            create: {
              ...initialMessage,
              status: MessageStatus.COMPLETE,
            },
          },
        }),
      },
      include: {
        messages: true,
      },
    });

    return c.json(session, 201);
  });

export default app;
