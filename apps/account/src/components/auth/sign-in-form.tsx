"use client";

import { safeReturnPath } from "@khepree/auth/safe-return-path";
import { Alert, Button, Input } from "@khepree/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AUTH_ROUTES } from "@/lib/routes";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeReturnPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await authClient.signIn.email({ email, password });
    setLoading(false);

    if (result.error) {
      setError(result.error.message ?? "Sign in failed");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">Welcome back to Khepree.</p>
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
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex items-center justify-between text-sm">
        <Link href={AUTH_ROUTES.forgotPassword} className="text-khepree-teal hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-khepree-slate/70">
        No account?{" "}
        <Link href={AUTH_ROUTES.signUp} className="font-medium text-khepree-teal hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
