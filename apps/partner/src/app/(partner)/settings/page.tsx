import { Badge, Input } from "@khepree/ui";
import type { Metadata } from "next";
import { ActionForm } from "@/components/action-form";
import { PartnerEmpty } from "@/components/partner-empty";
import { updateSettingsAction } from "@/app/(partner)/actions";
import { canManage, requirePartnerContext } from "@/lib/partner-session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { actor } = await requirePartnerContext();
  if (!actor) {
    return (
      <PartnerEmpty
        title="No partner membership"
        description="This account is not linked to a partner organization."
      />
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Status is set by Khepree. Partners cannot change modes, credit policy, or entitlements here.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <Badge variant="teal">{actor.partner.status}</Badge>
        {actor.partner.modes.map((mode) => (
          <Badge key={mode} variant="outline">
            {mode}
          </Badge>
        ))}
        {actor.partner.allowNegativeBalance ? (
          <Badge variant="outline">negative balance allowed</Badge>
        ) : (
          <Badge variant="outline">no negative balance</Badge>
        )}
      </div>
      {canManage(actor) ? (
        <ActionForm action={updateSettingsAction} submitLabel="Save name">
          <Input name="name" label="Partner name" defaultValue={actor.partner.name} required />
        </ActionForm>
      ) : (
        <p className="text-sm text-khepree-slate/70">{actor.partner.name}</p>
      )}
    </div>
  );
}
