import { createMarketingPage } from "@/lib/marketing-page";

const { generateMetadata, default: Page } = createMarketingPage({
  pageKey: "security",
  path: "/security",
});

export { generateMetadata };
export default Page;
