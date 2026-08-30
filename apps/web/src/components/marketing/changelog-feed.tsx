import { Badge, BodyText, GlassPanel } from "@khepree/ui";
import Link from "next/link";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";

export interface ChangelogEntryView {
  releasePublicId: string;
  productSlug: string;
  productName: string;
  version: string;
  platform: "windows" | "macos" | "linux";
  architecture: string;
  channel: "stable" | "beta" | "alpha";
  publishedAt: string;
  releaseNotes: string | null;
}

const PLATFORM_LABEL: Record<ChangelogEntryView["platform"], string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

export interface ChangelogLabels {
  allProducts: string;
  version: string;
  released: string;
  platform: string;
  channel: string;
  releaseNotes: string;
  viewProduct: string;
  downloads: string;
}

function formatReleaseDate(iso: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(iso));
}

function ReleaseCard({
  entry,
  locale,
  labels,
  accountDownloadsUrl,
}: {
  entry: ChangelogEntryView;
  locale: SupportedLocale;
  labels: ChangelogLabels;
  accountDownloadsUrl: string;
}) {
  return (
    <GlassPanel className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-teal">
            <Link
              href={localePath(locale, `/products/${entry.productSlug}#changelog`)}
              className="hover:underline"
            >
              {entry.productName}
            </Link>
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {labels.version} {entry.version}
          </h2>
        </div>
        <time dateTime={entry.publishedAt} className="text-sm text-muted">
          {labels.released}: {formatReleaseDate(entry.publishedAt, locale)}
        </time>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
        <div>
          <dt className="sr-only">{labels.platform}</dt>
          <dd>
            {PLATFORM_LABEL[entry.platform]} · {entry.architecture}
          </dd>
        </div>
        {entry.channel !== "stable" ? (
          <div className="flex items-center gap-2">
            <dt className="sr-only">{labels.channel}</dt>
            <dd>
              <Badge variant="outline">{entry.channel}</Badge>
            </dd>
          </div>
        ) : null}
      </dl>

      {entry.releaseNotes ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {labels.releaseNotes}
          </p>
          <BodyText className="mt-2 whitespace-pre-line">{entry.releaseNotes}</BodyText>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link
          href={localePath(locale, `/products/${entry.productSlug}`)}
          className="font-medium text-teal hover:underline"
        >
          {labels.viewProduct}
        </Link>
        <a href={accountDownloadsUrl} className="font-medium text-teal hover:underline">
          {labels.downloads}
        </a>
      </div>
    </GlassPanel>
  );
}

export function ChangelogFeed({
  entries,
  locale,
  labels,
  accountDownloadsUrl,
}: {
  entries: ChangelogEntryView[];
  locale: SupportedLocale;
  labels: ChangelogLabels;
  accountDownloadsUrl: string;
}) {
  const products = [...new Map(entries.map((e) => [e.productSlug, e.productName])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1]),
  );

  return (
    <div>
      {products.length > 1 ? (
        <nav aria-label={labels.allProducts} className="mb-8 flex flex-wrap gap-2">
          <Link
            href={localePath(locale, "/changelog")}
            className="rounded-full border border-teal bg-teal/10 px-3 py-1.5 text-sm text-foreground"
          >
            {labels.allProducts}
          </Link>
          {products.map(([slug, name]) => (
            <Link
              key={slug}
              href={localePath(locale, `/products/${slug}#changelog`)}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-teal/40 hover:text-foreground"
            >
              {name}
            </Link>
          ))}
        </nav>
      ) : null}

      <ol className="space-y-4">
        {entries.map((entry) => (
          <li key={entry.releasePublicId}>
            <ReleaseCard
              entry={entry}
              locale={locale}
              labels={labels}
              accountDownloadsUrl={accountDownloadsUrl}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
