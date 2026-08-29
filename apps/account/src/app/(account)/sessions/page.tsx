import { listActiveSessions, requireSession } from "@khepree/auth/session";
import type { Metadata } from "next";
import { SessionList } from "@/components/security/session-list";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage() {
  const session = await requireSession();
  const sessions = await listActiveSessions();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Devices where you are signed in to Khepree.
        </p>
      </header>
      <SessionList sessions={sessions} currentToken={session.session.token} />
    </div>
  );
}
