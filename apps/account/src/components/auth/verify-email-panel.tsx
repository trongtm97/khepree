"use client";

import { Alert, Button } from "@khepree/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { mapAuthError, type AuthCopy } from "@/lib/auth-ui";
import { AUTH_ROUTES } from "@/lib/routes";

export function VerifyEmailPanel({ copy }: { copy: AuthCopy }) {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function resend() {
    if (!email) return;
    setLoading(true);
    const result = await authClient.sendVerificationEmail({ email, callbackURL: "/" });
    setLoading(false);
    setMessage(result.error ? mapAuthError(result.error.message, copy) : copy.verify.resendSuccess);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{copy.verify.title}</h1>
      <Alert variant="info">{email ? copy.verify.bodyWithEmail : copy.verify.bodyGeneric}</Alert>
      {message ? <Alert variant="success">{message}</Alert> : null}
      {email ? (
        <Button type="button" variant="secondary" className="w-full" disabled={loading} onClick={() => void resend()}>
          {loading ? copy.verify.resending : copy.verify.resend}
        </Button>
      ) : null}
      <Link href={AUTH_ROUTES.signIn} className="block text-center text-sm text-khepree-teal hover:underline">
        {copy.verify.backToSignIn}
      </Link>
    </div>
  );
}
