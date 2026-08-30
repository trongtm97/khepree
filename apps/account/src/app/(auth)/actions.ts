"use server";

import { getAuth } from "@khepree/auth/server";
import { recordLegalConsents } from "@khepree/auth/legal-consent";
import { getSession } from "@khepree/auth/session";
import { safeAccountNextPath } from "@khepree/auth/safe-account-next-path";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isPartnerError } from "@khepree/reseller";
import { getPlatform } from "@/lib/commerce";
import { AUTH_ROUTES } from "@/lib/routes";

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

export async function signUpWithLegalConsentAction(input: {
  name: string;
  email: string;
  password: string;
  ref?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = getAuth();
  const headerStore = await headers();

  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: input.name.trim(),
        email: input.email.trim(),
        password: input.password,
      },
      headers: headerStore,
    });

    if (!result?.user?.id) {
      return { ok: false, error: "SIGN_UP_FAILED" };
    }

    await recordLegalConsents(result.user.id);

    if (input.ref?.trim()) {
      const session = await getSession();
      if (session) {
        await attributeSignupAction(input.ref);
      }
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SIGN_UP_FAILED";
    return { ok: false, error: message };
  }
}

export async function acceptLegalConsentAction(nextRaw?: string | null): Promise<void> {
  const session = await getSession();
  if (!session) {
    redirect(AUTH_ROUTES.signIn);
  }

  await recordLegalConsents(session.user.id);
  redirect(safeAccountNextPath(nextRaw));
}
