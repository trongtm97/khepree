import { Card, CardDescription, CardTitle, Container } from "@khepree/ui";
import Link from "next/link";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { AUDIENCE_SLUGS, type AudienceSlug } from "@/lib/audiences";

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
  return (
    <section className="py-16 lg:py-24">
      <Container>
        <h2 className="text-3xl font-semibold tracking-tight">{messages.audience.heading}</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCE_SLUGS.map((slug) => {
            const item = audienceCopy(messages, slug);
            return (
              <Link key={slug} href={localePath(locale, `/solutions/${slug}`)} className="group block h-full">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription className="mt-2">{item.copy}</CardDescription>
                </Card>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
