import { Card, CardDescription, CardTitle } from "@khepree/ui";
import Link from "next/link";
import type { ReactNode } from "react";

export function AdminStatCard({
  href,
  title,
  value,
  description,
}: {
  href?: string;
  title: string;
  value: ReactNode;
  description?: string;
}) {
  const body = (
    <Card className="h-full">
      <CardTitle>{title}</CardTitle>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
      {description ? <CardDescription className="mt-2">{description}</CardDescription> : null}
    </Card>
  );
  if (!href) return body;
  return (
    <Link href={href} className="group block">
      {body}
    </Link>
  );
}
