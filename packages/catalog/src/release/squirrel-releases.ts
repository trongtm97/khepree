/** Squirrel.Windows RELEASES manifest — SHA1 filename size per line (see Squirrel ReleaseEntry.cs). */

export interface SquirrelReleaseEntry {
  sha1: string;
  filename: string;
  sizeBytes: number;
  stagingPercent?: number;
}

const ENTRY_REGEX = /^([0-9a-fA-F]{40})\s+(\S+)\s+(\d+)\s*(?:#\s*(\d{1,3})%)?\s*$/;
const SAFE_NUPKG_FILENAME = /^[\w.-]+(?:-full|-delta)?\.nupkg$/i;

/** Basename only — blocks path traversal and header injection via `/` or `\`. */
export function sanitizeSquirrelNupkgFilename(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("\0")) {
    return null;
  }
  if (trimmed.includes("\r") || trimmed.includes("\n")) return null;
  if (!SAFE_NUPKG_FILENAME.test(trimmed)) return null;
  return trimmed;
}

export function parseSquirrelReleasesFile(content: string): SquirrelReleaseEntry[] {
  const normalized = content.replace(/^\uFEFF/, "");
  const entries: SquirrelReleaseEntry[] = [];

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = ENTRY_REGEX.exec(line);
    if (!match) {
      throw new Error(`Invalid Squirrel RELEASES line: ${line.slice(0, 80)}`);
    }

    const filenameRaw = match[2]!;
    let filename = filenameRaw;
    if (/^https?:\/\//i.test(filenameRaw)) {
      try {
        const url = new URL(filenameRaw);
        filename = url.pathname.split("/").pop() ?? "";
      } catch {
        throw new Error(`Invalid Squirrel RELEASES URL: ${filenameRaw.slice(0, 80)}`);
      }
    }

    const safeName = sanitizeSquirrelNupkgFilename(filename);
    if (!safeName) {
      throw new Error(`Unsafe Squirrel RELEASES filename: ${filenameRaw.slice(0, 80)}`);
    }

    const sizeBytes = Number(match[3]);
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      throw new Error(`Invalid Squirrel RELEASES size: ${match[3]}`);
    }

    entries.push({
      sha1: match[1]!.toUpperCase(),
      filename: safeName,
      sizeBytes,
      stagingPercent: match[4] ? Number(match[4]) : undefined,
    });
  }

  return entries;
}

export function formatSquirrelReleaseEntry(entry: SquirrelReleaseEntry): string {
  const base = `${entry.sha1.toUpperCase()} ${entry.filename} ${entry.sizeBytes}`;
  if (entry.stagingPercent != null) {
    return `${base} # ${Math.round(entry.stagingPercent)}%`;
  }
  return base;
}

export function buildSquirrelReleasesFile(entries: SquirrelReleaseEntry[]): string {
  if (entries.length === 0) return "";
  return `${entries.map(formatSquirrelReleaseEntry).join("\n")}\n`;
}

export function rewriteSquirrelReleaseEntryUrl(
  entry: SquirrelReleaseEntry,
  absolutePackageUrl: string,
): SquirrelReleaseEntry {
  return {
    ...entry,
    filename: absolutePackageUrl,
  };
}

/** Keep only entries whose basename matches a published full/delta nupkg artifact. */
export function filterSquirrelEntriesToKnownArtifacts(
  entries: SquirrelReleaseEntry[],
  artifacts: Array<{ fileName: string; sizeBytes: number; kind: string }>,
): SquirrelReleaseEntry[] {
  const allowed = new Map(
    artifacts
      .filter((artifact) => artifact.kind === "full-nupkg" || artifact.kind === "delta-nupkg")
      .map((artifact) => [artifact.fileName, artifact.sizeBytes] as const),
  );

  return entries.filter((entry) => {
    const expectedSize = allowed.get(entry.filename);
    return expectedSize != null && expectedSize === entry.sizeBytes;
  });
}
