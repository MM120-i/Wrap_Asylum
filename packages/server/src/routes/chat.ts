import { Hono } from "hono";
import { z } from "zod";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { streamText as aiStreamText } from "ai";
import { db } from "@warp-asylum/database";
import { Mode, MessageStatus } from "@warp-asylum/database/enums";
import { type ChatStreamEvent } from "@warp-asylum/shared";
import { isSupportedChatModel, resolvedChatModel } from "../lib/models";

const submitSchema = z.object({
  content: z.string(),
  mode: z.enum(Mode),
  model: z.string().refine(isSupportedChatModel, "Unsupported model"),
});

const submitValidator = zValidator("json", submitSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

const activeResumeSessionIds = new Set<string>();

const buildConversationHistory = (
  messages: {
    role: "USER" | "ASSISTANT" | "ERROR";
    content: string;
    status: MessageStatus;
  }[],
) => {
  return messages.flatMap((m) => {
    if (m.role === "ERROR") {
      return [];
    }

    if (m.role === "ASSISTANT" && m.content.length === 0) {
      return [];
    }

    return [
      {
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      },
    ];
  });
};

const getResumeUserMessage = (
  messages: {
    role: "USER" | "ASSISTANT" | "ERROR";
    model: string;
    mode: Mode;
  }[],
) => {
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage || lastMessage.role !== "USER") {
    return null;
  }

  return lastMessage;
};

type StreamParams = {
  sessionId: string;
  model: string;
  history: {
    role: "user" | "assistant";
    content: string;
  }[];
  mode: Mode;
  abortController: AbortController;
};

const streamAIResponse = async (
  stream: Parameters<Parameters<typeof streamSSE>[1]>[0],
  params: StreamParams,
) => {
  const { sessionId, model, history, mode, abortController } = params;
  const startTime = Date.now();
  const resolveModel = resolvedChatModel(model);
  let fullText = "";

  const persistInterruptedMessage = async () => {
    if (fullText.length === 0) {
      return;
    }

    const elapsedMs = Date.now() - startTime;

    await db.message.create({
      data: {
        sessionId,
        role: "ASSISTANT",
        status: MessageStatus.COMPLETE,
        model,
        content: fullText,
        mode,
        duration: Math.round(elapsedMs / 1000),
      },
    });
  };

  try {
    const result = aiStreamText({
      model: resolveModel.model,
      messages: history,
      abortSignal: abortController.signal,
    });

    for await (const part of result.stream) {
      if (stream.aborted) {
        break;
      }

      if (part.type === "text-delta") {
        fullText += part.text;
        const event: ChatStreamEvent = { type: "text-delta", text: part.text };

        await stream.writeSSE({
          event: "text-delta",
          data: JSON.stringify(event),
        });
      }

      if (part.type === "error") {
        throw part.error;
      }
    }

    if (stream.aborted || abortController.signal.aborted) {
      await persistInterruptedMessage();
      return;
    }

    const elapsedMs = Date.now() - startTime;

    const assistantMessage = await db.message.create({
      data: {
        sessionId,
        role: "ASSISTANT",
        status: MessageStatus.COMPLETE,
        model,
        content: fullText,
        mode,
        duration: Math.round(elapsedMs / 1000),
      },
    });

    const doneEvent: ChatStreamEvent = {
      type: "done",
      messageId: assistantMessage.id,
      durationMs: elapsedMs,
    };

    await stream.writeSSE({ event: "done", data: JSON.stringify(doneEvent) });
  } catch (error) {
    if (abortController.signal.aborted) {
      await persistInterruptedMessage();
      return;
    }

    const message = error instanceof Error ? error.message : String(error);

    await db.message.create({
      data: {
        sessionId,
        role: "ERROR",
        status: MessageStatus.COMPLETE,
        model,
        content: message,
        mode,
      },
    });

    const errorEvent: ChatStreamEvent = { type: "error", message };
    await stream.writeSSE({ event: "error", data: JSON.stringify(errorEvent) });
  }
};

const app = new Hono()
  .post("/:sessionId/resume", async (c) => {
    const sessionId = c.req.param("sessionId");

    const session = await db.session.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const resumeableMessage = getResumeUserMessage(session.messages);

    if (!resumeableMessage) {
      return c.json(
        { error: "Session has no pending user message to resume" },
        409,
      );
    }

    if (!isSupportedChatModel(resumeableMessage.model)) {
      return c.json(
        {
          error: `Session uses unsupported model: ${resumeableMessage.model}`,
        },
        409,
      );
    }

    if (activeResumeSessionIds.has(sessionId)) {
      return c.json(
        {
          error: "Session already has an active resume",
        },
        409,
      );
    }

    activeResumeSessionIds.add(sessionId);

    const history = buildConversationHistory(session.messages);
    const abortController = new AbortController();

    try {
      return streamSSE(
        c,
        async (stream) => {
          stream.onAbort(() => {
            abortController.abort();
          });

          try {
            await streamAIResponse(stream, {
              sessionId,
              model: resumeableMessage.model,
              history,
              mode: resumeableMessage.mode,
              abortController,
            });
          } finally {
            activeResumeSessionIds.delete(sessionId);
          }
        },

        async (error, stream) => {
          activeResumeSessionIds.delete(sessionId);
          const message =
            error instanceof Error ? error.message : String(error);
          const errorEvent: ChatStreamEvent = { type: "error", message };

          await stream.writeSSE({
            event: "error",
            data: JSON.stringify(errorEvent),
          });
        },
      );
    } catch (error) {
      activeResumeSessionIds.delete(sessionId);
      throw error;
    }
  })

  // ================================= sessionId =================================
  .post("/:sessionId", submitValidator, async (c) => {
    const sessionId = c.req.param("sessionId");
    const session = await db.session.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const data = c.req.valid("json");

    await db.message.create({
      data: {
        sessionId,
        role: "USER",
        status: MessageStatus.COMPLETE,
        model: data.model,
        content: data.content,
        mode: data.mode,
      },
    });

    const history = buildConversationHistory([
      ...session.messages,
      {
        role: "USER" as const,
        content: data.content,
        status: MessageStatus.COMPLETE,
      },
    ]);

    const abortController = new AbortController();

    return streamSSE(
      c,
      async (stream) => {
        stream.onAbort(() => {
          abortController.abort();
        });

        await streamAIResponse(stream, {
          sessionId,
          model: data.model,
          history,
          mode: data.mode,
          abortController,
        });
      },
      async (error, stream) => {
        const message = error instanceof Error ? error.message : String(error);
        const errorEvent: ChatStreamEvent = { type: "error", message };
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify(errorEvent),
        });
      },
    );
  });

export default app;
