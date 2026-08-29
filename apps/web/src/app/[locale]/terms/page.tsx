import { createMarketingPage } from "@/lib/marketing-page";

const { generateMetadata, default: Page } = createMarketingPage({
  pageKey: "terms",
  path: "/terms",
});

export { generateMetadata };
export default Page;
