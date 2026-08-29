import { getRequestId, jsonOk } from "@/lib/api-response";

export async function GET(request: Request) {
  return jsonOk(
    {
      service: "khepree-api",
      version: "0.1.0",
      status: "ok",
    },
    getRequestId(request),
  );
}
