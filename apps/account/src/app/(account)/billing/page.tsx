import { requireSession } from "@khepree/auth/session";
import { formatBillingInterval, formatPriceAmount } from "@khepree/catalog";
import { canTransitionOrder } from "@khepree/commerce";
import { Alert, Card, CardTitle, EmptyState } from "@khepree/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { ConfirmingPaymentPoll } from "@/components/confirming-payment-poll";
import { DesktopReturnLink } from "@/components/desktop-return-link";
import { getCommerce } from "@/lib/commerce";
import { resolveDesktopReturnLink } from "@/lib/desktop-return";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thanh toán" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; source?: string; clientId?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const locale = await accountLocaleFromCookies(session.locale);
  const copy = accountMessages(locale).billing;
  const messages = accountMessages(locale);
  const billing = await getCommerce().getBillingAccount({
    type: "user",
    userId: session.user.id,
  });
  const latestPaid = billing.orders.some((order) => order.status === "paid");
  const desktopReturn =
    params.source === "desktop" ? await resolveDesktopReturnLink(params.clientId) : null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">{copy.intro}</p>
        {desktopReturn ? (
          <div className="mt-3">
            <DesktopReturnLink {...desktopReturn} copy={messages} />
          </div>
        ) : null}
      </header>

      {params.checkout === "processing" && !latestPaid ? (
        <Alert variant="info" title={copy.confirming}>
          {copy.confirmingBody}
          <ConfirmingPaymentPoll />
        </Alert>
      ) : null}
      {params.checkout === "processing" && latestPaid ? (
        <Alert variant="success" title={copy.success}>
          {copy.viewOrder}
        </Alert>
      ) : null}
      {params.checkout === "failed" ? (
        <Alert variant="warning" title={copy.incomplete}>
          {copy.failed}{" "}
          <Link href="/checkout" className="font-medium text-khepree-teal hover:underline">
            {copy.retry}
          </Link>
        </Alert>
      ) : null}
      {params.checkout === "cancelled" ? (
        <Alert variant="warning" title={copy.statuses.cancelled}>
          {messages.checkout.cancelledBody}
        </Alert>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{copy.orders}</h2>
        {billing.orders.length === 0 ? (
          <EmptyState title={copy.noOrders} description={copy.intro} />
        ) : (
          <div className="space-y-3">
            {billing.orders.map((order) => {
              const item = order.items[0];
              const payment = order.payments[0];
              const canCancel = canTransitionOrder(order.status, "cancelled");
              return (
                <Card key={order.publicId}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base">{item?.productNameSnapshot ?? order.publicId}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-khepree-slate/70">
                        {copy.statuses[order.status] ?? order.status}
                      </span>
                      {canCancel ? (
                        <CancelOrderButton
                          orderPublicId={order.publicId}
                          label={copy.cancelOrder}
                          cancellingLabel={copy.cancellingOrder}
                          confirmMessage={copy.cancelOrderConfirm}
                        />
                      ) : null}
                    </div>
                  </div>
                  <dl className="mt-3 space-y-1 text-sm text-khepree-slate/80">
                    <div>
                      {copy.orderId}: <span className="font-mono text-xs">{order.publicId}</span>
                    </div>
                    <div>
                      {copy.plan}: {item?.planNameSnapshot}
                      {item?.billingIntervalSnapshot
                        ? ` ${formatBillingInterval(item.billingIntervalSnapshot, locale)}`
                        : null}
                    </div>
                    <div>
                      {copy.amount}: {formatPriceAmount(order.totalMinor, order.currency, locale)}
                    </div>
                    <div>
                      {copy.method}: {payment?.method ?? payment?.provider ?? "—"}
                    </div>
                    <div>
                      {copy.paidAt}: {payment?.updatedAt.toISOString().slice(0, 10)}
                    </div>
                  </dl>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{copy.payments}</h2>
        {billing.payments.length === 0 ? (
          <EmptyState title={copy.noPayments} description={copy.intro} />
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-khepree-mist">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-khepree-mist/40 text-khepree-slate/70">
                <tr>
                  <th className="px-4 py-2 font-medium">{copy.orderId}</th>
                  <th className="px-4 py-2 font-medium">{copy.method}</th>
                  <th className="px-4 py-2 font-medium">{copy.status}</th>
                  <th className="px-4 py-2 font-medium">{copy.amount}</th>
                  <th className="px-4 py-2 font-medium">{copy.paidAt}</th>
                </tr>
              </thead>
              <tbody>
                {billing.payments.map((payment) => (
                  <tr key={payment.publicId} className="border-t border-khepree-mist">
                    <td className="px-4 py-2 font-mono text-xs">{payment.publicId}</td>
                    <td className="px-4 py-2">{payment.method ?? payment.provider}</td>
                    <td className="px-4 py-2">{copy.statuses[payment.status] ?? payment.status}</td>
                    <td className="px-4 py-2">
                      {formatPriceAmount(payment.amountMinor, payment.currency, locale)}
                    </td>
                    <td className="px-4 py-2">{payment.updatedAt.toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{copy.subscriptions}</h2>
        {billing.subscriptions.length === 0 ? (
          <EmptyState title={copy.noSubscriptions} description={copy.noSubscriptions} />
        ) : (
          <div className="space-y-3">
            {billing.subscriptions.map((subscription) => (
              <Card key={subscription.publicId}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">{subscription.publicId}</CardTitle>
                  <span className="text-sm text-khepree-slate/70">
                    {copy.statuses[subscription.status] ?? subscription.status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
