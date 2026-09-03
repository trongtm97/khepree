import { safeReturnPath } from "@khepree/auth/safe-return-path";
import { getSession } from "@khepree/auth/session";
import { SignInForm } from "@/components/sign-in-form";
import { adminAuthBaseUrl } from "@/lib/admin";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession(adminAuthBaseUrl());
  if (session) {
    const params = await searchParams;
    const next = safeReturnPath(params.next);
    const [path, query] = next.split("?");
    redirect(query ? `${path}?${query}` : path || "/dashboard");
  }

  return (
    <Suspense fallback={<p className="text-sm text-khepree-slate/70">Loading…</p>}>
      <SignInForm />
    </Suspense>
  );
}
