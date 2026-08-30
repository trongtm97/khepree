import type { ReactNode } from "react";

export function AdminSection({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
      {description ? <p className="text-sm text-khepree-slate/70">{description}</p> : null}
      {children}
    </section>
  );
}
