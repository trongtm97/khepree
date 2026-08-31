import type { Metadata } from "next";

export const metadata: Metadata = { title: "MFA required" };

export default function MfaRequiredPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">MFA required</h1>
      <p className="text-sm text-khepree-slate/70">
        Two-factor authentication is optional for admin staff in this deployment.
      </p>
    </div>
  );
}
