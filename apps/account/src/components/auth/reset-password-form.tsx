"use client";

import { Alert, Button, Input } from "@khepree/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { mapAuthError, type AuthCopy } from "@/lib/auth-ui";
import { AUTH_ROUTES } from "@/lib/routes";

export function ResetPasswordForm({ copy }: { copy: AuthCopy }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError(copy.reset.missingToken);
      return;
    }
    setError(null);
    setLoading(true);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);

    if (result.error) {
      setError(mapAuthError(result.error.message, copy));
      return;
    }

    router.push(AUTH_ROUTES.signIn);
    router.refresh();
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{copy.reset.invalidLink}</Alert>
        <Link href={AUTH_ROUTES.forgotPassword} className="text-sm font-medium text-khepree-teal hover:underline">
          {copy.reset.requestNew}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.reset.title}</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">{copy.reset.subtitle}</p>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Input
        label={copy.reset.newPassword}
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? copy.reset.updating : copy.reset.update}
      </Button>
    </form>
  );
}
