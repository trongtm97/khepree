import { Input, Select } from "@khepree/ui";
import type { Metadata } from "next";
import { addMemberAction } from "@/app/(partner)/actions";
import { ActionForm } from "@/components/action-form";
import { PartnerEmpty } from "@/components/partner-empty";
import { getPartnerService } from "@/lib/partner";
import { canManage, requirePartnerContext } from "@/lib/partner-session";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({
  params,
}: {
  params: Promise<{ partnerPublicId: string }>;
}) {
  const { partnerPublicId } = await params;
  const { session, actor } = await requirePartnerContext(partnerPublicId);
  if (!actor) {
    return (
      <PartnerEmpty
        title="No partner membership"
        description="This account cannot access that partner organization."
      />
    );
  }
  const members = await getPartnerService().listTeam(session.user.id, actor.partner.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          OWNER and MANAGER can add members. SALES can view.
        </p>
      </header>
      {canManage(actor) ? (
        <ActionForm action={addMemberAction} submitLabel="Add member">
          <input type="hidden" name="partnerPublicId" value={partnerPublicId} />
          <Input name="email" type="email" label="Account email" required />
          <Select
            name="role"
            label="Role"
            defaultValue="PARTNER_SALES"
            options={[
              { value: "PARTNER_SALES", label: "Sales" },
              { value: "PARTNER_MANAGER", label: "Manager" },
              { value: "PARTNER_OWNER", label: "Owner" },
            ]}
          />
        </ActionForm>
      ) : null}
      {members.length === 0 ? (
        <PartnerEmpty title="No members" description="This partner has no team rows." />
      ) : (
        <ul className="divide-y divide-khepree-mist rounded-lg border border-khepree-mist bg-khepree-white">
          {members.map((row) => (
            <li key={`${row.partnerId}-${row.userId}`} className="px-4 py-3 text-sm">
              <p className="font-medium">{row.name ?? row.email ?? row.userId}</p>
              <p className="text-khepree-slate/70">
                {row.email} · {row.role}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
