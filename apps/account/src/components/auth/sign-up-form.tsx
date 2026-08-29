"use client";

import { Alert, Button, Checkbox, Input } from "@khepree/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { attributeSignupAction } from "@/app/(auth)/actions";
import { authClient } from "@/lib/auth-client";
import { AUTH_ROUTES } from "@/lib/routes";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") ?? "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptTerms) {
      setError("Please accept the terms to continue.");
      return;
    }
    setError(null);
    setLoading(true);
    const result = await authClient.signUp.email({ name, email, password });
    if (result.error) {
      setLoading(false);
      setError(result.error.message ?? "Sign up failed");
      return;
    }
    if (ref) {
      await attributeSignupAction(ref);
    }
    setLoading(false);

    router.push(`${AUTH_ROUTES.verifyEmail}?email=${encodeURIComponent(email)}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">Start with the essentials — nothing extra.</p>
      </div>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Input label="Name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
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
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Checkbox
        label="I accept the Terms of Service and Privacy Policy"
        checked={acceptTerms}
        onChange={(e) => setAcceptTerms(e.target.checked)}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-khepree-slate/70">
        Already have an account?{" "}
        <Link href={AUTH_ROUTES.signIn} className="font-medium text-khepree-teal hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
