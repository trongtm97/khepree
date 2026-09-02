import type { ArtifactVerificationResult } from "@khepree/catalog";
import { AdminStatusBadge } from "@/components/admin";

const stateTone = {
  verified: "success",
  missing_signature: "warning",
  untrusted_key: "danger",
  storage_mismatch: "danger",
} as const;

const stateLabel = {
  verified: "Verified",
  missing_signature: "Thiếu chữ ký",
  untrusted_key: "Key không tin cậy",
  storage_mismatch: "Hash/ký không khớp",
} as const;

export function ReleaseArtifactVerificationList({
  items,
}: {
  items: ArtifactVerificationResult[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-khepree-slate/60">Chưa có artifact.</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.artifactPublicId} className="rounded border border-khepree-mist px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{item.kind}</span>
            <span className="text-khepree-slate/70">{item.fileName}</span>
            <AdminStatusBadge
              label={stateLabel[item.state]}
              tone={stateTone[item.state]}
            />
          </div>
          {item.detail ? <p className="mt-1 text-xs text-khepree-slate/70">{item.detail}</p> : null}
        </li>
      ))}
    </ul>
  );
}
