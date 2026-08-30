import type { Metadata } from "next";
import { ContentListView } from "@/components/content/content-list-view";

export const metadata: Metadata = { title: "Trang" };

export default function PagesContentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; locale?: string; status?: string; page?: string }>;
}) {
  return (
    <ContentListView
      contentType="page"
      title="Trang"
      description="Landing pages và trang tĩnh."
      searchParams={searchParams}
    />
  );
}
