import { getAuth } from "@khepree/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

let handlers: ReturnType<typeof toNextJsHandler> | null = null;

function authHandlers() {
  if (!handlers) {
    handlers = toNextJsHandler(getAuth());
  }
  return handlers;
}

export async function GET(request: Request) {
  return authHandlers().GET(request);
}

export async function POST(request: Request) {
  return authHandlers().POST(request);
}
