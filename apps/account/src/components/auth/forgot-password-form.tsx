"use client";

import { Alert, Button, Input } from "@khepree/ui";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { mapAuthError, type AuthCopy } from "@/lib/auth-ui";
import { AUTH_ROUTES } from "@/lib/routes";

export function ForgotPasswordForm({ copy }: { copy: AuthCopy }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}${AUTH_ROUTES.resetPassword}`,
    });
    setLoading(false);

    if (result.error) {
      setError(mapAuthError(result.error.message, copy));
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.forgot.checkTitle}</h1>
        <Alert variant="info">{copy.forgot.checkBody}</Alert>
        <Link href={AUTH_ROUTES.signIn} className="text-sm font-medium text-khepree-teal hover:underline">
          {copy.forgot.backToSignIn}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.forgot.title}</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">{copy.forgot.subtitle}</p>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Input
        label={copy.email}
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? copy.forgot.sending : copy.forgot.sendLink}
      </Button>
      <Link href={AUTH_ROUTES.signIn} className="block text-center text-sm text-khepree-teal hover:underline">
        {copy.forgot.backToSignIn}
      </Link>
    </form>
  );
}
