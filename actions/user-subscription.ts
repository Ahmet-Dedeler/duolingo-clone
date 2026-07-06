"use server";

export const createStripeUrl = async () => {
  throw new Error("Subscriptions are disabled in local mode.");
};
