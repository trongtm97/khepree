import { createLegalRoute } from "@/lib/legal-page";

const { generateMetadata, default: Page } = createLegalRoute("eula");

export { generateMetadata };
export default Page;
