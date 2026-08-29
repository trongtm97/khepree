"use server";

import { requireSession } from "@khepree/auth/session";
import { isCommerceError } from "@khepree/commerce";
import { getEnv } from "@khepree/config";
import { redirect } from "next/navigation";
import { getCommerce } from "@/lib/commerce";

export async function startCheckoutAction(formData: FormData) {
  const session = await requireSession();
  if (formData.get("acceptTerms") !== "on") {
    redirect("/checkout?error=terms");
  }

  const planPublicId = String(formData.get("planPublicId") ?? "");
  const pricePublicId = String(formData.get("pricePublicId") ?? "");
  if (!planPublicId || !pricePublicId) {
    redirect("/checkout?error=missing");
  }

  const env = getEnv();
  const accountUrl = env.ACCOUNT_URL || "http://localhost:3001";
  const commerce = getCommerce();

  try {
    const intent = await commerce.createCheckoutIntent({
      owner: { type: "user", userId: session.user.id },
      planPublicId,
      pricePublicId,
      locale: "en",
      successUrl: `${accountUrl}/billing?checkout=processing`,
      cancelUrl: `${accountUrl}/checkout?plan=${encodeURIComponent(planPublicId)}&price=${encodeURIComponent(pricePublicId)}&cancelled=1`,
      actorUserId: session.user.id,
    });
    redirect(intent.checkoutUrl);
  } catch (error) {
    if (isCommerceError(error) && error.code === "NOT_PURCHASABLE") {
      redirect("/checkout?error=unavailable");
    }
    throw error;
  }
}
