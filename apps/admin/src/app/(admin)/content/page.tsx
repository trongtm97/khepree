import { ADMIN_PAGE_SIZE, listAdminContent } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { Input, Select, Textarea } from "@khepree/ui";
import type { Metadata } from "next";
import { archiveDraftAction, createDraftAction, publishDraftAction } from "@/app/(admin)/actions";
import { ActionForm } from "@/components/action-form";
import { DataTable, Td } from "@/components/data-table";
import { Pagination } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireAdmin("content.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "content.write");
  const page = parsePage((await searchParams).page);
  const rows = await listAdminContent({ page });
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Content</h1>
      {canWrite ? (
        <ActionForm action={createDraftAction} submitLabel="Create draft">
          <Input name="slug" label="Slug" required />
          <Input name="title" label="Title" required />
          <Select
            name="contentType"
            label="Type"
            options={["page", "article", "doc", "product_page", "legal"].map((v) => ({
              value: v,
              label: v,
            }))}
          />
          <Select
            name="locale"
            label="Locale"
            options={[
              { value: "en", label: "EN" },
              { value: "vi", label: "VI" },
            ]}
          />
          <Input name="excerpt" label="Excerpt" />
          <Textarea name="body" label="Body" />
        </ActionForm>
      ) : null}
      <DataTable headers={["Title", "Type", "Locale", "Status", "Updated", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.versionId}>
            <Td>{row.title}</Td>
            <Td>{row.contentType}</Td>
            <Td>{row.locale}</Td>
            <Td>
              {row.status} v{row.versionNumber}
            </Td>
            <Td>{formatDate(row.updatedAt)}</Td>
            <Td>
              {canWrite && row.status === "DRAFT" ? (
                <div className="space-y-2">
                  <ActionForm action={publishDraftAction} submitLabel="Publish">
                    <input type="hidden" name="versionId" value={row.versionId} />
                  </ActionForm>
                  <ActionForm action={archiveDraftAction} submitLabel="Archive">
                    <input type="hidden" name="versionId" value={row.versionId} />
                  </ActionForm>
                </div>
              ) : null}
            </Td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} />
    </div>
  );
}
