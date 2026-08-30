import type { Metadata } from "next";
import { ContentListView } from "@/components/content/content-list-view";

export const metadata: Metadata = { title: "Tài liệu" };

export default function DocsContentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; locale?: string; status?: string; page?: string }>;
}) {
  return (
    <ContentListView
      contentType="doc"
      title="Tài liệu"
      description="Docs — Markdown, versioning, preview an toàn."
      searchParams={searchParams}
    />
  );
}
