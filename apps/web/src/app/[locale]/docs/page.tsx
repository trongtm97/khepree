import { createMarketingPage } from "@/lib/marketing-page";

const { generateMetadata, default: Page } = createMarketingPage({
  pageKey: "docs",
  path: "/docs",
});

export { generateMetadata };
export default Page;
