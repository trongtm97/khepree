"use server";

import { requireSession } from "@khepree/auth/session";
import { isCommerceError } from "@khepree/commerce";
import { DEFAULT_LOCALE } from "@khepree/config";
import { getEnv } from "@khepree/config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCommerce } from "@/lib/commerce";
import { resolveAccountLocale } from "@/lib/locale";

export async function startCheckoutAction(formData: FormData) {
  const session = await requireSession();

  const planPublicId = String(formData.get("planPublicId") ?? "");
  const pricePublicId = String(formData.get("pricePublicId") ?? "");
  if (!planPublicId || !pricePublicId) {
    redirect("/checkout?error=missing");
  }

  const env = getEnv();
  const accountUrl = env.ACCOUNT_URL || "http://localhost:3001";
  const commerce = getCommerce();
  const cookieStore = await cookies();
  const locale = resolveAccountLocale({
    userLocale: session.locale,
    cookieLocale: cookieStore.get("khepree_locale")?.value,
  });

  try {
    const intent = await commerce.createCheckoutIntent({
      owner: { type: "user", userId: session.user.id },
      planPublicId,
      pricePublicId,
      locale: locale ?? DEFAULT_LOCALE,
      successUrl: `${accountUrl}/billing?checkout=processing`,
      cancelUrl: `${accountUrl}/checkout?plan=${encodeURIComponent(planPublicId)}&price=${encodeURIComponent(pricePublicId)}&cancelled=1`,
      errorUrl: `${accountUrl}/checkout?plan=${encodeURIComponent(planPublicId)}&price=${encodeURIComponent(pricePublicId)}&error=payment`,
      actorUserId: session.user.id,
    });
    if (intent.checkoutAction.mode === "redirect") {
      redirect(intent.checkoutAction.url);
    }
    redirect(`/checkout/pay/${intent.orderPublicId}`);
  } catch (error) {
    if (isCommerceError(error) && error.code === "NOT_PURCHASABLE") {
      redirect("/checkout?error=unavailable");
    }
    throw error;
  }
}
