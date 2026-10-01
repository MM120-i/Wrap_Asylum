import { createMiddleware } from "hono/factory";
import { getAvaliableCreditBalance } from "../lib/polar";

import type { AuthenticatedEnv } from "./require-auth";

export const requireCreditsBalance = createMiddleware<AuthenticatedEnv>(
  async (c, next) => {
    try {
      const userId = c.get("userId");
      const creditBalance = await getAvaliableCreditBalance(userId);

      if (creditBalance <= 0) {
        return c.json(
          {
            error: "No credits remaining. Run /upgrade to buy more credits.",
          },
          402,
        );
      }

      await next();
    } catch {
      return c.json(
        {
          error: "Unable to verify credits balance right now.",
        },
        503,
      );
    }
  },
);
