import type { Metadata } from "next";

export const metadata: Metadata = { title: "MFA required" };

export default function MfaRequiredPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">MFA required</h1>
      <p className="text-sm text-khepree-slate/70">
        ADMIN and SUPER_ADMIN must enable two-factor authentication before using admin in production.
        Enable MFA on your account, then return here.
      </p>
    </div>
  );
}
