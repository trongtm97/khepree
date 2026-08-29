import { createMarketingPage } from "@/lib/marketing-page";

const { generateMetadata, default: Page } = createMarketingPage({
  pageKey: "solutions",
  path: "/solutions",
});

export { generateMetadata };
export default Page;
