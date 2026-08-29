"use client";

import "@khepree/ui/globals.css";
import { ErrorScreen } from "@khepree/ui";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body>
        <ErrorScreen
          title="Something went wrong"
          description={
            error.digest
              ? `An unexpected error occurred. Reference ${error.digest}`
              : "An unexpected error occurred."
          }
        />
      </body>
    </html>
  );
}
