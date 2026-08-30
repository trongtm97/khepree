import type { Metadata } from "next";
import { PublicNotFound } from "@/components/seo/public-not-found";

export const metadata: Metadata = {
  title: "Not found | Khepree",
  robots: { index: false, follow: false },
};

export default PublicNotFound;
