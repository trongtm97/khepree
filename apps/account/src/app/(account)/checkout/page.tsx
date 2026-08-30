import { requireSession } from "@khepree/auth/session";
import { createProductService, formatBillingInterval, formatPriceAmount } from "@khepree/catalog";
import { DEFAULT_CURRENCY, DEFAULT_MARKET_REGION, getEnv } from "@khepree/config";
import { Alert, Button, Card, CardDescription, CardTitle } from "@khepree/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { LegalConsentNotice } from "@/components/legal-consent-notice";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";
import { startCheckoutAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thanh toán" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; price?: string; cancelled?: string; error?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const locale = await accountLocaleFromCookies(session.locale);
  const copy = accountMessages(locale).checkout;
  const planPublicId = params.plan ?? "";
  const pricePublicId = params.price ?? "";
  const env = getEnv();
  const appUrl = env.APP_URL || "http://localhost:3000";

  const offer =
    planPublicId && pricePublicId
      ? await createProductService().getPurchasableOffer(planPublicId, pricePublicId, {
          locale,
          market: { currency: DEFAULT_CURRENCY, region: DEFAULT_MARKET_REGION },
        })
      : null;

  const notice =
    params.error === "missing"
        ? copy.missing
        : params.error === "unavailable"
          ? copy.unavailable
          : params.error === "payment"
            ? copy.cancelled
            : null;
  const interval = offer ? formatBillingInterval(offer.price.interval, locale) : null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">{copy.sepaySafe}</p>
      </header>

      {params.cancelled === "1" ? (
        <Alert variant="warning" title={copy.cancelled}>
          {copy.cancelledBody}
        </Alert>
      ) : null}
      {notice ? <Alert variant="error">{notice}</Alert> : null}

      {offer ? (
        <Card>
          <CardTitle>{copy.review}</CardTitle>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-khepree-slate/70">{copy.product}</dt>
              <dd className="font-medium">{offer.product.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-khepree-slate/70">{copy.plan}</dt>
              <dd className="font-medium">{offer.plan.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-khepree-slate/70">{copy.total}</dt>
              <dd className="font-medium">
                {formatPriceAmount(offer.price.amountMinor, offer.price.currency, locale)}
                {interval ? <span className="font-normal text-khepree-slate/70">{interval}</span> : null}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-khepree-slate/70">{copy.method}</dt>
              <dd className="font-medium">{copy.qrHint}</dd>
            </div>
          </dl>

          <form action={startCheckoutAction} className="mt-6 space-y-4">
            <input type="hidden" name="planPublicId" value={offer.plan.publicId} />
            <input type="hidden" name="pricePublicId" value={offer.price.publicId} />
            <LegalConsentNotice locale={locale} copy={copy} variant="terms-only" />
            <Button type="submit" className="w-full">
              {copy.continue}
            </Button>
          </form>
        </Card>
      ) : (
        <Card>
          <CardTitle>{copy.none}</CardTitle>
          <CardDescription>{copy.noneBody}</CardDescription>
          <Link
            href={appUrl}
            className="mt-4 inline-flex text-sm font-medium text-khepree-teal hover:underline"
          >
            {copy.back}
          </Link>
        </Card>
      )}
    </div>
  );
}
