"use server";

import { getSession } from "@khepree/auth/session";
import { isPartnerError } from "@khepree/reseller";
import { getPlatform } from "@/lib/commerce";

export async function attributeSignupAction(code: string): Promise<void> {
  const trimmed = code.trim();
  if (!trimmed) return;
  const session = await getSession();
  if (!session) return;
  try {
    await getPlatform().partner.attributeSignup({ userId: session.user.id, code: trimmed });
  } catch (error) {
    if (isPartnerError(error) && (error.code === "NOT_FOUND" || error.code === "CONFLICT")) return;
    throw error;
  }
}
