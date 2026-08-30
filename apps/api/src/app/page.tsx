import { apiPublicUrl } from "@khepree/config";

export default function ApiRootPage() {
  const apiHost = apiPublicUrl() ?? "API";
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>Khepree API</h1>
      <p>
        Business API at <code>/api/v1/*</code> — {apiHost}
      </p>
    </main>
  );
}
