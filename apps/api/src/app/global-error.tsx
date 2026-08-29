"use client";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en">
      <body>
        <h1>Unexpected error</h1>
        <p>{error.digest ? `Reference ${error.digest}` : "Request failed"}</p>
      </body>
    </html>
  );
}
