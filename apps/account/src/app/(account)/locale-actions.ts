"use server";

import { setUserPreferredLocale } from "@khepree/auth";
import { requireSession } from "@khepree/auth/session";
import { LOCALE_COOKIE, isSupportedLocale } from "@khepree/config";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setAccountLocaleAction(formData: FormData) {
  const session = await requireSession();
  const locale = String(formData.get("locale") ?? "");
  if (!isSupportedLocale(locale)) return;
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  await setUserPreferredLocale(session.user.id, locale);
  revalidatePath("/", "layout");
}
