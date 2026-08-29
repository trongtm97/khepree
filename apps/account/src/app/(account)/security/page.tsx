import { listActiveSessions, requireSession } from "@khepree/auth/session";
import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/security/change-password-form";
import { SessionList } from "@/components/security/session-list";
import { TwoFactorPanel } from "@/components/security/two-factor-panel";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  const session = await requireSession();
  const sessions = await listActiveSessions();
  const twoFactorEnabled = Boolean(session.user.twoFactorEnabled);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Security</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Password, sessions, and two-factor authentication.
        </p>
      </header>

      <ChangePasswordForm />
      <hr className="border-khepree-slate/10" />
      <SessionList sessions={sessions} currentToken={session.session.token} />
      <hr className="border-khepree-slate/10" />
      <TwoFactorPanel enabled={twoFactorEnabled} />
    </div>
  );
}
