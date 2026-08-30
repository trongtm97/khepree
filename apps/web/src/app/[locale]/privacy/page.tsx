import { getPrivacyContactEmail } from "@khepree/config";
import { createLegalRoute } from "@/lib/legal-page";

const { generateMetadata, default: Page } = createLegalRoute("privacy", getPrivacyContactEmail);

export { generateMetadata };
export default Page;
