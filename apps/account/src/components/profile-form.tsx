"use client";

import { Alert, Button, Input } from "@khepree/ui";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [displayName, setDisplayName] = useState(name);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const result = await authClient.updateUser({ name: displayName });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Update failed");
      return;
    }
    setMessage("Profile updated.");
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}
      <Input label="Email" type="email" value={email} disabled hint="Contact support to change email." />
      <Input
        label="Display name"
        autoComplete="name"
        required
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
