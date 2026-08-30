import type { PublicChangelogEntry } from "@khepree/catalog";
import { releasePlatformLabel } from "@khepree/catalog";
import { downloadPublicUrl } from "@khepree/config";
import { BodyText, GlassPanel } from "@khepree/ui";
import Link from "next/link";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";

function formatReleaseDate(date: Date, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
  }).format(date);
}

export function ProductChangelogSection({
  entries,
  locale,
  title,
  versionLabel,
  releasedLabel,
  downloadsLabel,
  fullChangelogLabel,
}: {
  entries: PublicChangelogEntry[];
  locale: SupportedLocale;
  title: string;
  versionLabel: string;
  releasedLabel: string;
  downloadsLabel: string;
  fullChangelogLabel: string;
}) {
  if (entries.length === 0) return null;

  return (
    <section id="changelog" className="scroll-mt-32 border-t border-border py-14 lg:scroll-mt-36 lg:py-20">
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      <ol className="mt-8 space-y-4">
        {entries.map((entry) => (
          <li key={entry.releasePublicId}>
            <GlassPanel className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-foreground">
                  {versionLabel} {entry.version}
                </p>
                <time dateTime={entry.publishedAt.toISOString()} className="text-sm text-muted">
                  {releasedLabel}: {formatReleaseDate(entry.publishedAt, locale)}
                </time>
              </div>
              <p className="mt-2 text-sm text-muted">
                {releasePlatformLabel[entry.platform]} · {entry.architecture}
                {entry.channel !== "stable" ? ` · ${entry.channel}` : ""}
              </p>
              {entry.releaseNotes ? (
                <BodyText className="mt-3 whitespace-pre-line">{entry.releaseNotes}</BodyText>
              ) : null}
            </GlassPanel>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href={localePath(locale, "/changelog")} className="font-medium text-teal hover:underline">
          {fullChangelogLabel}
        </Link>
        <a href={downloadPublicUrl()} className="font-medium text-teal hover:underline">
          {downloadsLabel}
        </a>
      </div>
    </section>
  );
}
