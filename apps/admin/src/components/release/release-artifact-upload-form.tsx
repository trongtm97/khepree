"use client";

import { Alert, Button, Input, Select } from "@khepree/ui";
import { useState } from "react";
import {
  addReleaseArtifactAction,
  prepareReleaseUploadAction,
} from "@/app/(admin)/products/release-actions";

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function ReleaseArtifactUploadForm({
  releaseId,
  releasePublicId,
  productId,
}: {
  releaseId: string;
  releasePublicId: string;
  productId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!file) {
      setError("Chọn tệp artifact");
      return;
    }

    setPending(true);
    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      formData.set("productId", productId);
      formData.set("releaseId", releaseId);
      formData.set("releasePublicId", releasePublicId);
      formData.set("fileName", file.name);
      formData.set("mimeType", file.type || "application/octet-stream");
      formData.set("sizeBytes", String(file.size));

      const prepared = await prepareReleaseUploadAction({}, formData);
      if (prepared.error || !prepared.uploadUrl || !prepared.objectKey) {
        setError(prepared.error ?? "Không thể chuẩn bị upload");
        return;
      }

      const uploadResponse = await fetch(prepared.uploadUrl, {
        method: "PUT",
        body: file,
        headers: prepared.uploadHeaders ?? { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!uploadResponse.ok) {
        setError("Upload thất bại");
        return;
      }

      const checksum = await sha256Hex(file);
      formData.set("fileSize", String(file.size));
      formData.set("checksumSha256", checksum);
      formData.set("objectKey", prepared.objectKey);

      const created = await addReleaseArtifactAction({}, formData);
      if (created.error) {
        setError(created.error);
        return;
      }
      setNotice(created.notice ?? "Đã thêm artifact");
      form.reset();
      setFile(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload thất bại");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}
      <Select
        name="kind"
        label="Loại artifact"
        defaultValue="full-nupkg"
        options={[
          { value: "installer", label: "installer" },
          { value: "full-nupkg", label: "full-nupkg" },
          { value: "delta-nupkg", label: "delta-nupkg" },
          { value: "releases-index", label: "releases-index" },
        ]}
      />
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Tệp artifact</span>
        <input
          type="file"
          required
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
      </label>
      <Input name="manifestSignature" label="Chữ ký manifest (CI, base64)" required />
      <Input name="signingKeyId" label="Update signing keyId" required />
      <Button type="submit" disabled={pending}>
        {pending ? "Đang tải lên…" : "Thêm artifact"}
      </Button>
    </form>
  );
}
