"use client";

import { Button } from "@khepree/ui";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useAdminNotifier } from "@/components/admin-notifier";
import { adminUi } from "@/lib/labels";

export type ActionState = { error?: string; notice?: string; redirectTo?: string };

export function ActionForm({
  action,
  children,
  submitLabel,
  danger = false,
  formId,
  hideSubmit = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel: string;
  danger?: boolean;
  formId?: string;
  hideSubmit?: boolean;
}) {
  const router = useRouter();
  const { notify } = useAdminNotifier();
  const [state, formAction, pending] = useActionState(action, {});
  const safeState = state ?? {};
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (safeState.redirectTo) router.replace(safeState.redirectTo);
  }, [router, safeState.redirectTo]);

  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true;
      return;
    }
    if (!wasPendingRef.current) return;
    wasPendingRef.current = false;

    if (safeState.error) {
      notify(safeState.error, "error");
      return;
    }
    if (safeState.notice) {
      notify(safeState.notice, "success");
      router.refresh();
    }
  }, [notify, pending, router, safeState.error, safeState.notice]);

  return (
    <form id={formId} action={formAction} className="space-y-3">
      {children}
      {hideSubmit ? null : (
        <Button
          type="submit"
          disabled={pending}
          variant={danger ? "secondary" : "primary"}
          className={danger ? "border-red-300 text-red-700" : undefined}
        >
          {pending ? adminUi.working : submitLabel}
        </Button>
      )}
    </form>
  );
}
