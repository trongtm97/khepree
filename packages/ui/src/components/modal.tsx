"use client";

import { cn } from "../lib/cn";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="khepree-modal-title"
      onClose={onClose}
      className={cn(
        "fixed left-1/2 top-1/2 z-[200] m-0 max-h-[min(90dvh,100%)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2",
        "rounded-[var(--radius-card)] border border-khepree-mist bg-khepree-white p-0 shadow-xl backdrop:bg-khepree-ink/40",
        "open:animate-in open:fade-in motion-reduce:open:animate-none",
        "max-w-md",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-khepree-mist px-6 py-4">
        <h2 id="khepree-modal-title" className="text-lg font-semibold text-khepree-ink">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-[var(--radius-control)] px-2 py-1 text-khepree-slate hover:bg-khepree-mist"
        >
          ✕
        </button>
      </div>
      <div className="max-h-[calc(90dvh-8rem)] overflow-y-auto px-6 py-4 text-sm text-khepree-slate/90">
        {children}
      </div>
      {footer ? (
        <div className="flex justify-end gap-2 border-t border-khepree-mist px-6 py-4">
          {footer}
        </div>
      ) : null}
    </dialog>,
    document.body,
  );
}
