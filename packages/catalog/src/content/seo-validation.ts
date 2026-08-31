export type ContentSeoIssue =
  | "missing_seo_title"
  | "missing_seo_description"
  | "seo_title_length"
  | "seo_description_length"
  | "missing_excerpt"
  | "missing_cover"
  | "content_has_h1"
  | "missing_h2_long_content";

export type ContentSeoCheckInput = {
  title: string;
  excerpt: string;
  content: string;
  contentType: string;
  coverMediaPublicId: string;
  seoTitle: string;
  seoDescription: string;
};

const H1_MARKDOWN_REGEX = /^#\s+[^#]/m;
const H1_HTML_REGEX = /<h1[\s>]/i;
const H2_MARKDOWN_REGEX = /^##\s+/m;
const H2_HTML_REGEX = /<h2[\s>]/i;

export function countInternalLinks(content: string): number {
  const htmlLinks = content.match(/href="(\/[^"]+)"/gi)?.length ?? 0;
  const mdLinks = content.match(/\]\(\/[^)]+\)/g)?.length ?? 0;
  return htmlLinks + mdLinks;
}

export function countWords(content: string): number {
  const text = content.replace(/<[^>]+>/g, " ").replace(/[#>*_\[\]()`-]/g, " ").trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function estimateReadingMinutes(content: string): number {
  return Math.max(1, Math.ceil(countWords(content) / 200));
}

export function countHeadings(content: string) {
  const h2 =
    (content.match(/^##\s+/gm) ?? []).length + (content.match(/<h2[\s>]/gi) ?? []).length;
  const h3 =
    (content.match(/^###\s+/gm) ?? []).length + (content.match(/<h3[\s>]/gi) ?? []).length;
  const h4 =
    (content.match(/^####\s+/gm) ?? []).length + (content.match(/<h4[\s>]/gi) ?? []).length;
  return { h2, h3, h4, total: h2 + h3 + h4 };
}

export function getContentSeoIssues(input: ContentSeoCheckInput): ContentSeoIssue[] {
  const issues: ContentSeoIssue[] = [];

  if (!input.excerpt.trim()) {
    issues.push("missing_excerpt");
  }

  if (!input.seoTitle.trim()) issues.push("missing_seo_title");
  if (!input.seoDescription.trim()) issues.push("missing_seo_description");

  const titleLen = input.seoTitle.trim().length || input.title.trim().length;
  if (titleLen > 0 && (titleLen < 30 || titleLen > 65)) {
    issues.push("seo_title_length");
  }

  const descLen = input.seoDescription.trim().length;
  if (descLen > 0 && (descLen < 70 || descLen > 160)) {
    issues.push("seo_description_length");
  }

  if (input.contentType === "article" && !input.coverMediaPublicId.trim()) {
    issues.push("missing_cover");
  }

  if (H1_MARKDOWN_REGEX.test(input.content) || H1_HTML_REGEX.test(input.content)) {
    issues.push("content_has_h1");
  }

  const wordCount = countWords(input.content);
  if (
    wordCount > 400 &&
    !H2_MARKDOWN_REGEX.test(input.content) &&
    !H2_HTML_REGEX.test(input.content)
  ) {
    issues.push("missing_h2_long_content");
  }

  return [...new Set(issues)];
}

export function getContentSeoScore(input: ContentSeoCheckInput): number {
  const issues = getContentSeoIssues(input);
  const critical = ["content_has_h1"];
  const warnings = [
    "missing_seo_title",
    "missing_seo_description",
    "missing_excerpt",
    "missing_cover",
    "missing_h2_long_content",
  ];

  let score = 100;
  for (const issue of issues) {
    if (critical.includes(issue)) score -= 25;
    else if (warnings.includes(issue)) score -= 10;
    else score -= 5;
  }
  return Math.max(0, Math.min(100, score));
}

export function warnSeoTitleLength(title: string | null | undefined): string[] {
  const len = title?.trim().length ?? 0;
  if (len === 0) return ["SEO title đang trống."];
  if (len < 30) return ["SEO title ngắn (< 30 ký tự)."];
  if (len > 65) return ["SEO title dài (> 65 ký tự)."];
  return [];
}

export function warnSeoDescriptionLength(description: string | null | undefined): string[] {
  const len = description?.trim().length ?? 0;
  if (len === 0) return ["Meta description đang trống."];
  if (len < 70) return ["Meta description ngắn (< 70 ký tự)."];
  if (len > 160) return ["Meta description dài (> 160 ký tự)."];
  return [];
}
