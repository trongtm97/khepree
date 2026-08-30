import { describe, expect, it } from "vitest";
import { getEnv } from "./env";
import {
  isPublicStorageConfigured,
  isPrivateStorageConfigured,
  isS3StorageConfigured,
  resolveStorageCredentials,
} from "./storage-env";

describe("storage-env", () => {
  it("prefers S3 credentials when S3_ENDPOINT is set", () => {
    const env = getEnv({
      S3_ENDPOINT: "https://s3.vietnix.example",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET_PUBLIC: "khepree-public",
      S3_BUCKET_PRIVATE: "khepree-private",
      S3_FORCE_PATH_STYLE: "true",
      R2_ACCOUNT_ID: "legacy",
      R2_ACCESS_KEY_ID: "legacy-key",
      R2_SECRET_ACCESS_KEY: "legacy-secret",
      R2_BUCKET_PUBLIC: "legacy-public",
      R2_BUCKET_PRIVATE: "legacy-private",
    });

    expect(isS3StorageConfigured(env)).toBe(true);
    const creds = resolveStorageCredentials(env);
    expect(creds?.source).toBe("s3");
    expect(creds?.endpoint).toBe("https://s3.vietnix.example");
    expect(creds?.forcePathStyle).toBe(true);
    expect(isPublicStorageConfigured(env)).toBe(true);
    expect(isPrivateStorageConfigured(env)).toBe(true);
  });

  it("falls back to R2 when S3 is unset", () => {
    const env = getEnv({
      R2_ACCOUNT_ID: "acct",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET_PUBLIC: "pub",
      R2_BUCKET_PRIVATE: "prv",
    });

    const creds = resolveStorageCredentials(env);
    expect(creds?.source).toBe("r2");
    expect(creds?.endpoint).toContain("r2.cloudflarestorage.com");
  });
});
