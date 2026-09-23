import { createMiddleware } from "hono/factory";
import { authenticateOAuthRequest } from "../lib/auth";

export type AuthenticatedEnv = {
  Variables: {
    userId: string;
  };
};

export const requireAuth = createMiddleware<AuthenticatedEnv>(
  async (ctx, next) => {
    try {
      const auth = await authenticateOAuthRequest(ctx.req.raw);

      if (!("userid" in auth)) {
        if (auth.reason === "unexpected-error") {
          return ctx.json(
            { error: "Authentication service unavailable. Try again later." },
            503,
          );
        }

        return ctx.json(
          { error: "Unauthorized. Run /login to continue." },
          401,
        );
      }

      ctx.set("userId", auth.userid);
      await next();
    } catch {
      return ctx.json({ error: "Unauthorized. Run /login to continue" }, 401);
    }
  },
);
