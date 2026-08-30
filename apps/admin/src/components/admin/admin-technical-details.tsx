"use client";

import { useId, useState, type ReactNode } from "react";
import { adminUi } from "@/lib/labels";

export function AdminTechnicalDetails({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="text-xs text-khepree-slate/70">
      <button
        type="button"
        className="text-khepree-teal underline"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {adminUi.technicalDetails}
      </button>
      {open ? (
        <div id={panelId} className="mt-1 font-mono break-all">
          {children}
        </div>
      ) : null}
    </div>
  );
}
