"use client";

import { Alert, Button, Card, CardDescription, CardTitle } from "@khepree/ui";
import type { SessionRow } from "@khepree/auth/session";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { revokeOtherSessionsAction, revokeSessionAction } from "@/lib/session-actions";

export function SessionList({ sessions: initialSessions }: { sessions: SessionRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function revokeOthers() {
    try {
      await revokeOtherSessionsAction();
      router.refresh();
    } catch {
      setError("Could not revoke sessions");
    }
  }

  async function revokeOne(sessionId: string) {
    try {
      await revokeSessionAction(sessionId);
      router.refresh();
    } catch {
      setError("Could not revoke session");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Active sessions</h2>
        <Button type="button" variant="secondary" size="sm" onClick={() => void revokeOthers()}>
          Sign out other devices
        </Button>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <ul className="space-y-3">
        {initialSessions.map((session) => {
          const isCurrent = Boolean(session.isCurrent);
          return (
            <li key={session.id}>
              <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">
                    {isCurrent ? "This device" : "Other session"}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {session.userAgent ?? "Unknown device"}
                    {session.ipAddress ? ` · ${session.ipAddress}` : ""}
                  </CardDescription>
                </div>
                {!isCurrent ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void revokeOne(session.id)}
                  >
                    Revoke
                  </Button>
                ) : (
                  <span className="text-xs font-medium text-khepree-teal">Current</span>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
