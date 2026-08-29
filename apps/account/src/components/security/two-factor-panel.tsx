"use client";

import { Alert, Button, Input } from "@khepree/ui";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(enabled);

  async function enableTotp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await authClient.twoFactor.enable({ password, method: "totp" });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Could not enable 2FA");
      return;
    }
    if (result.data?.method === "totp") {
      setTotpUri(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
    }
    setMessage("Scan the authenticator URI, then verify with a code.");
  }

  async function verifyTotp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await authClient.twoFactor.verifyTotp({ code: verifyCode });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Invalid code");
      return;
    }
    setIsEnabled(true);
    setTotpUri(null);
    setMessage("Two-factor authentication is enabled.");
  }

  async function disable2fa(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await authClient.twoFactor.disable({ password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Could not disable 2FA");
      return;
    }
    setIsEnabled(false);
    setMessage("Two-factor authentication disabled.");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Two-factor authentication</h2>
      <p className="text-sm text-khepree-slate/70">
        Add an extra layer of security with an authenticator app.
      </p>
      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}

      {isEnabled ? (
        <form onSubmit={disable2fa} className="space-y-3">
          <Input
            label="Password to disable 2FA"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={loading}>
            Disable 2FA
          </Button>
        </form>
      ) : totpUri ? (
        <form onSubmit={verifyTotp} className="space-y-3">
          <Alert variant="info">
            <p className="break-all text-xs">{totpUri}</p>
            {backupCodes.length > 0 ? (
              <p className="mt-2 text-xs">Backup codes: {backupCodes.join(", ")}</p>
            ) : null}
          </Alert>
          <Input
            label="Authenticator code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            Verify and enable
          </Button>
        </form>
      ) : (
        <form onSubmit={enableTotp} className="space-y-3">
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            Set up authenticator app
          </Button>
        </form>
      )}
    </div>
  );
}
