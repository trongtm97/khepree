"use server";

import { requireSession } from "@khepree/auth/session";
import { MOCK_SIGNATURE_HEADER, signMockWebhook } from "@khepree/commerce";
import { getEnv } from "@khepree/config";
import { redirect } from "next/navigation";
import { getCommerce } from "@/lib/commerce";

export async function completeMockPayment(formData: FormData) {
  const session = await requireSession();
  const orderPublicId = String(formData.get("orderPublicId") ?? "");
  const outcome = formData.get("outcome") === "failed" ? "failed" : "succeeded";
  if (!orderPublicId) redirect("/billing");

  const commerce = getCommerce();
  const checkout = await commerce.getCheckoutSession(orderPublicId, {
    type: "user",
    userId: session.user.id,
  });
  const payment = checkout?.payments.find((row) => row.status === "pending") ?? checkout?.payments[0];
  if (!checkout || !payment?.providerPaymentId) {
    redirect("/billing?checkout=missing");
  }

  const env = getEnv();
  if (env.NODE_ENV === "production") {
    redirect("/billing?checkout=unavailable");
  }

  const secret =
    env.MOCK_PAYMENT_WEBHOOK_SECRET && !env.MOCK_PAYMENT_WEBHOOK_SECRET.includes("CHANGE_ME")
      ? env.MOCK_PAYMENT_WEBHOOK_SECRET
      : "dev-mock-webhook-secret";

  const rawBody = JSON.stringify({
    id: `evt_${crypto.randomUUID()}`,
    type: outcome === "failed" ? "payment.failed" : "payment.succeeded",
    data: {
      providerPaymentId: payment.providerPaymentId,
      amountMinor: payment.amountMinor.toString(),
      currency: payment.currency,
    },
  });

  await commerce.processWebhook({
    providerId: "mock",
    headers: { [MOCK_SIGNATURE_HEADER]: signMockWebhook(secret, rawBody) },
    rawBody,
  });

  redirect(outcome === "failed" ? "/billing?checkout=failed" : "/billing?checkout=processing");
}
