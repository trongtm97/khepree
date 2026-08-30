"use client";

import { Alert, Button, Input, Select, Textarea } from "@khepree/ui";
import { useState } from "react";
import {
  createReleaseDraftAction,
  prepareReleaseUploadAction,
} from "@/app/(admin)/products/release-actions";

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function ReleaseUploadForm({ productId }: { productId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!file) {
      setError("Chọn tệp cài đặt");
      return;
    }

    setPending(true);
    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      formData.set("productId", productId);
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
      const draftData = new FormData(form);
      draftData.set("productId", productId);
      draftData.set("fileName", file.name);
      draftData.set("mimeType", file.type || "application/octet-stream");
      draftData.set("fileSize", String(file.size));
      draftData.set("checksumSha256", checksum);
      draftData.set("objectKey", prepared.objectKey);

      const created = await createReleaseDraftAction({}, draftData);
      if (created.error) {
        setError(created.error);
        return;
      }
      setNotice(created.notice ?? "Đã lưu draft");
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
      <Input name="version" label="Version" placeholder="1.0.0" required />
      <Select
        name="platform"
        label="Nền tảng"
        defaultValue="windows"
        options={[
          { value: "windows", label: "Windows" },
          { value: "macos", label: "macOS" },
          { value: "linux", label: "Linux" },
        ]}
      />
      <Select
        name="architecture"
        label="Kiến trúc"
        defaultValue="x64"
        options={[
          { value: "x64", label: "x64" },
          { value: "arm64", label: "ARM64" },
          { value: "universal", label: "Universal" },
        ]}
      />
      <Select
        name="channel"
        label="Kênh"
        defaultValue="stable"
        options={[
          { value: "stable", label: "Stable" },
          { value: "beta", label: "Beta" },
          { value: "alpha", label: "Alpha" },
        ]}
      />
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Tệp cài đặt</span>
        <input
          type="file"
          required
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
      </label>
      <Textarea name="releaseNotesVi" label="Release notes (VI)" />
      <Textarea name="releaseNotesEn" label="Release notes (EN)" />
      <Input name="minimumSupportedVersion" label="Phiên bản tối thiểu (tùy chọn)" placeholder="1.0.0" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="mandatoryUpdate" /> Bắt buộc cập nhật
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Đang tải lên…" : "Lưu draft"}
      </Button>
    </form>
  );
}
