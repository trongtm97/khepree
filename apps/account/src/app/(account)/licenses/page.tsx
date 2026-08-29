import { requireSession } from "@khepree/auth/session";
import { maskLicenseKey } from "@khepree/entitlement";
import { Badge, Card, CardDescription, CardTitle, EmptyState } from "@khepree/ui";
import type { Metadata } from "next";
import { getPlatform } from "@/lib/commerce";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Licenses" };

export default async function LicensesPage() {
  const session = await requireSession();
  const licenses = await getPlatform().licensing.listLicenses({
    type: "USER",
    id: session.user.id,
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Licenses</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Entitlements are the source of truth. Keys identify a license; they do not encode rights.
        </p>
      </header>

      {licenses.length === 0 ? (
        <EmptyState
          title="No licenses yet"
          description="A verified purchase creates an entitlement and issues a license key once."
        />
      ) : (
        <div className="space-y-3">
          {licenses.map((row) => {
            const activeDevices = row.activations.filter((item) => item.status === "active").length;
            return (
              <Card key={row.license.publicId}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    {row.productSlug ?? row.entitlement.productId}
                  </CardTitle>
                  <Badge variant={row.entitlement.status === "active" ? "teal" : "outline"}>
                    {row.entitlement.status}
                  </Badge>
                </div>
                <CardDescription className="mt-2">
                  Plan {row.planSlug ?? "—"} · {row.license.status}
                  {row.entitlement.expiresAt
                    ? ` · expires ${row.entitlement.expiresAt.toISOString().slice(0, 10)}`
                    : " · no expiration"}
                </CardDescription>
                <p className="mt-3 font-mono text-sm">
                  {maskLicenseKey(row.license.keyPrefix, row.license.keyLast4) ?? "Key issued"}
                </p>
                <p className="mt-2 text-sm text-khepree-slate/70">
                  {activeDevices} active device{activeDevices === 1 ? "" : "s"} of this license
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
