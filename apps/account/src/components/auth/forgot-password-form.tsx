"use client";

import { Alert, Button, Input } from "@khepree/ui";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AUTH_ROUTES } from "@/lib/routes";

export function ForgotPasswordForm() {
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
      setError(result.error.message ?? "Request failed");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <Alert variant="info">
          If an account exists for {email}, a reset link was generated. In development, check
          the server console for the preview — no email was sent to production.
        </Alert>
        <Link href={AUTH_ROUTES.signIn} className="text-sm font-medium text-khepree-teal hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Forgot password</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">We will send a reset link if the account exists.</p>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </Button>
      <Link href={AUTH_ROUTES.signIn} className="block text-center text-sm text-khepree-teal hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
