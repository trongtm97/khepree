"use client";

import { signInAction } from "@/app/(auth)/actions";
import { Alert, Button, Input } from "@khepree/ui";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function SignInForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signInAction({ email, password, next: searchParams.get("next") });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.assign(result.redirectTo);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">Internal staff only. No public sign-up.</p>
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
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
