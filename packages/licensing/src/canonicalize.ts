function canonicalizeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isInteger(value)) throw new Error("Lease payload numbers must be integers");
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalizeValue).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalizeValue(record[key])}`).join(",")}}`;
  }
  throw new Error("Lease payload contains a non-canonical value");
}

export function canonicalizeLeasePayload(payload: unknown): string {
  return canonicalizeValue(payload);
}
