import { createMarketingPage } from "@/lib/marketing-page";

const { generateMetadata, default: Page } = createMarketingPage({
  pageKey: "privacy",
  path: "/privacy",
  renderBody: (messages) => (
    <div className="mt-6 space-y-4">
      {messages.pages.privacy.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  ),
});

export { generateMetadata };
export default Page;
