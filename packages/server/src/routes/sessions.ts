import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { findSupportedChatModel } from "@warp-asylum/shared";

type MockMessage = {
  id: string;
  role: string;
  content: string;
  mode: string;
  model: string;
  status: string;
  parts: null;
  duration: null;
  createdAt: string;
  sessionId: string;
};

type MockSession = {
  id: string;
  title: string;
  cwd: string | null;
  userId: string;
  createdAt: string;
  messages: MockMessage[];
};

const sessions: MockSession[] = [];
let nextId = 1;

const createSessionsSchema = z.object({
  title: z.string(),
  cwd: z.string().optional(),
  initialMessage: z
    .object({
      role: z.string(),
      content: z.string(),
      mode: z.string(),
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
  .get("/", (c) => {
    const result = sessions.map(({ id, title, createdAt }) => ({
      id,
      title,
      createdAt,
    }));

    return c.json(result);
  })
  .get("/:id", async (c) => {
    // await new Promise((r) => setTimeout(r, 5000)); // Simulates slow session loading

    // throw new HTTPException(500, {
    //   // Simulates session loading error
    //   message: "Mock error: Session loading failed",
    // });

    const id = c.req.param("id");
    const session = sessions.find((s) => s.id === id);

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
    const id = String(nextId++);
    const now = new Date().toISOString();
    const messages: MockMessage[] = [];

    if (initialMessage) {
      messages.push({
        id: String(nextId++),
        role: initialMessage.role,
        content: initialMessage.content,
        mode: initialMessage.mode,
        model: initialMessage.model,
        status: "COMPLETE",
        parts: null,
        duration: null,
        createdAt: now,
        sessionId: id,
      });
    }

    const session: MockSession = {
      id,
      title: data.title,
      cwd: data.cwd ?? null,
      userId: "mock-user",
      createdAt: now,
      messages,
    };

    sessions.push(session);

    return c.json(session, 201);
  });

export default app;
