import { getAdminPartner, listAdminPlans, listAdminTiers } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { Input, Select } from "@khepree/ui";
import { notFound } from "next/navigation";
import {
  adjustWalletAction,
  setPartnerPriceAction,
  setPartnerStatusAction,
  setPartnerTierAction,
} from "@/app/(admin)/actions";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { requireAdminAny } from "@/lib/admin-session";
import { formatMoney } from "@/lib/format";

export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminAny(["partner.admin", "finance.write"]);
  const { id } = await params;
  const partner = await getAdminPartner(id);
  if (!partner) notFound();
  const canAdmin = hasPermission({ globalRole: session.globalRole }, "partner.admin");
  const canFinance = hasPermission({ globalRole: session.globalRole }, "finance.write");
  const [tiers, plans] = await Promise.all([listAdminTiers(), listAdminPlans()]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{partner.name}</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          {partner.status} · {partner.modes.join(", ")} · wallet{" "}
          {partner.balanceMinor != null ? formatMoney(partner.balanceMinor, partner.currency ?? "USD") : "—"}
        </p>
      </header>
      {canAdmin ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ActionForm action={setPartnerStatusAction} submitLabel="Set status" danger>
            <input type="hidden" name="partnerId" value={partner.id} />
            <Select
              name="status"
              label="Status"
              defaultValue={partner.status}
              options={["pending", "active", "suspended", "rejected"].map((v) => ({ value: v, label: v }))}
            />
            <DangerFields />
          </ActionForm>
          <ActionForm action={setPartnerTierAction} submitLabel="Set tier">
            <input type="hidden" name="partnerId" value={partner.id} />
            <Select
              name="tierId"
              label="Tier"
              defaultValue={partner.tierId ?? ""}
              options={[
                { value: "", label: "None" },
                ...tiers.map((row) => ({ value: row.id, label: row.slug })),
              ]}
            />
          </ActionForm>
          <ActionForm action={setPartnerPriceAction} submitLabel="Set partner price">
            <input type="hidden" name="partnerId" value={partner.id} />
            <Select
              name="planId"
              label="Plan"
              options={plans.map((row) => ({ value: row.id, label: `${row.productSlug}/${row.slug}` }))}
            />
            <Input name="amountMinor" label="Amount (minor)" required />
            <Input name="currency" label="Currency" defaultValue="USD" required />
          </ActionForm>
        </div>
      ) : null}
      {canFinance ? (
        <ActionForm action={adjustWalletAction} submitLabel="Wallet adjustment" danger>
          <input type="hidden" name="partnerId" value={partner.id} />
          <Input name="amountMinor" label="Amount (minor units)" required />
          <Select
            name="negative"
            label="Direction"
            options={[
              { value: "0", label: "Credit / increase" },
              { value: "1", label: "Decrease" },
            ]}
          />
          <DangerFields reasonLabel="Adjustment reason (audited)" />
        </ActionForm>
      ) : null}
    </div>
  );
}
