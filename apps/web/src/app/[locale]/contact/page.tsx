import { createMarketingPage } from "@/lib/marketing-page";

const { generateMetadata, default: Page } = createMarketingPage({
  pageKey: "contact",
  path: "/contact",
  renderBody: (messages) => (
    <p className="mt-6">
      <a className="text-khepree-teal underline" href={`mailto:${messages.pages.contact.email}`}>
        {messages.pages.contact.emailLabel}
      </a>
    </p>
  ),
});

export { generateMetadata };
export default Page;
