import type { Metadata } from "next";
import { AccountEmptyPage } from "@/lib/empty-page";

export const metadata: Metadata = { title: "Downloads" };

export default function DownloadsPage() {
  return (
    <AccountEmptyPage
      title="Downloads"
      description="No downloads available"
    />
  );
}
