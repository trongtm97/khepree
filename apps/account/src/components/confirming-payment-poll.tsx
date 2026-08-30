"use client";

import { useEffect } from "react";

export function ConfirmingPaymentPoll({ delayMs = 4000 }: { delayMs?: number }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.reload();
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);
  return null;
}
