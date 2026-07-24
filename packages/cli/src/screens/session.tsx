import { SessionShell } from "../components/session-shell";
import { z } from "zod";
import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { UserMessage, BotMessage, ErrorMessage } from "../components/messages";
import { useToast } from "../providers/toast";
import { apiClient } from "../lib/api-client";
import { getErrorMessage } from "../lib/http-errors";

import type { InferResponseType } from "hono/client";

type SessionData = InferResponseType<
  (typeof apiClient.sessions)[":id"]["$get"],
  200
>;

const sessionLocationSchema = z.object({
  session: z.custom<SessionData>(
    (val) => val != null && typeof val === "object" && "id" in val,
  ),
});

const ChatMessage = ({ msg }: { msg: SessionData["messages"][number] }) => {
  switch (msg.role) {
    case "USER":
      return <UserMessage message={msg.content} />;
    case "ERROR":
      return <ErrorMessage message={msg.content} />;
    default:
      return <BotMessage content={msg.content} model={msg.model} />;
  }
};

export const Session = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const prefetched = useMemo(() => {
    const parsed = sessionLocationSchema.safeParse(location.state);
    return parsed.success ? parsed.data.session : null;
  }, [location.state]);

  const [session, setSession] = useState<SessionData | null>(prefetched);

  useEffect(() => {
    if (prefetched) {
      return;
    }

    setSession(null);

    if (!id) {
      return;
    }

    let ignore = false;

    const fetchSession = async () => {
      try {
        const res = await apiClient.sessions[":id"].$get({
          param: { id },
        });

        if (ignore) {
          return;
        }

        if (!res.ok) {
          throw new Error(await getErrorMessage(res));
        }

        setSession(await res.json());
      } catch (error) {
        if (ignore) {
          return;
        }

        toast.show({
          variant: "error",
          message:
            error instanceof Error ? error.message : "Failed to load session",
        });

        navigate("/", { replace: true });
      }
    };

    fetchSession();

    return () => {
      ignore = true;
    };
  }, [id, prefetched, toast, navigate]);

  if (!session) {
    return <SessionShell onSubmit={() => {}} inputDisabled loading />;
  }

  return (
    <SessionShell onSubmit={() => {}} inputDisabled>
      {session.messages.map((msg) => (
        <ChatMessage key={msg.id} msg={msg} />
      ))}
    </SessionShell>
  );
};
