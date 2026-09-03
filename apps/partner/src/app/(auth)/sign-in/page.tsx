import { safeReturnPath } from "@khepree/auth/safe-return-path";
import { getSession } from "@khepree/auth/session";
import { SignInForm } from "@/components/sign-in-form";
import { partnerAuthBaseUrl } from "@/lib/partner";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession(partnerAuthBaseUrl());
  if (session) {
    const params = await searchParams;
    const next = safeReturnPath(params.next, "/select");
    const [path, query] = next.split("?");
    redirect(query ? `${path}?${query}` : path || "/select");
  }

  return (
    <Suspense fallback={<p className="text-sm text-khepree-slate/70">Loading…</p>}>
      <SignInForm />
    </Suspense>
  );
}
