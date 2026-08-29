import { SignInForm } from "@/components/auth/sign-in-form";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="text-sm text-khepree-slate/70">Loading…</p>}>
      <SignInForm />
    </Suspense>
  );
}
