"use client";

import { Alert, Button } from "@khepree/ui";
import { useActionState, type ReactNode } from "react";

export type ActionState = { error?: string };

export function ActionForm({
  action,
  children,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-3">
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}
      {children}
      <Button type="submit" disabled={pending}>
        {pending ? "Working…" : submitLabel}
      </Button>
    </form>
  );
}
