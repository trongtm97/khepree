import { createMarketingPage } from "@/lib/marketing-page";

const { generateMetadata, default: Page } = createMarketingPage({
  pageKey: "terms",
  path: "/terms",
  renderBody: (messages) => (
    <div className="mt-6 space-y-4">
      {messages.pages.terms.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  ),
});

export { generateMetadata };
export default Page;
