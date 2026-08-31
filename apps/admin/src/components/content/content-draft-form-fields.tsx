"use client";

import {
  countHeadings,
  countInternalLinks,
  countWords,
  estimateReadingMinutes,
  getContentSeoIssues,
  getContentSeoScore,
  warnSeoDescriptionLength,
  warnSeoTitleLength,
} from "@khepree/catalog/content/seo-validation";
import { Button, Input, Select, Textarea } from "@khepree/ui";
import { useEffect, useMemo, useState } from "react";
import { resolveMediaPublicUrlAction } from "@/app/(admin)/content/content-media-actions";
import { ContentImageDialog } from "@/components/content/ContentImageDialog";
import { ContentTiptapEditor } from "@/components/content/content-tiptap-editor";
import { buildContentCanonicalPath } from "@/lib/content-seo-paths";

const ISSUE_LABELS: Record<string, string> = {
  missing_seo_title: "Thiếu SEO title",
  missing_seo_description: "Thiếu meta description",
  seo_title_length: "Độ dài SEO title chưa tối ưu",
  seo_description_length: "Độ dài meta description chưa tối ưu",
  missing_excerpt: "Thiếu tóm tắt",
  missing_cover: "Thiếu ảnh đại diện",
  content_has_h1: "Nội dung chứa H1",
  missing_h2_long_content: "Bài dài nên có H2",
};

type CategoryOption = { value: string; label: string };

