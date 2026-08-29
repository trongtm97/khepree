export async function GET() {
  return Response.json({
    status: "ok",
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0",
  });
}
