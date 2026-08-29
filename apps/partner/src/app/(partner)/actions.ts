import { isPartnerError } from "@khepree/reseller";
import { publicActionError } from "@khepree/security";
import { revalidatePath } from "next/cache";
import { requirePartnerContext } from "@/lib/partner-session";
import { getPartnerService } from "@/lib/partner";
import type { ActionState } from "@/components/action-form";

async function scoped() {
  const ctx = await requirePartnerContext();
  if (!ctx.actor) throw new Error("You are not a member of a partner.");
  return { session: ctx.session, actor: ctx.actor };
}

function fail(error: unknown): ActionState {
  return { error: publicActionError(error, isPartnerError) };
}

export async function addCustomerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const ctx = await scoped();
    const email = String(formData.get("email") ?? "").trim();
    await getPartnerService().addCustomer({
      actorUserId: ctx.session.user.id,
      partnerId: ctx.actor.partner.id,
      email,
    });
    revalidatePath("/customers");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function issueProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const ctx = await scoped();
    await getPartnerService().issueProduct({
      actorUserId: ctx.session.user.id,
      partnerId: ctx.actor.partner.id,
      customerUserId: String(formData.get("customerUserId") ?? ""),
      planId: String(formData.get("planId") ?? ""),
      idempotencyKey: String(formData.get("idempotencyKey") ?? crypto.randomUUID()),
    });
    revalidatePath("/licenses");
    revalidatePath("/orders");
    revalidatePath("/wallet");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function renewIssueAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const ctx = await scoped();
    await getPartnerService().renewIssue({
      actorUserId: ctx.session.user.id,
      partnerId: ctx.actor.partner.id,
      issueId: String(formData.get("issueId") ?? ""),
      idempotencyKey: String(formData.get("idempotencyKey") ?? crypto.randomUUID()),
    });
    revalidatePath("/licenses");
    revalidatePath("/orders");
    revalidatePath("/wallet");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function createReferralAction(_state: ActionState, _formData: FormData): Promise<ActionState> {
  try {
    const ctx = await scoped();
    await getPartnerService().createReferral({
      actorUserId: ctx.session.user.id,
      partnerId: ctx.actor.partner.id,
      label: String(_formData.get("label") ?? "").trim() || null,
    });
    revalidatePath("/referrals");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function addMemberAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const ctx = await scoped();
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
    revalidatePath("/team");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function updateSettingsAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const ctx = await scoped();
    await getPartnerService().updateSettings({
      actorUserId: ctx.session.user.id,
      partnerId: ctx.actor.partner.id,
      name: String(formData.get("name") ?? ""),
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return {};
  } catch (error) {
    return fail(error);
  }
}
