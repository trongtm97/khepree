import { requireSession } from "@khepree/auth/session";
import { getEnv } from "@khepree/config";
import { Card, CardTitle } from "@khepree/ui";
import { notFound } from "next/navigation";
import { ProviderCheckoutForm } from "@/components/provider-checkout-form";
import { getCommerce } from "@/lib/commerce";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function CheckoutPayPage({
  params,
}: {
  params: Promise<{ orderPublicId: string }>;
}) {
  const session = await requireSession();
  const { orderPublicId } = await params;
  const locale = await accountLocaleFromCookies(session.locale);
  const copy = accountMessages(locale).checkout;
  const env = getEnv();
  const accountUrl = env.ACCOUNT_URL || "http://localhost:3001";
  const commerce = getCommerce();

  const rebuilt = await commerce.rebuildCheckoutAction({
    orderPublicId,
    owner: { type: "user", userId: session.user.id },
    successUrl: `${accountUrl}/billing?checkout=processing`,
    cancelUrl: `${accountUrl}/checkout?cancelled=1`,
    errorUrl: `${accountUrl}/checkout?error=payment`,
  });
  if (!rebuilt || rebuilt.checkoutAction.mode !== "form_post") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">{copy.redirecting}</p>
      </header>
      <Card>
        <CardTitle>{copy.sepaySafe}</CardTitle>
        <p className="mt-2 text-sm text-khepree-slate/70">{copy.qrHint}</p>
        <div className="mt-6">
          <ProviderCheckoutForm
            action={rebuilt.checkoutAction.action}
            fields={rebuilt.checkoutAction.fields}
            submitLabel={copy.continue}
          />
        </div>
      </Card>
    </div>
  );
}
