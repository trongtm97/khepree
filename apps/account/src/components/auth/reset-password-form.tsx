"use client";

import { Alert, Button, Input } from "@khepree/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AUTH_ROUTES } from "@/lib/routes";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Reset token is missing or invalid.");
      return;
    }
    setError(null);
    setLoading(true);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Reset failed");
      return;
    }

    router.push(AUTH_ROUTES.signIn);
    router.refresh();
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <Alert variant="error">This reset link is invalid or expired.</Alert>
        <Link href={AUTH_ROUTES.forgotPassword} className="text-sm font-medium text-khepree-teal hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">Choose a strong password for your account.</p>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
