import type { ProductMarketingMetadata } from "./types";
import { mergeFullDescription } from "./studio-field-policy";

function section(title: string, body: string): string | null {
  const text = body.trim();
  if (!text) return null;
  return `## ${title}\n\n${text}`;
}

function lines(items: string[]): string {
  return items.filter(Boolean).join("\n");
}

/** Compose legacy marketing JSON blocks into markdown (read/migrate only — not entitlement). */
export function composeMarketingToMarkdown(marketing: ProductMarketingMetadata): string {
  const parts: string[] = [];

  const solutions = marketing.solutions?.length
    ? marketing.solutions
    : (marketing.benefits ?? []).map((b) => ({
        problem: b.title,
        helps: b.description,
        result: "",
      }));

  if (solutions.length) {
    parts.push(
      section(
        "Giới thiệu",
        lines(
          solutions.map((s) =>
            s.result ? `**${s.problem}**\n\n${s.helps}\n\n_${s.result}_` : `**${s.problem}**\n\n${s.helps}`,
          ),
        ),
      ) ?? "",
    );
  }

  if (marketing.highlights?.length) {
    parts.push(
      section(
        "Tính năng nổi bật",
        lines(marketing.highlights.map((h) => `- **${h.title}** — ${h.description}`)),
      ) ?? "",
    );
  }

  if (marketing.howItWorks?.length) {
    parts.push(
      section(
        "Cách hoạt động",
        lines(marketing.howItWorks.map((s) => `${s.step}. **${s.title}** — ${s.description}`)),
      ) ?? "",
    );
  }

  if (marketing.faq?.length) {
    parts.push(
      section(
        "Câu hỏi thường gặp",
        lines(marketing.faq.map((f) => `**${f.question}**\n\n${f.answer}`)),
      ) ?? "",
    );
  }

  return parts.filter(Boolean).join("\n\n").trim();
}

/** Client-safe read of legacy marketing JSON (no @khepree/db import). */
export function readMarketingMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ProductMarketingMetadata {
  const raw = metadata?.marketing;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as ProductMarketingMetadata;
}

export function resolvePublicFullDescription(input: {
  description: string | null;
  content: string | null;
  marketing?: ProductMarketingMetadata;
  /** Marketing JSON is VI-only legacy; only fall back for this locale (default vi). */
  locale?: string;
}): string | null {
  const merged = mergeFullDescription(input.description, input.content);
  if (merged.trim()) return merged;
  // Shared marketing blob uses hard-coded Vietnamese headings — never inject into EN.
  if ((input.locale ?? "vi") !== "vi") return null;
  const legacy = composeMarketingToMarkdown(input.marketing ?? {});
  return legacy.trim() || null;
}

/** Idempotent: only migrate when merged description+content is empty and marketing has blocks. */
export function migrateLegacyDescriptionCopy(input: {
  description: string | null;
  content: string | null;
  marketing: ProductMarketingMetadata;
}): { description: string | null; content: null; migrated: boolean } {
  const existing = mergeFullDescription(input.description, input.content);
  if (existing.trim()) {
    return { description: existing, content: null, migrated: false };
  }
  const composed = composeMarketingToMarkdown(input.marketing);
  if (!composed.trim()) {
    return { description: input.description, content: null, migrated: false };
  }
  return { description: composed, content: null, migrated: true };
}
