import { redirect } from "next/navigation";
import { requirePartnerContext } from "./partner-session";
import { PARTNER_PAGES, partnerPath } from "./routes";

export async function redirectUnscoped(page: keyof typeof PARTNER_PAGES): Promise<never> {
  const { actor, actors } = await requirePartnerContext();
  const publicId = actor?.partner.publicId ?? (actors.length === 1 ? actors[0]!.partner.publicId : null);
  if (publicId) redirect(partnerPath(publicId, page));
  redirect("/select");
}
