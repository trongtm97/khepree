import { ArticleCard, Container, Title } from "@khepree/ui";
import Link from "next/link";
import type { PublishedContent } from "@khepree/catalog";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ScrollRevealStagger } from "./scroll-reveal";

export function ResourcesSection({
  locale,
  messages,
  items,
}: {
  locale: SupportedLocale;
  messages: Messages;
  items: Array<PublishedContent & { href: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <section className="border-t border-border py-16 lg:py-24">
      <Container>
        <Title>{messages.resources.heading}</Title>
        <p className="mt-3 max-w-2xl text-muted">{messages.resources.copy}</p>
        <ScrollRevealStagger>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <li key={`${item.contentType}-${item.slug}`}>
                <Link href={item.href} className="block h-full">
                  <ArticleCard
                    title={item.title}
                    excerpt={item.excerpt ?? undefined}
                    tag={
                      item.contentType === "article" ? messages.footer.blog : messages.footer.docs
                    }
                  />
                </Link>
              </li>
            ))}
          </ul>
        </ScrollRevealStagger>
        <div className="mt-8 flex flex-wrap gap-4 text-sm font-medium">
          <Link href={localePath(locale, "/blog")} className="text-teal hover:underline">
            {messages.footer.blog}
          </Link>
          <Link href={localePath(locale, "/docs")} className="text-teal hover:underline">
            {messages.footer.docs}
          </Link>
        </div>
      </Container>
    </section>
  );
}
