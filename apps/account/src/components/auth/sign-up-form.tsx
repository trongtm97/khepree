"use client";

import { safeAccountNextPath } from "@khepree/auth/safe-account-next-path";
import { Alert, Button, Checkbox, Input } from "@khepree/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signUpWithLegalConsentAction } from "@/app/(auth)/actions";
import { AuthDivider, GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PasswordInput } from "@/components/auth/password-input";
import { authClient } from "@/lib/auth-client";
import { mapAuthError, marketingLegalUrl, type AuthCopy } from "@/lib/auth-ui";
import type { SupportedLocale } from "@khepree/config";
import { AUTH_ROUTES } from "@/lib/routes";

export function SignUpForm({
  copy,
  googleEnabled,
  locale,
}: {
  copy: AuthCopy;
  googleEnabled: boolean;
  locale: SupportedLocale;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") ?? "";
  const next = safeAccountNextPath(searchParams.get("next"), AUTH_ROUTES.verifyEmail);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onGoogleSignUp() {
    setError(null);
    setGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}${next}`,
      });
    } catch {
      setError(copy.errors.googleFailed);
      setGoogleLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptTerms) {
      setError(copy.termsRequired);
      return;
    }
    setError(null);
    setLoading(true);

    const result = await signUpWithLegalConsentAction({ name, email, password, ref });
    setLoading(false);

    if (!result.ok) {
      setError(mapAuthError(result.error, copy));
      return;
    }

    router.push(`${AUTH_ROUTES.verifyEmail}?email=${encodeURIComponent(email)}`);
    router.refresh();
  }

  const termsUrl = marketingLegalUrl(locale, "terms");
  const privacyUrl = marketingLegalUrl(locale, "privacy");

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-khepree-ink">{copy.signUpTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed text-khepree-slate/70">{copy.signUpSubtitle}</p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {googleEnabled ? (
        <>
          <GoogleSignInButton copy={copy} disabled={googleLoading || loading} onClick={() => void onGoogleSignUp()} />
          <AuthDivider label={copy.or} />
        </>
      ) : null}

      <Input label={copy.name} autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        label={copy.email}
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <PasswordInput
        label={copy.password}
        autoComplete="new-password"
        required
        minLength={8}
        hint={copy.passwordHint}
        value={password}
        onChange={setPassword}
        copy={copy}
      />
      <Checkbox
        checked={acceptTerms}
        onChange={(e) => setAcceptTerms(e.target.checked)}
        label={
          <>
            {copy.termsPrefix}{" "}
            <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="text-khepree-teal hover:underline">
              {copy.termsLink}
            </a>{" "}
            {copy.termsAnd}{" "}
            <a
              href={privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-khepree-teal hover:underline"
            >
              {copy.privacyLink}
            </a>
          </>
        }
      />
      <Button type="submit" className="w-full" disabled={loading || googleLoading}>
        {loading ? copy.signingUp : copy.signUp}
      </Button>
      <p className="text-center text-sm text-khepree-slate/70">
        {copy.hasAccount}{" "}
        <Link href={AUTH_ROUTES.signIn} className="font-medium text-khepree-teal hover:underline">
          {copy.signIn}
        </Link>
      </p>
    </form>
  );
}
