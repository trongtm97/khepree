import { getOfficialContactLinks, type OfficialContactChannel } from "@khepree/config";
import { cn } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";
import { ExternalLink } from "./external-link";
import { SocialChannelIcon } from "./social-channel-icon";

function channelLabel(channel: OfficialContactChannel, messages: Messages): string {
  return messages.pages.contact.officialChannels.labels[channel];
}

function channelSubtitle(link: ReturnType<typeof getOfficialContactLinks>[number]): string {
  return link.displayValue ?? link.handle ?? "";
}

export function OfficialContactFooterIcons({ messages }: { messages: Messages }) {
  const links = getOfficialContactLinks();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {messages.footer.connect}
      </p>
      <ul
        className="mt-2 flex flex-wrap gap-2"
        aria-label={messages.footer.officialChannels}
      >
        {links.map((link) => (
          <li key={link.id}>
            <ExternalLink
              href={link.href}
              aria-label={channelLabel(link.id, messages)}
              title={channelLabel(link.id, messages)}
              className={cn(
                "group inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)]",
                "border border-border/80 bg-surface text-muted transition-colors",
                "hover:border-teal/30 hover:bg-teal/5 hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40",
              )}
            >
              <SocialChannelIcon channel={link.id} size="sm" className="group-hover:text-current" />
            </ExternalLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OfficialContactChannelGrid({ messages }: { messages: Messages }) {
  const links = getOfficialContactLinks();
  const copy = messages.pages.contact.officialChannels;

  return (
    <section className="mt-14">
      <h2 className="text-xl font-semibold text-foreground">{copy.heading}</h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{copy.description}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <li key={link.id}>
            <ExternalLink
              href={link.href}
              className={cn(
                "group flex h-full min-h-[7.5rem] flex-col rounded-[var(--radius-card)] border border-border",
                "bg-surface/50 p-5 transition-colors hover:border-teal/30 hover:bg-surface",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40",
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)]",
                    "bg-teal/10 text-teal transition-colors group-hover:bg-teal/15",
                  )}
                >
                  <SocialChannelIcon channel={link.id} />
                </span>
                <span
                  aria-hidden
                  className="text-sm text-muted transition-colors group-hover:text-teal"
                >
                  ↗
                </span>
              </span>
              <span className="mt-4 block text-sm font-semibold text-foreground">
                {channelLabel(link.id, messages)}
              </span>
              <span className="mt-1 block text-sm text-muted">{channelSubtitle(link)}</span>
            </ExternalLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
