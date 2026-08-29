import { requireSession } from "@khepree/auth/session";
import { formatPriceAmount } from "@khepree/catalog";
import { Alert, Button, Card, CardTitle } from "@khepree/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCommerce } from "@/lib/commerce";
import { completeMockPayment } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mock payment" };

export default async function MockCheckoutPage({
  params,
}: {
  params: Promise<{ orderPublicId: string }>;
}) {
  const session = await requireSession();
  if (process.env.NODE_ENV === "production") notFound();
  const { orderPublicId } = await params;
  const checkout = await getCommerce().getCheckoutSession(orderPublicId, {
    type: "user",
    userId: session.user.id,
  });
  if (!checkout) notFound();

  const item = checkout.items[0];
  const payment = checkout.payments.find((row) => row.status === "pending") ?? checkout.payments[0];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Mock payment provider</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Development adapter only. Completing payment sends a signed webhook — this page does not grant access by itself.
        </p>
      </header>

      <Alert variant="info" title="Not a live processor">
        No cards are collected. Use the buttons below to simulate provider success or failure.
      </Alert>

      <Card>
        <CardTitle>{item?.productNameSnapshot ?? "Order"}</CardTitle>
        <p className="mt-2 text-sm text-khepree-slate/70">{item?.planNameSnapshot}</p>
        <p className="mt-4 text-2xl font-semibold">
          {formatPriceAmount(checkout.order.totalMinor, checkout.order.currency, "en")}
        </p>
        <p className="mt-1 text-sm text-khepree-slate/70">Status: {checkout.order.status.replaceAll("_", " ")}</p>

        {payment?.status === "pending" ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <form action={completeMockPayment} className="flex-1">
              <input type="hidden" name="orderPublicId" value={orderPublicId} />
              <input type="hidden" name="outcome" value="succeeded" />
              <Button type="submit" className="w-full">
                Simulate successful payment
              </Button>
            </form>
            <form action={completeMockPayment} className="flex-1">
              <input type="hidden" name="orderPublicId" value={orderPublicId} />
              <input type="hidden" name="outcome" value="failed" />
              <Button type="submit" variant="secondary" className="w-full">
                Simulate failure
              </Button>
            </form>
          </div>
        ) : (
          <p className="mt-6 text-sm">This payment is already {payment?.status ?? "closed"}.</p>
        )}
      </Card>
    </div>
  );
}
