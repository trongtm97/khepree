import { getPublicContactAddresses } from "@khepree/config";
import { createLegalRoute } from "@/lib/legal-page";

const { generateMetadata, default: Page } = createLegalRoute(
  "terms",
  () => getPublicContactAddresses().support,
);

export { generateMetadata };
export default Page;
