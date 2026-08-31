"use client";

import { safeAccountNextPath } from "@khepree/auth/safe-account-next-path";
import { Alert, Button, Input } from "@khepree/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthDivider, GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PasswordInput } from "@/components/auth/password-input";
import { authClient } from "@/lib/auth-client";
import { mapAuthError, mapOAuthCallbackError, type AuthCopy } from "@/lib/auth-ui";
import { startGoogleOAuth } from "@/lib/google-oauth";
import type { SupportedLocale } from "@khepree/config";
import { AUTH_ROUTES } from "@/lib/routes";

export function SignInForm({
  copy,
  googleEnabled,
}: {
  copy: AuthCopy;
  googleEnabled: boolean;
  locale: SupportedLocale;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeAccountNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() =>
    mapOAuthCallbackError(searchParams.get("error"), copy),
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    const callbackURL = `${window.location.origin}${next}`;
    const result = await startGoogleOAuth({
      callbackURL,
      errorCallbackURL: `${AUTH_ROUTES.signIn}?error=google_oauth_failed&next=${encodeURIComponent(next)}`,
    });
    if (result.error) {
      setError(mapAuthError(result.error, copy));
      setGoogleLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await authClient.signIn.email({ email, password });
    setLoading(false);

    if (result.error) {
      setError(mapAuthError(result.error.message, copy));
      return;
    }

    router.push(next);
    router.refresh();
  }

  const signUpHref =
    searchParams.get("next") != null
      ? `${AUTH_ROUTES.signUp}?next=${encodeURIComponent(searchParams.get("next")!)}`
      : AUTH_ROUTES.signUp;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-khepree-ink">{copy.signInTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-khepree-slate/70">{copy.signInSubtitle}</p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {googleEnabled ? (
        <>
          <GoogleSignInButton
            copy={copy}
            loading={googleLoading}
            disabled={googleLoading || loading}
            onClick={() => void onGoogleSignIn()}
          />
          <AuthDivider label={copy.or} />
        </>
      ) : null}

      <Input
        label={copy.email}
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="text-base md:text-sm"
      />
      <PasswordInput
        label={copy.password}
        autoComplete="current-password"
        required
        value={password}
        onChange={setPassword}
        copy={copy}
      />
      <div className="flex items-center justify-end text-sm">
        <Link href={AUTH_ROUTES.forgotPassword} className="text-khepree-teal hover:underline">
          {copy.forgotPassword}
        </Link>
      </div>
      <Button type="submit" className="w-full" disabled={loading || googleLoading}>
        {loading ? copy.signingIn : copy.signIn}
      </Button>
      <p className="text-center text-sm text-khepree-slate/70">
        {copy.noAccount}{" "}
        <Link href={signUpHref} className="font-medium text-khepree-teal hover:underline">
          {copy.createAccount}
        </Link>
      </p>
    </form>
  );
}
