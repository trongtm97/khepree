"use client";

import { Alert, Button } from "@khepree/ui";
import { useActionState, type ReactNode } from "react";

export type ActionState = { error?: string; notice?: string };

export function ActionForm({
  action,
  children,
  submitLabel,
  danger = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel: string;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-3">
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {state.notice ? <Alert variant="success">{state.notice}</Alert> : null}
      {children}
      <Button
        type="submit"
        disabled={pending}
        variant={danger ? "secondary" : "primary"}
        className={danger ? "border-red-300 text-red-700" : undefined}
      >
        {pending ? "Working…" : submitLabel}
      </Button>
    </form>
  );
}
