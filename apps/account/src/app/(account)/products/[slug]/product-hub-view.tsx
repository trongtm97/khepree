import { Badge, Button, Card, CardDescription, CardTitle, EmptyState, buttonClassName } from "@khepree/ui";
import Link from "next/link";
import type { AccountProductHubView } from "@/lib/account-product-hub";
import type { AccountMessages } from "@/lib/messages";
import { downloadReleaseAction } from "./actions";

function entitlementStatusLabel(
  view: AccountProductHubView,
  copy: AccountMessages["products"]["detail"],
): string {
  if (view.entitlementActive) return copy.active;
  const status = view.entitlement?.entitlement.status;
  if (status === "expired") return copy.expired;
  if (status === "suspended") return copy.suspended;
  return copy.inactive;
}

function devicesUsedLabel(used: number, max: number, template: string): string {
  return template.replace("{used}", String(used)).replace("{max}", String(max));
}

export function ProductHubPage({
  view,
  copy,
}: {
  view: AccountProductHubView;
  copy: AccountMessages;
}) {
  const detail = copy.products.detail;
  const iconUrl = view.product.icon?.url;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start gap-4">
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconUrl}
            alt=""
            className="h-14 w-14 rounded-[var(--radius-control)] border border-khepree-mist object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-control)] border border-khepree-mist bg-khepree-mist text-lg font-semibold text-khepree-slate/60">
            {view.product.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link
            href="/products"
            className="text-sm font-medium text-khepree-teal hover:underline"
          >
            ← {detail.back}
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{view.product.name}</h1>
          {view.product.shortDescription ? (
            <p className="mt-1 text-sm text-khepree-slate/70">{view.product.shortDescription}</p>
          ) : null}
        </div>
        <Badge variant={view.entitlementActive ? "teal" : "outline"}>
          {entitlementStatusLabel(view, detail)}
        </Badge>
      </header>

      {view.desktopReturn ? (
        <Card className="border-khepree-teal/30 bg-khepree-teal/5">
          <CardDescription>
            <a
              href={view.desktopReturn.returnUri}
              className="font-medium text-khepree-teal hover:underline"
            >
              {detail.returnToApp.replace("{app}", view.desktopReturn.displayName)}
            </a>
          </CardDescription>
        </Card>
      ) : null}

      {view.pendingPayment && view.pendingCheckoutHref ? (
        <Card>
          <CardTitle className="text-base">{detail.pendingPayment}</CardTitle>
          <CardDescription className="mt-2">
            <Link href={view.pendingCheckoutHref} className="font-medium text-khepree-teal hover:underline">
              {detail.completeCheckout}
            </Link>
          </CardDescription>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle className="text-base">{detail.access}</CardTitle>
          <dl className="mt-4 space-y-2 text-sm text-khepree-slate/80">
            <div className="flex justify-between gap-4">
              <dt>{detail.plan}</dt>
              <dd className="font-medium">{view.planLabel ?? "—"}</dd>
            </div>
            {view.accessTermLabel ? (
              <div className="flex justify-between gap-4">
                <dt>{detail.accessTerm}</dt>
                <dd className="font-medium">{view.accessTermLabel}</dd>
              </div>
            ) : null}
            {view.hasActiveSubscription ? (
              <div className="flex justify-between gap-4">
                <dt>{detail.renewal}</dt>
                <dd className="font-medium">{detail.hasSubscription}</dd>
              </div>
            ) : view.entitlementActive ? (
              <div className="text-khepree-slate/60">{detail.noRenewal}</div>
            ) : null}
          </dl>
        </Card>

        <Card>
          <CardTitle className="text-base">{detail.devices}</CardTitle>
          {view.deviceUsage ? (
            <CardDescription className="mt-2">
              {devicesUsedLabel(
                view.deviceUsage.slotsUsed,
                view.deviceUsage.slotsMax,
                detail.devicesUsed,
              )}
            </CardDescription>
          ) : (
            <CardDescription className="mt-2">—</CardDescription>
          )}
          {view.allowedActions.manageDevices ? (
            <Link
              href={view.manageDevicesUrl}
              className="mt-4 inline-flex text-sm font-medium text-khepree-teal hover:underline"
            >
              {detail.manageDevices}
            </Link>
          ) : null}
        </Card>
      </div>

      {view.features.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{detail.features}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {view.features.map((feature) => (
              <li
                key={feature.key}
                className="rounded-[var(--radius-control)] border border-khepree-mist bg-khepree-white px-3 py-2 text-sm"
              >
                <span className="text-khepree-slate/70">{feature.key}</span>
                <span className="ml-2 font-medium">{feature.value}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.releases.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{detail.downloads}</h2>
          <div className="flex flex-wrap gap-3">
            {view.releases.map((release) => (
              <form key={release.releasePublicId} action={downloadReleaseAction}>
                <input type="hidden" name="productSlug" value={view.product.slug} />
                <input type="hidden" name="releasePublicId" value={release.releasePublicId} />
                <Button type="submit" variant="secondary" size="sm">
                  {detail.platformLabels[release.platform] ?? release.platform} · v{release.version}
                </Button>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-3">
        {view.allowedActions.upgrade && view.upgradeCheckoutHref ? (
          <Link href={view.upgradeCheckoutHref} className={buttonClassName({ variant: "primary" })}>
            {detail.upgrade}
          </Link>
        ) : null}
        {view.allowedActions.checkout && view.purchaseCheckoutHref ? (
          <Link href={view.purchaseCheckoutHref} className={buttonClassName({ variant: "primary" })}>
            {detail.purchase}
          </Link>
        ) : null}
        {view.allowedActions.manageBilling ? (
          <Link href={view.billingUrl} className={buttonClassName({ variant: "secondary" })}>
            {detail.manageBilling}
          </Link>
        ) : null}
        <Link
          href={view.marketingProductUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClassName({ variant: "ghost" })}
        >
          {detail.visitProductPage}
        </Link>
      </section>
    </div>
  );
}

export function ProductHubNotFound({ copy }: { copy: AccountMessages }) {
  return (
    <EmptyState
      title={copy.products.detail.notFound}
      description={copy.products.detail.notFoundBody}
    />
  );
}
