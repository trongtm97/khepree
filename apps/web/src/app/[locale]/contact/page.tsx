import {
  getPartnerContact,
  getPublicContactAddresses,
  type PartnerContact,
  type PublicContactAddresses,
} from "@khepree/config";
import { BodyText, Container, GlassPanel, GradientMesh, HeroEnergyField, HeroTitle, Title } from "@khepree/ui";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/marketing/button-link";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { getMessages, type Messages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";
import { createPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { notFound } from "next/navigation";

function ContactCard({
  title,
  copy,
  href,
  label,
  cta,
  external,
}: {
  title: string;
  copy: string;
  href: string;
  label: string;
  cta?: string;
  external?: boolean;
}) {
  return (
    <GlassPanel className="flex h-full flex-col p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <BodyText className="mt-3 flex-1">{copy}</BodyText>
      <p className="mt-4">
        <a
          href={href}
          className="font-medium text-teal hover:underline"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {label}
        </a>
      </p>
      {cta ? (
        <div className="mt-4">
          <ButtonLink
            href={href}
            variant="secondary"
            fullWidthMobile
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {cta}
          </ButtonLink>
        </div>
      ) : null}
    </GlassPanel>
  );
}

function buildContactCards(
  messages: Messages,
  addresses: PublicContactAddresses,
  partner: PartnerContact,
) {
  const cards = messages.pages.contact.cards;
  type CardItem = {
    key: string;
    title: string;
    copy: string;
    href: string;
    label: string;
    cta?: string;
    external?: boolean;
  };

  const items: CardItem[] = [
    {
      key: "support",
      title: cards.support.title,
      copy: cards.support.copy,
      href: `mailto:${addresses.support}`,
      label: addresses.support,
      cta: cards.support.cta,
    },
    {
      key: "general",
      title: cards.general.title,
      copy: cards.general.copy,
      href: `mailto:${addresses.hello}`,
      label: addresses.hello,
    },
  ];

  if (addresses.billing) {
    items.push({
      key: "billing",
      title: cards.billing.title,
      copy: cards.billing.copy,
      href: `mailto:${addresses.billing}`,
      label: addresses.billing,
    });
  }

  if (addresses.security) {
    items.push({
      key: "security",
      title: cards.security.title,
      copy: cards.security.copy,
      href: `mailto:${addresses.security}`,
      label: addresses.security,
    });
  }

  if (partner.kind === "url") {
    items.push({
      key: "partner",
      title: cards.partner.title,
      copy: cards.partner.copy,
      href: partner.href,
      label: partner.label,
      cta: cards.partner.ctaPortal,
      external: true,
    });
  } else {
    items.push({
      key: "partner",
      title: cards.partner.title,
      copy: cards.partner.copy,
      href: `mailto:${partner.address}`,
      label: partner.address,
      cta: cards.partner.ctaEmail,
    });
  }

  return items;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return {};
  const content = getMessages(raw).pages.contact;
  return createPageMetadata({
    locale: raw,
    title: content.title,
    description: content.description,
    path: "/contact",
  });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) notFound();
  const locale: SupportedLocale = raw;
  const messages = getMessages(locale);
  const content = messages.pages.contact;
  const addresses = getPublicContactAddresses();
  const partner = getPartnerContact();
  const cards = buildContactCards(messages, addresses, partner);

  const breadcrumbs = [
    { label: messages.meta.siteName, href: localePath(locale) },
    { label: content.title },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(
          breadcrumbs.filter((b) => b.href).map((b) => ({ name: b.label, href: b.href! })),
        )}
      />
      <section className="tech-section relative overflow-hidden border-b border-white/10">
        <GradientMesh tone="mixed" className="opacity-50" />
        <HeroEnergyField intensity="soft" />
        <Container className="relative px-5 py-14 sm:px-6 sm:py-16 lg:py-24">
          <Breadcrumbs items={breadcrumbs} />
          <HeroTitle className="mt-6 max-w-3xl text-foreground">{content.headline}</HeroTitle>
          <BodyText className="mt-4 max-w-2xl text-lg text-muted">{content.lead}</BodyText>
        </Container>
      </section>

      <Container className="px-5 py-14 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((card, index) => (
              <ScrollReveal key={card.key} delay={index * 50}>
                <ContactCard
                  title={card.title}
                  copy={card.copy}
                  href={card.href}
                  label={card.label}
                  cta={card.cta}
                  external={card.external}
                />
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <section className="mt-14 rounded-[var(--radius-card)] border border-border bg-surface/50 p-6 sm:p-8">
              <Title as="h2" className="text-xl">
                {content.guidance.heading}
              </Title>
              <p className="mt-4 text-base leading-relaxed text-muted">{content.guidance.intro}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-base leading-relaxed text-muted">
                {content.guidance.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-muted">{content.guidance.safetyNote}</p>
            </section>
          </ScrollReveal>
        </div>
      </Container>
    </>
  );
}
