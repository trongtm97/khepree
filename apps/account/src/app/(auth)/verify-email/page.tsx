import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-khepree-slate/70">Loading…</p>}>
      <VerifyEmailPanel />
    </Suspense>
  );
}
