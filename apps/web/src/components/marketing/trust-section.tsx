import Link from "next/link";
import { BodyText, Container, Title, cn } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";

const SIGNALS = [
  { key: "clearPrice", icon: "₫" },
  { key: "clearLicense", icon: "◫" },
  { key: "clearUpdates", icon: "↻" },
  { key: "clearSupport", icon: "◈" },
] as const;

const LINKS = [
  { key: "linkTrust", path: "/trust" },
  { key: "linkSecurity", path: "/security" },
  { key: "linkChangelog", path: "/changelog" },
] as const;

export function TrustSection({
  locale,
  messages,
}: {
  locale: SupportedLocale;
  messages: Messages;
}) {
  return (
    <section className="section-surface border-y border-border section-py">
      <Container>
        <Title className="max-w-2xl text-pretty">{messages.trust.heading}</Title>
        <ul className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5">
          {SIGNALS.map(({ key, icon }) => {
            const item = messages.trust[key];
            return (
              <li key={key}>
                <article className="marketing-card marketing-card-lift h-full p-5 sm:p-6">
                  <span
                    aria-hidden
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border border-teal/15 bg-teal/10 text-sm font-semibold text-teal"
                  >
                    {icon}
                  </span>
                  <h3 className="mt-3.5 text-base font-semibold text-foreground sm:text-lg">{item.title}</h3>
                  <BodyText className="mt-2 text-base leading-relaxed">{item.copy}</BodyText>
                </article>
              </li>
            );
          })}
        </ul>
        <ul className={cn("mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm sm:text-base")}>
          {LINKS.map(({ key, path }) => (
            <li key={path}>
              <Link
                href={localePath(locale, path)}
                className="font-medium text-teal transition-colors hover:text-teal/80 hover:underline"
              >
                {messages.trust[key]}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
