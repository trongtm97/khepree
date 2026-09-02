import type { AnnouncementCtaKind, AnnouncementSeverity } from "@khepree/db";
import { cn } from "@khepree/ui";

const severityStyles: Record<AnnouncementSeverity, string> = {
  info: "border-sky-200 bg-sky-50",
  success: "border-emerald-200 bg-emerald-50",
  warning: "border-amber-200 bg-amber-50",
  error: "border-red-200 bg-red-50",
  action_required: "border-violet-200 bg-violet-50",
};

const severityLabels: Record<AnnouncementSeverity, string> = {
  info: "Thông tin",
  success: "Thành công",
  warning: "Cảnh báo",
  error: "Lỗi",
  action_required: "Cần thao tác",
};

export function AnnouncementPreview({
  title,
  bodyHtml,
  severity,
  ctaKind,
  ctaLabel,
}: {
  title: string;
  bodyHtml: string;
  severity: AnnouncementSeverity;
  ctaKind: AnnouncementCtaKind;
  ctaLabel?: string | null;
}) {
  return (
    <div className="mx-auto max-w-md">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-khepree-slate/60">
        Xem trước desktop
      </p>
      <article
        className={cn(
          "rounded-[var(--radius-card)] border p-4 shadow-sm",
          severityStyles[severity],
        )}
        aria-label="Xem trước thông báo"
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-khepree-ink">{title || "Tiêu đề thông báo"}</h3>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium uppercase">
            {severityLabels[severity]}
          </span>
        </div>
        {bodyHtml ? (
          <div
            className="prose prose-sm max-w-none text-sm text-khepree-slate [&_a]:text-khepree-teal"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : (
          <p className="text-sm text-khepree-slate/70">Nội dung thông báo…</p>
        )}
        {ctaKind !== "none" && ctaLabel ? (
          <p className="mt-3 text-xs font-medium text-khepree-teal">{ctaLabel}</p>
        ) : null}
      </article>
    </div>
  );
}
