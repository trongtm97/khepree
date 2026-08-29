import { EmptyState } from "@khepree/ui";
import type { ReactNode } from "react";

export function PartnerEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return <EmptyState title={title} description={description} action={action} />;
}
