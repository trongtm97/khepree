import { Input } from "@khepree/ui";
import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { PartnerEmpty } from "@/components/partner-empty";
import { addCustomerAction } from "@/app/(partner)/actions";
import { getPartnerService } from "@/lib/partner";
import { requirePartnerContext } from "@/lib/partner-session";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const { session, actor } = await requirePartnerContext();
  if (!actor) {
    return (
      <PartnerEmpty
        title="No partner membership"
        description="This account is not linked to a partner organization."
      />
    );
  }
  const customers = await getPartnerService().listCustomers(session.user.id, actor.partner.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Customers must already have a Khepree account. Entitlements are issued through the partner service, not this form.
        </p>
      </header>
      {actor.partner.modes.includes("RESELLER") ? (
        <ActionForm action={addCustomerAction} submitLabel="Add customer">
          <Input name="email" type="email" label="Customer email" required />
        </ActionForm>
      ) : null}
      {customers.length === 0 ? (
        <PartnerEmpty
          title="No customers yet"
          description="Add a customer by the email of an existing Khepree account."
        />
      ) : (
        <ul className="divide-y divide-khepree-mist rounded-lg border border-khepree-mist bg-khepree-white">
          {customers.map((row) => (
            <li key={row.id} className="px-4 py-3 text-sm">
              <p className="font-medium">{row.name ?? row.userId}</p>
              <p className="text-khepree-slate/70">{row.email ?? row.publicId}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
