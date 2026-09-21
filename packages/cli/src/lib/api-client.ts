import { hc } from "hono/client";
import { clearAuth, getAuth } from "./auth";

import type { AppType } from "@warp-asylum/server";

export const apiClient = hc<AppType>(
  process.env.API_URL ?? "http://localhost:3000",
  {
    fetch: async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => {
      const headers = new Headers(init?.headers);
      const auth = getAuth();

      if (auth) {
        headers.set("Authorization", `Bearer ${auth.token}`);
      }

      const response = await fetch(input, { ...init, headers });

      if (response.status === 401) {
        clearAuth();
      }

      return response;
    },
  },
);
