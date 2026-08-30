import type { ReactNode } from "react";

export function AdminFormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border border-khepree-mist bg-khepree-white p-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-khepree-slate/70">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
