import { Hono } from "hono";
import { createCheckoutUrl, createCustomerPolarUrl } from "../lib/polar";

import type { AuthenticatedEnv } from "../middleware/require-auth";

const app = new Hono<AuthenticatedEnv>()
  .post("/checkout", async (c) => {
    const userId = c.get("userId");

    try {
      const checkout = await createCheckoutUrl({
        customerExternalId: userId,
        requestUrl: c.req.url,
      });

      return c.json({ url: checkout.url });
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Unable to open checkout",
        },
        503,
      );
    }
  })
  .post("/portal", async (c) => {
    const userId = c.get("userId");

    try {
      return c.json({
        url: await createCustomerPolarUrl({
          customerExternalId: userId,
          requestUrl: c.req.url,
        }),
      });
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unable to open billing portal",
        },
        503,
      );
    }
  })
  .get("/success", (c) =>
    c.text("Done. You can close this tab and return to warpasylum"),
  );

export default app;
