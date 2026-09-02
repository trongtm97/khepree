"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@khepree/ui";

type CancelOrderButtonProps = {
  orderPublicId: string;
  label: string;
  cancellingLabel: string;
  confirmMessage: string;
  redirectTo?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  onCancelled?: () => void;
};

export function CancelOrderButton({
  orderPublicId,
  label,
  cancellingLabel,
  confirmMessage,
  redirectTo,
  variant = "secondary",
  size = "sm",
  onCancelled,
}: CancelOrderButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancel() {
    if (!window.confirm(confirmMessage)) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/checkout/${orderPublicId}/cancel`, { method: "POST" });
      if (!response.ok) return;
      onCancelled?.();
      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant={variant} size={size} disabled={loading} onClick={() => void cancel()}>
      {loading ? cancellingLabel : label}
    </Button>
  );
}
