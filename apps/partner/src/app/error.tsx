"use client";

import { Button, ErrorScreen } from "@khepree/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorScreen
      title="Something went wrong"
      description={
        error.digest
          ? `An unexpected error occurred. Reference ${error.digest}`
          : "An unexpected error occurred. Try again, or come back later if this continues."
      }
    >
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </ErrorScreen>
  );
}
