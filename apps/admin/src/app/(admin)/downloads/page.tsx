import { Input } from "@khepree/ui";
import type { Metadata } from "next";
import { signDownloadAction } from "@/app/(admin)/actions";
import { ActionForm } from "@/components/action-form";
import { requireAdmin } from "@/lib/admin-session";

export const metadata: Metadata = { title: "Downloads" };

export default async function DownloadsPage() {
  await requireAdmin("content.read");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Downloads</h1>
      <p className="text-sm text-khepree-slate/70">
        Mint a short-lived signed URL for private R2 objects through DownloadService.
      </p>
      <ActionForm action={signDownloadAction} submitLabel="Create signed URL">
        <Input name="mediaPublicId" label="Media public ID" required />
      </ActionForm>
    </div>
  );
}
