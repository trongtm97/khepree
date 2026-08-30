import { Container } from "@khepree/ui";
import Link from "next/link";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { type AudienceSlug } from "@/lib/audiences";

export { AUDIENCE_SLUGS, isAudienceSlug, type AudienceSlug } from "@/lib/audiences";

type AudienceCard = Exclude<Messages["audience"][keyof Messages["audience"]], string>;

const MESSAGE_KEY: Record<AudienceSlug, Exclude<keyof Messages["audience"], "heading">> = {
  creators: "creators",
  professionals: "professionals",
  entrepreneurs: "entrepreneurs",
  business: "businesses",
};

export function audienceCopy(messages: Messages, slug: AudienceSlug): AudienceCard {
  return messages.audience[MESSAGE_KEY[slug]];
}

export function AudienceSection({
  locale,
  messages,
}: {
  locale: SupportedLocale;
  messages: Messages;
}) {
  const creators = audienceCopy(messages, "creators");
  const professionals = audienceCopy(messages, "professionals");
  const entrepreneurs = audienceCopy(messages, "entrepreneurs");
  const business = audienceCopy(messages, "business");

  return (
    <section className="py-16 lg:py-24">
      <Container>
        <h2 className="text-3xl font-semibold tracking-tight">{messages.audience.heading}</h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <Link
            href={localePath(locale, "/solutions/creators")}
            className="group rounded-[var(--radius-card)] bg-khepree-ink p-8 text-khepree-white lg:row-span-2"
          >
            <h3 className="text-2xl font-semibold">{creators.title}</h3>
            <p className="mt-3 text-white/80">{creators.copy}</p>
          </Link>
          <Link
            href={localePath(locale, "/solutions/professionals")}
            className="rounded-[var(--radius-card)] border border-khepree-mist p-6 hover:border-khepree-teal/40"
          >
            <h3 className="text-xl font-semibold">{professionals.title}</h3>
            <p className="mt-3 text-khepree-slate/80">{professionals.copy}</p>
          </Link>
          <Link
            href={localePath(locale, "/solutions/entrepreneurs")}
            className="rounded-[var(--radius-card)] border border-khepree-mist p-6 hover:border-khepree-teal/40"
          >
            <h3 className="text-xl font-semibold">{entrepreneurs.title}</h3>
            <p className="mt-3 text-khepree-slate/80">{entrepreneurs.copy}</p>
          </Link>
          <Link
            href={localePath(locale, "/solutions/business")}
            className="rounded-[var(--radius-card)] border border-khepree-mist bg-khepree-cloud/80 p-6 lg:col-span-2"
          >
            <h3 className="text-xl font-semibold">{business.title}</h3>
            <p className="mt-3 text-khepree-slate/80">{business.copy}</p>
          </Link>
        </div>
      </Container>
    </section>
  );
}
