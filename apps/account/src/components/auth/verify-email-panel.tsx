"use client";

import { Alert, Button } from "@khepree/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AUTH_ROUTES } from "@/lib/routes";

export function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function resend() {
    if (!email) return;
    setLoading(true);
    const result = await authClient.sendVerificationEmail({ email, callbackURL: "/" });
    setLoading(false);
    setMessage(
      result.error
        ? (result.error.message ?? "Could not resend")
        : "Verification link generated — check the server console in development.",
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
      <Alert variant="info">
        {email
          ? `We sent a verification link to ${email}. In development, the link appears in the server console — it is not delivered to a real inbox.`
          : "Check your inbox for a verification link. In development, check the server console."}
      </Alert>
      {message ? <Alert variant="success">{message}</Alert> : null}
      {email ? (
        <Button type="button" variant="secondary" className="w-full" disabled={loading} onClick={() => void resend()}>
          {loading ? "Sending…" : "Resend verification email"}
        </Button>
      ) : null}
      <Link href={AUTH_ROUTES.signIn} className="block text-center text-sm text-khepree-teal hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
