import type { Metadata } from "next";
import { ContentListView } from "@/components/content/content-list-view";

export const metadata: Metadata = { title: "Bài viết" };

export default function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; locale?: string; status?: string; page?: string }>;
}) {
  return (
    <ContentListView
      contentType="article"
      title="Bài viết"
      description="Blog — mặc định tiếng Việt, Markdown + preview."
      searchParams={searchParams}
    />
  );
}
