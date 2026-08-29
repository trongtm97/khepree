import { createMarketingPage } from "@/lib/marketing-page";

const { generateMetadata, default: Page } = createMarketingPage({
  pageKey: "blog",
  path: "/blog",
});

export { generateMetadata };
export default Page;
