import { Card, CardDescription, CardTitle } from "@khepree/ui";
import type { Metadata } from "next";
import { PartnerEmpty } from "@/components/partner-empty";
import { formatMoney } from "@/lib/format";
import { getPartnerService } from "@/lib/partner";
import { requirePartnerContext } from "@/lib/partner-session";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const { session, actor } = await requirePartnerContext();
  if (!actor) {
    return (
      <PartnerEmpty
        title="No partner membership"
        description="This account is not linked to a partner organization."
      />
    );
  }
  const products = await getPartnerService().listProducts(session.user.id, actor.partner.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">Eligible plans and partner pricing.</p>
      </header>
      {products.length === 0 ? (
        <PartnerEmpty
          title="No partner prices"
          description="Khepree assigns partner prices. Nothing is listed until a price row exists."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((row) => (
            <Card key={row.planId}>
              <CardTitle>{row.plan?.productSlug ?? "Product"}</CardTitle>
              <CardDescription className="mt-2">
                {row.plan?.slug ?? row.planId} · {row.plan?.billingType ?? "—"}
              </CardDescription>
              <p className="mt-3 text-lg font-semibold">{formatMoney(row.amountMinor, row.currency)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
