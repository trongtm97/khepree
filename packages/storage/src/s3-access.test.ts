import { describe, expect, it } from "vitest";
import {
  PUBLIC_OBJECT_ACL,
  PUBLIC_OBJECT_ACL_HEADER,
  publicAclPutFields,
  publicAclUploadHeaders,
  isPublicAclUnsupported,
} from "./s3-access";

describe("s3-access", () => {
  it("adds public-read ACL fields in acl mode", () => {
    expect(publicAclPutFields("acl")).toEqual({
      ACL: PUBLIC_OBJECT_ACL,
      CacheControl: "public, max-age=31536000, immutable",
    });
    expect(publicAclUploadHeaders("acl")).toEqual({
      [PUBLIC_OBJECT_ACL_HEADER]: PUBLIC_OBJECT_ACL,
    });
  });

  it("omits ACL fields in none mode", () => {
    expect(publicAclPutFields("none")).toEqual({});
    expect(publicAclUploadHeaders("none")).toEqual({});
  });

  it("detects ACL unsupported errors", () => {
    expect(isPublicAclUnsupported({ name: "AccessControlListNotSupported" })).toBe(true);
    expect(isPublicAclUnsupported({ Code: "AccessDenied" })).toBe(true);
    expect(isPublicAclUnsupported({ message: "does not allow ACLs" })).toBe(true);
    expect(isPublicAclUnsupported(new Error("network"))).toBe(false);
  });
});
