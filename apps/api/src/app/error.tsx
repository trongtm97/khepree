"use client";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <main>
      <h1>Unexpected error</h1>
      <p>{error.digest ? `Reference ${error.digest}` : "Request failed"}</p>
    </main>
  );
}
