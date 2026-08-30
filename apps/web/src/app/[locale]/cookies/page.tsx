import { createLegalRoute } from "@/lib/legal-page";

const { generateMetadata, default: Page } = createLegalRoute("cookies");

export { generateMetadata };
export default Page;
