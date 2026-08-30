import { createMarketingPage } from "@/lib/marketing-page";

const { generateMetadata, default: Page } = createMarketingPage({
  pageKey: "security",
  path: "/security",
  renderBody: (messages) => (
    <div className="mt-8 space-y-8">
      <ul className="grid gap-4">
        {messages.pages.security.benefits.map((item) => (
          <li key={item.title}>
            <h2 className="text-lg font-semibold text-khepree-ink">{item.title}</h2>
            <p className="mt-2">{item.copy}</p>
          </li>
        ))}
      </ul>
      <details className="rounded-[var(--radius-card)] border border-khepree-mist p-4">
        <summary className="cursor-pointer font-medium text-khepree-ink">
          {messages.pages.security.technicalHeading}
        </summary>
        <div className="mt-4 space-y-3">
          {messages.pages.security.technical.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </details>
      <p className="text-sm text-khepree-slate/70">{messages.pages.security.legalReview}</p>
    </div>
  ),
});

export { generateMetadata };
export default Page;
