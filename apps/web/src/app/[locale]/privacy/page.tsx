import { createMarketingPage } from "@/lib/marketing-page";

const { generateMetadata, default: Page } = createMarketingPage({
  pageKey: "privacy",
  path: "/privacy",
});

export { generateMetadata };
export default Page;
