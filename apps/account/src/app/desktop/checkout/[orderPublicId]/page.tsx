import { requireSession } from "@khepree/auth/session";
import { getEnv } from "@khepree/config";
import { notFound, redirect } from "next/navigation";
import { CheckoutFormPostHandoff } from "@/components/checkout-form-post-handoff";
import { getCommerce, getPlatform } from "@/lib/commerce";

export const dynamic = "force-dynamic";

export default async function DesktopCheckoutHandoffPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderPublicId: string }>;
  searchParams: Promise<{ clientId?: string }>;
}) {
  const session = await requireSession();
  const { orderPublicId } = await params;
  const query = await searchParams;
  const env = getEnv();
  const accountUrl = env.ACCOUNT_URL || "http://localhost:3001";
  const commerce = getCommerce();
  const platform = getPlatform();

  const checkoutSession = await commerce.getCheckoutSession(orderPublicId, {
    type: "user",
    userId: session.user.id,
  });
  if (!checkoutSession) notFound();

  if (query.clientId) {
    const client = await platform.desktopAuth.resolveClient(query.clientId).catch(() => null);
    const productId = checkoutSession.items[0]?.productId;
    if (!client || !productId || client.productId !== productId) notFound();
  }

  const rebuilt = await commerce.rebuildCheckoutAction({
    orderPublicId,
    owner: { type: "user", userId: session.user.id },
    successUrl: `${accountUrl}/billing?checkout=processing&source=desktop`,
    cancelUrl: `${accountUrl}/billing?checkout=cancelled&source=desktop`,
    errorUrl: `${accountUrl}/billing?checkout=failed&source=desktop`,
  });
  if (!rebuilt) notFound();

  const action = rebuilt.checkoutAction;
  if (action.mode === "redirect") {
    redirect(action.url);
  }
  if (action.mode === "form_post") {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-sm text-khepree-slate/70">
        <p>Redirecting to secure payment…</p>
        <CheckoutFormPostHandoff action={action.action} fields={action.fields} />
      </div>
    );
  }

  redirect(`/checkout/pay/${orderPublicId}`);
}
