import { SITE_URL } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
