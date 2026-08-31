import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildDeviceProofMessage, verifyDeviceProofSignature } from "./device-proof";

describe("device proof", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicKeySpkiBase64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");

  function signProof(input: {
    sessionPublicId: string;
    timestamp: number;
    nonce: string;
    method: string;
    path: string;
    bodySha256: string;
  }) {
    const message = buildDeviceProofMessage(input);
    const signature = sign(null, Buffer.from(message, "utf8"), privateKey).toString("base64");
    return { ...input, signature };
  }

  it("accepts a valid signature inside the timestamp window", () => {
    const now = 1_700_000_000;
    const proof = signProof({
      sessionPublicId: "dss_test",
      timestamp: now,
      nonce: "nonce-1",
      method: "POST",
      path: "/api/v1/desktop/auth/refresh",
      bodySha256: "abc123",
    });
    expect(() =>
      verifyDeviceProofSignature({
        devicePublicKey: publicKeySpkiBase64,
        sessionPublicId: "dss_test",
        proof,
        nowSeconds: now,
        toleranceSeconds: 120,
      }),
    ).not.toThrow();
  });

  it("rejects an invalid signature", () => {
    const now = 1_700_000_000;
    const proof = signProof({
      sessionPublicId: "dss_test",
      timestamp: now,
      nonce: "nonce-2",
      method: "POST",
      path: "/api/v1/desktop/auth/refresh",
      bodySha256: "abc123",
    });
    expect(() =>
      verifyDeviceProofSignature({
        devicePublicKey: publicKeySpkiBase64,
        sessionPublicId: "dss_test",
        proof: { ...proof, signature: Buffer.from("bad").toString("base64") },
        nowSeconds: now,
      }),
    ).toThrow(expect.objectContaining({ code: "DEVICE_PROOF_INVALID" }));
  });

  it("rejects stale timestamps", () => {
    const proof = signProof({
      sessionPublicId: "dss_test",
      timestamp: 1_700_000_000,
      nonce: "nonce-3",
      method: "POST",
      path: "/api/v1/desktop/auth/refresh",
      bodySha256: "abc123",
    });
    expect(() =>
      verifyDeviceProofSignature({
        devicePublicKey: publicKeySpkiBase64,
        sessionPublicId: "dss_test",
        proof,
        nowSeconds: 1_700_000_000 + 500,
        toleranceSeconds: 120,
      }),
    ).toThrow(expect.objectContaining({ code: "DEVICE_PROOF_INVALID" }));
  });
});
