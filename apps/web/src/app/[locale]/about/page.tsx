import { createMarketingPage } from "@/lib/marketing-page";

const { generateMetadata, default: Page } = createMarketingPage({
  pageKey: "about",
  path: "/about",
  renderBody: (messages) => (
    <div className="mt-6 space-y-4">
      <p>{messages.pages.about.story1}</p>
      <p>{messages.pages.about.story2}</p>
      <p>{messages.pages.about.story3}</p>
    </div>
  ),
});

export { generateMetadata };
export default Page;
