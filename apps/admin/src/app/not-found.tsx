import { ErrorScreen } from "@khepree/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <ErrorScreen title="Page not found" description="That page does not exist.">
      <Link className="text-sm text-khepree-teal underline" href="/dashboard">
        Dashboard
      </Link>
    </ErrorScreen>
  );
}
