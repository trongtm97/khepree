"use client";

import { useEffect, useRef } from "react";
import { Button } from "@khepree/ui";
import type { CheckoutFormField } from "@khepree/commerce";

const ALLOWED_HOSTS = new Set(["pay-sandbox.sepay.vn", "pay.sepay.vn"]);
const ALLOWED_FIELDS = new Set([
  "order_amount",
  "merchant",
  "currency",
  "operation",
  "order_description",
  "order_invoice_number",
  "customer_id",
  "payment_method",
  "success_url",
  "error_url",
  "cancel_url",
  "signature",
]);

export function ProviderCheckoutForm({
  action,
  fields,
  submitLabel,
}: {
  action: string;
  fields: CheckoutFormField[];
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
      {fields
        .filter((field) => ALLOWED_FIELDS.has(field.name))
        .map((field) => (
          <input key={field.name} type="hidden" name={field.name} value={field.value} />
        ))}
      <Button type="submit" className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
