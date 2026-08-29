import { createMarketingPage } from "@/lib/marketing-page";

const { generateMetadata, default: Page } = createMarketingPage({
  pageKey: "security",
  path: "/security",
  renderBody: (messages) => (
    <div className="mt-6 space-y-4">
      {messages.pages.security.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  ),
});

export { generateMetadata };
export default Page;
