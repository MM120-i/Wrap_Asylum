import open from "open";
import { apiClient } from "./api-client";
import { getErrorMessage } from "./http-errors";

const openBillingUrl = async (rawUrl: unknown) => {
  if (typeof rawUrl !== "string" || !/^https?:\/\//.test(rawUrl)) {
    throw new Error("Server returned an invalid billing URL");
  }

  await open(rawUrl);
};

export const openUpgradeCheckout = async () => {
  const response = await apiClient.billing.checkout.$post();

  if (response.ok) {
    const data = (await response.json()) as { url: unknown };
    await openBillingUrl(data.url);
    return;
  }

  throw new Error(await getErrorMessage(response));
};

export const openBillingPortal = async () => {
  const response = await apiClient.billing.portal.$post();

  if (response.ok) {
    const data = (await response.json()) as { url: unknown };
    await openBillingUrl(data.url);
    return;
  }

  throw new Error(await getErrorMessage(response));
};
