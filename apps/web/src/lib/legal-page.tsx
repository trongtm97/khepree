import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  canPublishLegalPage,
  getLegalPageMeta,
  type LegalPageId,
} from "@khepree/config";
import {
  LegalDocumentPage,
  type LegalPageContent,
} from "@/components/legal/legal-document-page";
import { getMessages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, type SupportedLocale } from "@/lib/i18n/config";
import { createPageMetadata } from "@/lib/seo/metadata";

type LegalMessageKey = "privacy" | "terms" | "refund" | "eula" | "cookies";

export function createLegalRoute(pageId: LegalPageId, contactEmail?: () => string) {
  const meta = getLegalPageMeta(pageId);
  const messageKey = pageId as LegalMessageKey;

  async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> {
    const { locale: raw } = await params;
    if (!isSupportedLocale(raw) || !canPublishLegalPage(meta)) return {};
    const content = getMessages(raw).pages[messageKey] as LegalPageContent;
    return createPageMetadata({
      locale: raw,
      title: content.title,
      description: content.description,
      path: meta.path,
    });
  }

  async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale: raw } = await params;
    if (!isSupportedLocale(raw) || !canPublishLegalPage(meta)) notFound();

    const locale: SupportedLocale = raw;
    const messages = getMessages(locale);
    const content = messages.pages[messageKey] as LegalPageContent;

    return (
      <LegalDocumentPage
        locale={locale}
        siteName={messages.meta.siteName}
        content={content}
        meta={meta}
        contactEmail={contactEmail?.()}
      />
    );
  }

  return { generateMetadata, default: Page };
}
