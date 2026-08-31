"use client";

import { Alert, Button } from "@khepree/ui";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, type ReactNode } from "react";
import { adminUi } from "@/lib/labels";

export type ActionState = { error?: string; notice?: string; redirectTo?: string };

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
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {});
  const safeState = state ?? {};

  useEffect(() => {
    if (safeState.redirectTo) router.replace(safeState.redirectTo);
  }, [router, safeState.redirectTo]);

  return (
    <form action={formAction} className="space-y-3">
      {safeState.error ? <Alert variant="error">{safeState.error}</Alert> : null}
      {safeState.notice ? <Alert variant="success">{safeState.notice}</Alert> : null}
      {children}
      <Button
        type="submit"
        disabled={pending}
        variant={danger ? "secondary" : "primary"}
        className={danger ? "border-red-300 text-red-700" : undefined}
      >
        {pending ? adminUi.working : submitLabel}
      </Button>
    </form>
  );
}
