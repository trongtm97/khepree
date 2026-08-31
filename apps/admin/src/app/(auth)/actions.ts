"use server";

import { getAuth } from "@khepree/auth/server";
import { safeReturnPath } from "@khepree/auth/safe-return-path";
import { headers } from "next/headers";
import { adminAuthBaseUrl } from "@/lib/admin";

export async function signInAction(input: {
  email: string;
  password: string;
  next?: string | null;
}): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  const auth = getAuth(adminAuthBaseUrl());
  const headerStore = await headers();

  try {
    const result = await auth.api.signInEmail({
      body: {
        email: input.email.trim(),
        password: input.password,
      },
      headers: headerStore,
    });

    if (!result?.user) {
      return { ok: false, error: "Email hoặc mật khẩu không đúng" };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "SIGN_IN_FAILED";
    if (/invalid email or password/i.test(message)) {
      return { ok: false, error: "Email hoặc mật khẩu không đúng" };
    }
    return { ok: false, error: "Không thể đăng nhập. Thử lại sau." };
  }

  const next = safeReturnPath(input.next);
  const redirectTo = next === "/sign-in" ? "/dashboard" : next;
  return { ok: true, redirectTo };
}
