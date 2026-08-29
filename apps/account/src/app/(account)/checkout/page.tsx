import { requireSession } from "@khepree/auth/session";
import { createProductService, formatBillingInterval, formatPriceAmount } from "@khepree/catalog";
import { getEnv } from "@khepree/config";
import { Alert, Button, Card, CardDescription, CardTitle } from "@khepree/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { startCheckoutAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout" };

function errorMessage(code: string | undefined): string | null {
  if (code === "terms") return "Please accept the terms to continue.";
  if (code === "missing") return "Choose a plan from pricing to start checkout.";
  if (code === "unavailable") return "That plan is not available for purchase.";
  return null;
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; price?: string; cancelled?: string; error?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const planPublicId = params.plan ?? "";
  const pricePublicId = params.price ?? "";
  const env = getEnv();
  const appUrl = env.APP_URL || "http://localhost:3000";
  const termsUrl = `${appUrl}/en/terms`;

  const offer =
    planPublicId && pricePublicId
      ? await createProductService().getPurchasableOffer(planPublicId, pricePublicId, {
          locale: "en",
        })
      : null;

  const notice = errorMessage(params.error);
  const interval = offer ? formatBillingInterval(offer.price.interval, "en") : null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Review your purchase. Card details are collected by the payment provider — not on this page.
        </p>
      </header>

      {params.cancelled === "1" ? (
        <Alert variant="warning" title="Checkout cancelled">
          Payment was not completed. You can review the order and try again.
        </Alert>
      ) : null}
      {notice ? <Alert variant="error">{notice}</Alert> : null}

      {offer ? (
        <Card>
          <CardTitle>Order review</CardTitle>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-khepree-slate/70">Product</dt>
              <dd className="font-medium">{offer.product.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-khepree-slate/70">Plan</dt>
              <dd className="font-medium">{offer.plan.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-khepree-slate/70">Price</dt>
              <dd className="font-medium">
                {formatPriceAmount(offer.price.amountMinor, offer.price.currency, "en")}
                {interval ? <span className="font-normal text-khepree-slate/70">{interval}</span> : null}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-khepree-slate/70">Currency</dt>
              <dd className="font-medium">{offer.price.currency}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-khepree-slate/70">Billing type</dt>
              <dd className="font-medium capitalize">{offer.plan.billingType.replace("_", " ")}</dd>
            </div>
          </dl>

          <form action={startCheckoutAction} className="mt-6 space-y-4">
            <input type="hidden" name="planPublicId" value={offer.plan.publicId} />
            <input type="hidden" name="pricePublicId" value={offer.price.publicId} />
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="acceptTerms"
                required
                className="mt-0.5 size-4 shrink-0 rounded border-khepree-mist text-khepree-teal"
              />
              <span>
                I agree to the{" "}
                <Link href={termsUrl} className="text-khepree-teal hover:underline">
                  Terms
                </Link>
                .
              </span>
            </label>
            <Button type="submit" className="w-full">
              Continue to payment
            </Button>
          </form>
        </Card>
      ) : (
        <Card>
          <CardTitle>No plan selected</CardTitle>
          <CardDescription>
            Start from a product or pricing page to review a plan before paying.
          </CardDescription>
          <Link
            href={appUrl}
            className="mt-4 inline-flex text-sm font-medium text-khepree-teal hover:underline"
          >
            Back to Khepree
          </Link>
        </Card>
      )}
    </div>
  );
}