export function ContentDraftFormFields({
  defaultTitle = "",
  defaultExcerpt = "",
  defaultBody = "",
  defaultSeoTitle = "",
  defaultSeoDescription = "",
  defaultFeaturedMediaPublicId = "",
  defaultCategoryId = "",
  contentType,
  slug = "",
  categories = [],
  showSlug = false,
  defaultSlug = "",
}: {
  defaultTitle?: string;
  defaultExcerpt?: string;
  defaultBody?: string;
  defaultSeoTitle?: string;
  defaultSeoDescription?: string;
  defaultFeaturedMediaPublicId?: string;
  defaultCategoryId?: string;
  contentType: string;
  slug?: string;
  categories?: CategoryOption[];
  showSlug?: boolean;
  defaultSlug?: string;
}) {
  const [body, setBody] = useState(defaultBody);
  const [title, setTitle] = useState(defaultTitle);
  const [excerpt, setExcerpt] = useState(defaultExcerpt);
  const [seoTitle, setSeoTitle] = useState(defaultSeoTitle);
  const [seoDescription, setSeoDescription] = useState(defaultSeoDescription);
  const [featuredMediaPublicId, setFeaturedMediaPublicId] = useState(defaultFeaturedMediaPublicId);
  const [slugInput, setSlugInput] = useState(defaultSlug || slug);
  const [resolvedCoverUrl, setResolvedCoverUrl] = useState<string | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  const trimmedFeaturedId = featuredMediaPublicId.trim();
  const coverPreviewUrl = trimmedFeaturedId ? resolvedCoverUrl : null;

  const effectiveSlug = showSlug ? slugInput : slug;
  const canonicalPath = buildContentCanonicalPath(contentType, effectiveSlug);

  useEffect(() => {
    if (!trimmedFeaturedId) return;
    let cancelled = false;
    void resolveMediaPublicUrlAction(trimmedFeaturedId).then((result) => {
      if (!cancelled) setResolvedCoverUrl(result.url);
    });
    return () => {
      cancelled = true;
    };
  }, [trimmedFeaturedId]);

  const seoInput = useMemo(
    () => ({
      title,
      excerpt,
      content: body,
      contentType,
      coverMediaPublicId: featuredMediaPublicId,
      seoTitle,
      seoDescription,
    }),
    [title, excerpt, body, contentType, featuredMediaPublicId, seoTitle, seoDescription],
  );

  const issues = getContentSeoIssues(seoInput);
  const score = getContentSeoScore(seoInput);
  const wordCount = countWords(body);
  const readingMin = estimateReadingMinutes(body);
  const headings = countHeadings(body);
  const internalLinks = countInternalLinks(body);
  const previewTitle = seoTitle.trim() || title.trim() || "Tiêu đề trang";
  const previewDescription = seoDescription.trim() || excerpt.trim() || "Mô tả meta sẽ hiển thị ở đây.";
  const previewUrl = effectiveSlug
    ? `khepree.com › vi${canonicalPath}`
    : "khepree.com › …";

  return (
    <div className="space-y-4">
      <Input name="title" label="Tiêu đề" value={title} onChange={(e) => setTitle(e.target.value)} required />
      {showSlug ? (
        <Input
          name="slug"
          label="Slug (tự gợi ý nếu trống)"
          value={slugInput}
          onChange={(e) => setSlugInput(e.target.value)}
          placeholder="huong-dan-khepree"
        />
      ) : null}
      <Textarea name="excerpt" label="Tóm tắt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
      <div>
        <p className="mb-2 text-sm font-medium text-khepree-slate">Nội dung</p>
        <ContentTiptapEditor defaultValue={defaultBody} onValueChange={setBody} />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[16rem] flex-1">
            <Input
              name="featuredMediaPublicId"
              label="Ảnh đại diện (media public ID)"
              value={featuredMediaPublicId}
              onChange={(e) => setFeaturedMediaPublicId(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowCoverPicker(true)} type="button" variant="secondary">
            Chọn từ thư viện
          </Button>
        </div>
        {coverPreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin cover preview
          <img
            alt={previewTitle}
            className="max-h-40 rounded-lg border border-khepree-mist object-cover"
            src={coverPreviewUrl}
          />
        ) : null}
      </div>

      {showCoverPicker ? (
        <ContentImageDialog
          onClose={() => setShowCoverPicker(false)}
          onPick={(image) => {
            if (image.publicId) setFeaturedMediaPublicId(image.publicId);
            setResolvedCoverUrl(image.url);
          }}
          open={showCoverPicker}
          pickPublicId
          title="Chọn ảnh đại diện"
        />
      ) : null}

      {categories.length > 0 ? (
        <Select
          name="categoryId"
          label="Danh mục"
          defaultValue={defaultCategoryId}
          options={[{ value: "", label: "—" }, ...categories]}
        />
      ) : null}

      <div className="grid gap-4 border-t border-khepree-mist pt-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Input name="seoTitle" label="SEO Title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          <Textarea
            name="seoDescription"
            label="Meta Description"
            rows={3}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
          />
          <div className="rounded-lg border border-khepree-mist bg-khepree-cloud/20 px-3 py-2 text-xs text-khepree-slate/80">
            <p>
              <span className="font-medium">Canonical:</span>{" "}
              <code className="text-khepree-teal">/vi{canonicalPath}</code>
            </p>
            <p className="mt-1 text-khepree-slate/60">Tự suy từ slug — chưa lưu override riêng.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-khepree-mist bg-khepree-cloud/30 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-khepree-slate">SEO checklist</h3>
              <span className="text-sm font-bold text-khepree-teal">{score}/100</span>
            </div>
            <p className="mb-2 text-xs text-khepree-slate/70">
              {wordCount} từ · ~{readingMin} phút · {headings.total} heading · {internalLinks} link nội bộ
            </p>
            <ul className="space-y-1 text-xs">
              {issues.map((issue) => (
                <li className="text-amber-700" key={issue}>
                  ! {ISSUE_LABELS[issue] ?? issue}
                </li>
              ))}
              {issues.length === 0 ? <li className="text-emerald-700">✓ SEO cơ bản ổn</li> : null}
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-khepree-slate">Google preview</h3>
            <div className="rounded-lg border border-khepree-mist bg-white p-4">
              <p className="truncate text-sm text-[#202124]">{previewUrl}</p>
              <p className="mt-1 line-clamp-1 text-xl text-[#1a0dab]">{previewTitle}</p>
              <p className="mt-1 line-clamp-2 text-sm text-[#4d5156]">{previewDescription}</p>
            </div>
            {coverPreviewUrl ? (
              <div className="rounded-lg border border-khepree-mist bg-white p-3">
                <p className="mb-2 text-xs font-medium text-khepree-slate/70">OG preview (ảnh đại diện)</p>
                {/* eslint-disable-next-line @next/next/no-img-element -- admin OG preview */}
                <img alt="" className="max-h-32 w-full rounded object-cover" src={coverPreviewUrl} />
              </div>
            ) : null}
            {[...warnSeoTitleLength(seoTitle.trim() || title), ...warnSeoDescriptionLength(seoDescription)].map(
              (warning) => (
                <p className="text-xs text-amber-700" key={warning}>
                  ⚠ {warning}
                </p>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
