import type { ObjectStorage } from "./types";

export interface StorageHealthReport {
  connected: boolean;
  publicBucketWrite: boolean;
  publicRead: boolean;
  privateBucketWrite: boolean;
  privateIsolation: boolean;
  privatePresignedGet: boolean;
  cdnUrlConfigured: boolean;
  publicAccessMode: string;
  errors: string[];
}

/** Non-destructive S3 connectivity probe using `_health/` prefix objects. */
export async function runStorageHealthCheck(input: {
  publicStorage: ObjectStorage;
  privateStorage: ObjectStorage;
  cdnUrlConfigured: boolean;
  publicAccessMode: string;
}): Promise<StorageHealthReport> {
  const errors: string[] = [];
  const prefix = `_health/${Date.now()}`;
  const publicKey = `${prefix}/public-probe.bin`;
  const privateKey = `${prefix}/private-probe.bin`;
  const body = Buffer.from("khepree-health-check");

  let connected = false;
  let publicBucketWrite = false;
  let publicRead = false;
  let privateBucketWrite = false;
  let privateIsolation = false;
  let privatePresignedGet = false;

  try {
    await input.publicStorage.putObject({
      key: publicKey,
      body,
      contentType: "application/octet-stream",
      bucket: "public",
    });
    publicBucketWrite = true;
    connected = true;

    if (input.publicStorage.verifyPublicReadAccess) {
      try {
        await input.publicStorage.verifyPublicReadAccess(publicKey);
        publicRead = true;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Public read verification failed");
      }
    } else {
      publicRead = true;
    }

    await input.privateStorage.putObject({
      key: privateKey,
      body,
      contentType: "application/octet-stream",
      bucket: "private",
    });
    privateBucketWrite = true;

    if (input.privateStorage.verifyPrivateNotPubliclyReadable) {
      try {
        await input.privateStorage.verifyPrivateNotPubliclyReadable(privateKey);
        privateIsolation = true;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Private isolation check failed");
      }
    } else {
      privateIsolation = true;
    }

    const presigned = await input.privateStorage.createPresignedDownload({
      key: privateKey,
      bucket: "private",
      expiresInSeconds: 60,
    });
    privatePresignedGet = Boolean(presigned.url);

    await Promise.all([
      input.publicStorage.deleteObject(publicKey, "public").catch(() => undefined),
      input.privateStorage.deleteObject(privateKey, "private").catch(() => undefined),
    ]);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Storage health check failed");
  }

  return {
    connected,
    publicBucketWrite,
    publicRead,
    privateBucketWrite,
    privateIsolation,
    privatePresignedGet,
    cdnUrlConfigured: input.cdnUrlConfigured,
    publicAccessMode: input.publicAccessMode,
    errors,
  };
}
