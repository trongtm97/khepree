import { requireSession } from "@khepree/auth/session";
import { hasPermission } from "@khepree/security";
import { getPartnerService, partnerAuthBaseUrl } from "./partner";

export async function requirePartnerContext() {
  const session = await requireSession("/sign-in", partnerAuthBaseUrl());
  const actor = await getPartnerService().resolveForUser(session.user.id);
  return { session, actor };
}

export function canManage(actor: { role: "PARTNER_OWNER" | "PARTNER_MANAGER" | "PARTNER_SALES" } | null) {
  if (!actor) return false;
  return hasPermission({ partnerRole: actor.role }, "partner.manage");
}
