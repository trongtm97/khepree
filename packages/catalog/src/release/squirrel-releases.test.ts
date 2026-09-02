import { describe, expect, it } from "vitest";
import {
  buildSquirrelReleasesFile,
  filterSquirrelEntriesToKnownArtifacts,
  formatSquirrelReleaseEntry,
  parseSquirrelReleasesFile,
  sanitizeSquirrelNupkgFilename,
} from "./squirrel-releases";

/** Fixture compatible with Squirrel.Windows ReleaseEntry.ParseReleaseFile regex. */
const SAMPLE_RELEASES = `E3F67244E4166A65310C816221A12685C83F8E6F MyApp-1.0.0-full.nupkg 600725
0D777EA94C612E8BF1EA7379164CAEFBA6E24463 MyApp-1.0.1-delta.nupkg 6030
85F4D657F8424DD437D1B33CC4511EA7AD86B1A7 MyApp-1.0.1-full.nupkg 600752
`;

describe("parseSquirrelReleasesFile", () => {
  it("parses Squirrel-compatible RELEASES lines", () => {
    const entries = parseSquirrelReleasesFile(SAMPLE_RELEASES);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({
      sha1: "E3F67244E4166A65310C816221A12685C83F8E6F",
      filename: "MyApp-1.0.0-full.nupkg",
      sizeBytes: 600725,
    });
    expect(entries[1]?.filename).toBe("MyApp-1.0.1-delta.nupkg");
  });

  it("round-trips through formatSquirrelReleaseEntry", () => {
    const entries = parseSquirrelReleasesFile(SAMPLE_RELEASES);
    const rebuilt = buildSquirrelReleasesFile(entries);
    const again = parseSquirrelReleasesFile(rebuilt);
    expect(again).toEqual(entries);
  });

  it("rejects path traversal and header injection filenames", () => {
    expect(sanitizeSquirrelNupkgFilename("../evil.nupkg")).toBeNull();
    expect(sanitizeSquirrelNupkgFilename("ok-full.nupkg\r\nX-Injected: yes")).toBeNull();
    expect(() =>
      parseSquirrelReleasesFile(
        "E3F67244E4166A65310C816221A12685C83F8E6F ..\\evil.nupkg 100\n",
      ),
    ).toThrow(/Unsafe/);
  });

  it("filters entries to verified artifact metadata", () => {
    const entries = parseSquirrelReleasesFile(SAMPLE_RELEASES);
    const filtered = filterSquirrelEntriesToKnownArtifacts(entries, [
      { kind: "full-nupkg", fileName: "MyApp-1.0.1-full.nupkg", sizeBytes: 600752 },
      { kind: "delta-nupkg", fileName: "MyApp-1.0.1-delta.nupkg", sizeBytes: 6030 },
    ]);
    expect(filtered.map((entry) => entry.filename)).toEqual([
      "MyApp-1.0.1-delta.nupkg",
      "MyApp-1.0.1-full.nupkg",
    ]);
  });

  it("supports absolute package URLs in RELEASES lines", () => {
    const line = formatSquirrelReleaseEntry({
      sha1: "A".repeat(40),
      filename: "https://cdn.example.com/pkg/MyApp-2.0.0-full.nupkg",
      sizeBytes: 1234,
    });
    const [entry] = parseSquirrelReleasesFile(`${line}\n`);
    expect(entry?.filename).toBe("MyApp-2.0.0-full.nupkg");
    expect(entry?.sizeBytes).toBe(1234);
  });
});
