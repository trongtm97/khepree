import { requireSession } from "@khepree/auth/session";
import { Badge, Button, Card, CardDescription, CardTitle, EmptyState } from "@khepree/ui";
import type { Metadata } from "next";
import { getPlatform } from "@/lib/commerce";
import { deactivateDeviceAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Devices" };

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const devices = await getPlatform().licensing.listDevices({
    type: "USER",
    id: session.user.id,
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Installations registered against your licenses. Hardware serials are not stored.
        </p>
      </header>

      {params.error === "cooldown" ? (
        <p className="text-sm text-khepree-slate/80">
          Device deactivation is cooling down. Try again later.
        </p>
      ) : null}

      {devices.length === 0 ? (
        <EmptyState
          title="No devices registered"
          description="Activating a product from the desktop app will list the installation here."
        />
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <Card key={device.publicId} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">{device.name ?? device.publicId}</CardTitle>
                <CardDescription className="mt-1">
                  {device.platform ?? "Unknown platform"} · last seen{" "}
                  {device.lastSeenAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={device.status === "active" ? "teal" : "outline"}>{device.status}</Badge>
                {device.status === "active" ? (
                  <form action={deactivateDeviceAction}>
                    <input type="hidden" name="devicePublicId" value={device.publicId} />
                    <Button type="submit" variant="secondary" size="sm">
                      Deactivate
                    </Button>
                  </form>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
