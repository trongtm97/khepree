export interface SecurityHeaderOptions {
  production?: boolean;
  requestId?: string;
}

export function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
  ].join("; ");
}

export function applySecurityHeaders(headers: Headers, options: SecurityHeaderOptions = {}): void {
  const production = options.production ?? process.env.NODE_ENV === "production";
  headers.set("Content-Security-Policy", contentSecurityPolicy());
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  if (production) {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  const requestId = options.requestId ?? crypto.randomUUID();
  headers.set("x-request-id", requestId);
}

export function attachSecurityHeaders(request: Request, response: Response, production?: boolean): string {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  applySecurityHeaders(response.headers, {
    production: production ?? process.env.NODE_ENV === "production",
    requestId,
  });
  return requestId;
}

export function isMaintenanceMode(source: NodeJS.ProcessEnv = process.env): boolean {
  return source.MAINTENANCE_MODE === "1" || source.MAINTENANCE_MODE === "true";
}
