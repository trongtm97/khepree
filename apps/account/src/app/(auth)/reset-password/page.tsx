import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-khepree-slate/70">Loading…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
