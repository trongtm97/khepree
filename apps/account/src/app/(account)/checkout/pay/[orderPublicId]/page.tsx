import { requireSession } from "@khepree/auth/session";
import { getEnv } from "@khepree/config";
import { Card, CardTitle } from "@khepree/ui";
import { notFound } from "next/navigation";
import { SePayQrCheckoutPanel } from "@/components/sepay-qr-checkout-panel";
import { getCommerce } from "@/lib/commerce";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";
import { formatPriceAmount } from "@khepree/catalog";

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
  if (!rebuilt || rebuilt.checkoutAction.mode !== "qr_display") {
    notFound();
  }

  const action = rebuilt.checkoutAction;
  const sessionData = await commerce.getCheckoutSession(orderPublicId, {
    type: "user",
    userId: session.user.id,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">{copy.qrPayHint}</p>
      </header>
      <Card>
        <CardTitle>{copy.sepaySafe}</CardTitle>
        <div className="mt-6">
          <SePayQrCheckoutPanel
            orderPublicId={orderPublicId}
            initialStatus={sessionData?.order.status ?? "pending_payment"}
            qrUrl={action.qrUrl}
            bankCode={action.bankCode}
            accountNumber={action.accountNumber}
            accountName={action.accountName}
            transferContent={action.transferContent}
            amountLabel={formatPriceAmount(action.amountMinor, action.currency, locale)}
            copy={{
              qrTitle: copy.qrTitle,
              qrHint: copy.qrScanHint,
              bank: copy.bank,
              account: copy.account,
              holder: copy.holder,
              amount: copy.total,
              content: copy.transferContent,
              copy: copy.copy,
              copied: copy.copied,
              copyAll: copy.copyAll,
              copiedAll: copy.copiedAll,
              checkPayment: copy.checkPayment,
              checking: copy.checking,
              waiting: copy.waiting,
              paid: copy.paidRedirect,
              expired: copy.cancelled,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
