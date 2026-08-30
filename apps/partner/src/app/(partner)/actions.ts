import { isPartnerError } from "@khepree/reseller";
import { publicActionError } from "@khepree/security";
import { revalidatePath } from "next/cache";
import { requirePartnerContext } from "@/lib/partner-session";
import { getPartnerService } from "@/lib/partner";
import { partnerPath } from "@/lib/routes";
import type { ActionState } from "@/components/action-form";

async function scoped(formData: FormData) {
  const partnerPublicId = String(formData.get("partnerPublicId") ?? "");
  const ctx = await requirePartnerContext(partnerPublicId);
  if (!ctx.actor) throw new Error("You are not a member of that partner.");
  return { session: ctx.session, actor: ctx.actor, partnerPublicId: ctx.actor.partner.publicId };
}

function fail(error: unknown): ActionState {
  return { error: publicActionError(error, isPartnerError) };
}

function revalidatePartner(partnerPublicId: string, pages: Array<"customers" | "licenses" | "orders" | "wallet" | "referrals" | "team" | "settings" | "dashboard">) {
  for (const page of pages) {
    revalidatePath(partnerPath(partnerPublicId, page));
  }
}

export async function addCustomerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const ctx = await scoped(formData);
    const email = String(formData.get("email") ?? "").trim();
    await getPartnerService().addCustomer({
      actorUserId: ctx.session.user.id,
      partnerId: ctx.actor.partner.id,
      email,
    });
    revalidatePartner(ctx.partnerPublicId, ["customers"]);
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function issueProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const ctx = await scoped(formData);
    await getPartnerService().issueProduct({
      actorUserId: ctx.session.user.id,
      partnerId: ctx.actor.partner.id,
      customerUserId: String(formData.get("customerUserId") ?? ""),
      planId: String(formData.get("planId") ?? ""),
      idempotencyKey: String(formData.get("idempotencyKey") ?? crypto.randomUUID()),
    });
    revalidatePartner(ctx.partnerPublicId, ["licenses", "orders", "wallet"]);
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function renewIssueAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const ctx = await scoped(formData);
    await getPartnerService().renewIssue({
      actorUserId: ctx.session.user.id,
      partnerId: ctx.actor.partner.id,
      issueId: String(formData.get("issueId") ?? ""),
      idempotencyKey: String(formData.get("idempotencyKey") ?? crypto.randomUUID()),
    });
    revalidatePartner(ctx.partnerPublicId, ["licenses", "orders", "wallet"]);
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function createReferralAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const ctx = await scoped(formData);
    await getPartnerService().createReferral({
      actorUserId: ctx.session.user.id,
      partnerId: ctx.actor.partner.id,
      label: String(formData.get("label") ?? "").trim() || null,
    });
    revalidatePartner(ctx.partnerPublicId, ["referrals"]);
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function addMemberAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const ctx = await scoped(formData);
    const role = String(formData.get("role") ?? "PARTNER_SALES");
    if (role !== "PARTNER_OWNER" && role !== "PARTNER_MANAGER" && role !== "PARTNER_SALES") {
      return { error: "Invalid role" };
    }
    await getPartnerService().addMember({
      actorUserId: ctx.session.user.id,
      partnerId: ctx.actor.partner.id,
      email: String(formData.get("email") ?? "").trim(),
      role,
    });
    revalidatePartner(ctx.partnerPublicId, ["team"]);
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function updateSettingsAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const ctx = await scoped(formData);
    await getPartnerService().updateSettings({
      actorUserId: ctx.session.user.id,
      partnerId: ctx.actor.partner.id,
      name: String(formData.get("name") ?? ""),
    });
    revalidatePartner(ctx.partnerPublicId, ["settings", "dashboard"]);
    return {};
  } catch (error) {
    return fail(error);
  }
}
