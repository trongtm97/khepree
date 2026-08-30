import { EmptyState } from "@khepree/ui";
import { adminUi } from "@/lib/labels";

export function AdminEmptyState({
  title = adminUi.noRows,
  description = adminUi.noRowsHint,
}: {
  title?: string;
  description?: string;
}) {
  return <EmptyState title={title} description={description} />;
}
