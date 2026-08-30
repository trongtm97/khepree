import { describe, expect, it } from "vitest";
import { getEnv } from "./env";
import {
  isPublicStorageConfigured,
  isPrivateStorageConfigured,
  isS3StorageConfigured,
  resolvePublicAccessMode,
  resolvePublicMediaBaseUrl,
  resolveStorageCredentials,
} from "./storage-env";

describe("storage-env", () => {
  it("resolves S3 credentials from env", () => {
    const env = getEnv({
      S3_ENDPOINT: "https://s3.vietnix.example",
      S3_REGION: "auto",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_BUCKET_PUBLIC: "khepree-public",
      S3_BUCKET_PRIVATE: "khepree-private",
      S3_PUBLIC_BASE_URL: "https://cdn.khepree.com",
      S3_FORCE_PATH_STYLE: "true",
      S3_PUBLIC_ACCESS_MODE: "acl",
    });

    expect(isS3StorageConfigured(env)).toBe(true);
    const creds = resolveStorageCredentials(env);
    expect(creds?.endpoint).toBe("https://s3.vietnix.example");
    expect(creds?.region).toBe("auto");
    expect(creds?.forcePathStyle).toBe(true);
    expect(isPublicStorageConfigured(env)).toBe(true);
    expect(isPrivateStorageConfigured(env)).toBe(true);
    expect(resolvePublicMediaBaseUrl(env)).toBe("https://cdn.khepree.com");
    expect(resolvePublicAccessMode(env)).toBe("acl");
  });

  it("requires S3_REGION for configured storage", () => {
    const env = getEnv({
      S3_ENDPOINT: "https://s3.vietnix.example",
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
    });
    expect(isS3StorageConfigured(env)).toBe(false);
  });
});
