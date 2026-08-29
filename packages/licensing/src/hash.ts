import { createHash } from "node:crypto";
import { LicensingError } from "./errors";

const MIN_INSTALLATION_ID_LENGTH = 16;

export function hashInstallationId(installationId: string): string {
  const trimmed = installationId.trim();
  if (trimmed.length < MIN_INSTALLATION_ID_LENGTH) {
    throw new LicensingError("INVALID_LICENSE", "installationId is too short");
  }
  return createHash("sha256").update(trimmed, "utf8").digest("hex");
}

export function hashLeaseCanonical(canonical: string): string {
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
