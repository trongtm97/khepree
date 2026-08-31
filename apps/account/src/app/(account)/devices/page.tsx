import { requireSession } from "@khepree/auth/session";
import { Badge, Button, Card, CardDescription, CardTitle, EmptyState } from "@khepree/ui";
import type { Metadata } from "next";
import { getPlatform } from "@/lib/commerce";
import { removeDeviceAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Devices" };

function formatUtc(date: Date): string {
  return date.toISOString().slice(0, 16).replace("T", " ");
}

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; removed?: string; currentDevice?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const currentDevice = params.currentDevice?.trim() || undefined;
  const view = await getPlatform().licensing.listManagedDevices(
    { type: "USER", id: session.user.id },
    { currentDevicePublicId: currentDevice },
  );
  const hasDevices = view.products.some((product) => product.devices.length > 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Installations registered against your products. Hardware fingerprints are never shown.
        </p>
      </header>

      {params.removed === "1" ? (
        <p className="text-sm text-khepree-teal">Device removed. The slot is available for a new installation.</p>
      ) : null}

      {params.error === "cooldown" ? (
        <p className="text-sm text-khepree-slate/80">
          Device removal is cooling down. Try again later.
        </p>
      ) : null}

      {params.error === "transfer-limit" ? (
        <p className="text-sm text-khepree-slate/80">
          You have reached the self-service device transfer limit for your plan. Contact support if you need help.
        </p>
      ) : null}

      {!hasDevices ? (
        <EmptyState
          title="No devices registered"
          description="Activating a product from the desktop app will list the installation here."
        />
      ) : (
        <div className="space-y-8">
          {view.products.map((product) =>
            product.devices.length === 0 ? null : (
              <section key={product.productId} className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">
                    {product.productSlug ?? "Product"}
                    {product.planSlug ? (
                      <span className="ml-2 text-sm font-normal text-khepree-slate/60">
                        {product.planSlug}
                      </span>
                    ) : null}
                  </h2>
                  <p className="text-sm text-khepree-slate/70">
                    {product.slotsUsed} / {product.slotsMax} device slots used
                  </p>
                </div>
                <div className="space-y-3">
                  {product.devices.map((device) => (
                    <Card
                      key={`${product.productId}-${device.devicePublicId}`}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                          {device.name ?? device.devicePublicId}
                          {device.isCurrent ? <Badge variant="teal">This device</Badge> : null}
                        </CardTitle>
                        <CardDescription className="mt-1 space-y-0.5">
                          <span className="block">
                            {device.platform ?? "Unknown platform"} · first activated{" "}
                            {formatUtc(device.firstActivatedAt)} UTC
                          </span>
                          <span className="block">
                            Last active {formatUtc(device.lastActiveAt)} UTC
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={device.status === "active" ? "teal" : "outline"}>
                          {device.status}
                        </Badge>
                        {device.status === "active" ? (
                          <form action={removeDeviceAction}>
                            <input type="hidden" name="devicePublicId" value={device.devicePublicId} />
                            <Button type="submit" variant="secondary" size="sm">
                              Remove
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}
