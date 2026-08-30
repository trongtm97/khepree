"use client";

import { useEffect, useRef } from "react";
import { Button } from "@khepree/ui";

const ALLOWED_HOSTS = new Set(["pay-sandbox.sepay.vn", "pay.sepay.vn"]);
const ALLOWED_FIELDS = new Set([
  "order_amount",
  "merchant",
  "currency",
  "operation",
  "order_description",
  "order_invoice_number",
  "success_url",
  "error_url",
  "cancel_url",
  "signature",
  "payment_method",
  "customer_id",
]);

export function ProviderCheckoutForm({
  action,
  fields,
  submitLabel,
}: {
  action: string;
  fields: Record<string, string>;
  submitLabel: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  let host = "";
  try {
    host = new URL(action).host;
  } catch {
    host = "";
  }
  const allowed = ALLOWED_HOSTS.has(host);

  useEffect(() => {
    if (allowed) formRef.current?.submit();
  }, [allowed]);

  if (!allowed) {
    return <p className="text-sm text-red-700">Invalid payment destination.</p>;
  }

  return (
    <form ref={formRef} action={action} method="POST" className="space-y-4">
      {Object.entries(fields)
        .filter(([name]) => ALLOWED_FIELDS.has(name))
        .map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      <Button type="submit" className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
