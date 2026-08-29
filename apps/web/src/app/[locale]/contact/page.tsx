import { createMarketingPage } from "@/lib/marketing-page";

const { generateMetadata, default: Page } = createMarketingPage({
  pageKey: "contact",
  path: "/contact",
});

export { generateMetadata };
export default Page;
