import { requireSession } from "@khepree/auth/session";
import { formatBillingInterval, formatPriceAmount } from "@khepree/catalog";
import { Alert, Card, CardTitle, EmptyState } from "@khepree/ui";
import type { Metadata } from "next";
import { getCommerce } from "@/lib/commerce";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Billing" };

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const billing = await getCommerce().getBillingAccount({
    type: "user",
    userId: session.user.id,
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Orders, payments, and subscriptions for your account. Nothing here is placeholder data.
        </p>
      </header>

      {params.checkout === "processing" ? (
        <Alert variant="info" title="Confirming payment">
          We are waiting for the payment provider. Access is not granted from this redirect — only a verified webhook confirms the order.
        </Alert>
      ) : null}
      {params.checkout === "failed" ? (
        <Alert variant="warning" title="Payment failed">
          The provider reported a failed payment. The order is not paid.
        </Alert>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Orders</h2>
        {billing.orders.length === 0 ? (
          <EmptyState title="No orders" description="Purchases you complete will show up here." />
        ) : (
          <div className="space-y-3">
            {billing.orders.map((order) => {
              const item = order.items[0];
              return (
                <Card key={order.publicId}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base">{item?.productNameSnapshot ?? order.publicId}</CardTitle>
                    <span className="text-sm capitalize text-khepree-slate/70">{statusLabel(order.status)}</span>
                  </div>
                  <p className="mt-2 text-sm text-khepree-slate/70">
                    {item?.planNameSnapshot}
                    {item?.billingIntervalSnapshot
                      ? ` ${formatBillingInterval(item.billingIntervalSnapshot, "en")}`
                      : null}
                  </p>
                  <p className="mt-3 font-medium">
                    {formatPriceAmount(order.totalMinor, order.currency, "en")}
                  </p>
                  <p className="mt-1 text-xs text-khepree-slate/60">{order.publicId}</p>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Payments</h2>
        {billing.payments.length === 0 ? (
          <EmptyState title="No payments" description="Provider-confirmed payments will list here." />
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-khepree-mist">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-khepree-mist/40 text-khepree-slate/70">
                <tr>
                  <th className="px-4 py-2 font-medium">Payment</th>
                  <th className="px-4 py-2 font-medium">Provider</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {billing.payments.map((payment) => (
                  <tr key={payment.publicId} className="border-t border-khepree-mist">
                    <td className="px-4 py-2 font-mono text-xs">{payment.publicId}</td>
                    <td className="px-4 py-2">{payment.provider}</td>
                    <td className="px-4 py-2 capitalize">{statusLabel(payment.status)}</td>
                    <td className="px-4 py-2">
                      {formatPriceAmount(payment.amountMinor, payment.currency, "en")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Subscriptions</h2>
        {billing.subscriptions.length === 0 ? (
          <EmptyState
            title="No subscriptions"
            description="Recurring plans create a subscription after the payment webhook succeeds."
          />
        ) : (
          <div className="space-y-3">
            {billing.subscriptions.map((subscription) => (
              <Card key={subscription.publicId}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{subscription.publicId}</CardTitle>
                  <span className="text-sm capitalize text-khepree-slate/70">
                    {statusLabel(subscription.status)}
                  </span>
                </div>
                {subscription.currentPeriodEnd ? (
                  <p className="mt-2 text-sm text-khepree-slate/70">
                    Current period ends {subscription.currentPeriodEnd.toISOString().slice(0, 10)}
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
