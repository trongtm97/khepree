import { createMarketingPage } from "@/lib/marketing-page";

const { generateMetadata, default: Page } = createMarketingPage({
  pageKey: "terms",
  path: "/terms",
  renderBody: (messages) => (
    <div className="mt-6 space-y-4">
      {messages.pages.terms.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <p className="mt-8 text-sm text-khepree-slate/70">{messages.pages.terms.legalReview}</p>
    </div>
  ),
});

export { generateMetadata };
export default Page;
