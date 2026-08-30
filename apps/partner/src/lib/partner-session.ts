import { requireSession } from "@khepree/auth/session";
import { hasPermission } from "@khepree/security";
import { getPartnerService, partnerAuthBaseUrl } from "./partner";
import { redirect } from "next/navigation";
import { partnerPath } from "./routes";

export async function requirePartnerContext(partnerPublicId?: string) {
  const session = await requireSession("/sign-in", partnerAuthBaseUrl());
  const service = getPartnerService();
  const actors = await service.listActorsForUser(session.user.id);
  if (partnerPublicId) {
    const actor = await service.resolveForUser(session.user.id, partnerPublicId);
    if (!actor) {
      redirect("/select");
    }
    return { session, actor, actors };
  }
  if (actors.length === 1) {
    return { session, actor: actors[0]!, actors };
  }
  return { session, actor: null, actors };
}

export async function requireActivePartner(partnerPublicId?: string) {
  const ctx = await requirePartnerContext(partnerPublicId);
  if (!ctx.actor) {
    if (ctx.actors.length === 0) return ctx;
    if (ctx.actors.length === 1) {
      redirect(partnerPath(ctx.actors[0]!.partner.publicId, "dashboard"));
    }
    redirect("/select");
  }
  return ctx;
}

export function canManage(actor: { role: "PARTNER_OWNER" | "PARTNER_MANAGER" | "PARTNER_SALES" } | null) {
  if (!actor) return false;
  return hasPermission({ partnerRole: actor.role }, "partner.manage");
}
