import { cn } from "@khepree/ui";

const toneClass: Record<string, string> = {
  default: "bg-khepree-mist text-khepree-ink",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-800",
  muted: "bg-khepree-mist/60 text-khepree-slate/80",
};

export function AdminStatusBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: keyof typeof toneClass;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        toneClass[tone] ?? toneClass.default,
      )}
    >
      {label}
    </span>
  );
}

export function statusTone(status: string): keyof typeof toneClass {
  if (["active", "published", "succeeded", "paid", "available", "approved"].includes(status)) return "success";
  if (["pending", "draft"].includes(status)) return "warning";
  if (["suspended", "blocked", "failed", "revoked", "voided", "archived", "retired"].includes(status)) return "danger";
  return "muted";
}
