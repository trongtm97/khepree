/** Map runtime storage adapter id to persisted enum value. */
export function storageProviderForDb(provider: string): "s3" | "mock" | "r2" {
  if (provider === "mock") return "mock";
  if (provider === "r2") return "r2";
  return "s3";
}
