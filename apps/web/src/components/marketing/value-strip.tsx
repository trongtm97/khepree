import { Container } from "@khepree/ui";
import type { ReactNode } from "react";
import type { Messages } from "@/lib/i18n/get-messages";

const KEYS = ["saveTime", "workSmarter", "createMore", "unlockOpportunities"] as const;

const ICONS: Record<(typeof KEYS)[number], ReactNode> = {
  saveTime: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 text-teal">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  workSmarter: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 text-cyan">
      <path d="M4 14l4-4 4 4 8-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  createMore: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 text-indigo">
      <path d="M12 4v16M4 12h16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  unlockOpportunities: (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 text-solar-accent">
      <path d="M7 12h10M12 7v10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="5" y="5" width="14" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

export function ValueStrip({ messages }: { messages: Messages }) {
  return (
    <section aria-label={messages.valueStrip.saveTime} className="border-b border-border bg-surface">
      <Container className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {KEYS.map((key) => (
          <div
            key={key}
            className="flex flex-col items-center gap-3 bg-background px-4 py-8 text-center motion-float"
            style={{ animationDelay: `${KEYS.indexOf(key) * 0.4}s` }}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated ring-1 ring-border-subtle">
              {ICONS[key]}
            </span>
            <p className="text-sm font-semibold text-foreground sm:text-base">{messages.valueStrip[key]}</p>
          </div>
        ))}
      </Container>
    </section>
  );
}
