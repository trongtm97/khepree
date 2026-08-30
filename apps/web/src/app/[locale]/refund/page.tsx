import { getBillingContactEmail } from "@khepree/config";
import { createLegalRoute } from "@/lib/legal-page";

const { generateMetadata, default: Page } = createLegalRoute("refund", getBillingContactEmail);

export { generateMetadata };
export default Page;
