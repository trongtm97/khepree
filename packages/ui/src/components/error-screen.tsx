import type { ReactNode } from "react";

export function ErrorScreen({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-khepree-ink">{title}</h1>
      <p className="text-sm leading-relaxed text-khepree-slate/80">{description}</p>
      {children}
    </div>
  );
}
