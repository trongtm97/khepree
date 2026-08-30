import type { ReactNode } from "react";
import type { KhepreeNavSurfaceId } from "@khepree/config";

const ICONS: Record<KhepreeNavSurfaceId, ReactNode> = {
  marketing: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  account: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 19c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  app: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8h18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  partner: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path d="M7 11h10M12 6v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  download: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path d="M12 4v10M8 11l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  status: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path d="M4 12h4l2-4 4 8 2-4h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  developers: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  api: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path d="M7 8h10v8H7z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  admin: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path d="M12 3l8 4v6c0 4-3.5 7-8 8-4.5-1-8-4-8-8V7l8-4z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

export function SurfaceIcon({ id }: { id: KhepreeNavSurfaceId }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-teal/10 text-teal">
      {ICONS[id]}
    </span>
  );
}
