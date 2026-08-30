import { ADMIN_PAGE_SIZE, listAdminMedia, type AdminMediaFilter } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import Link from "next/link";
import { signDownloadAction } from "@/app/(admin)/actions";
import {
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  AdminTechnicalDetails,
} from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { MediaUploadPanel } from "@/components/media/media-upload-panel";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Media Library" };

const FILTERS: Array<{ id: AdminMediaFilter; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "images", label: "Ảnh" },
  { id: "product", label: "Product" },
  { id: "content", label: "Content" },
  { id: "release", label: "Release" },
  { id: "private", label: "Private" },
];

function fileLabel(objectKey: string): string {
  const parts = objectKey.split("/");
  return parts[parts.length - 1] ?? objectKey;
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; filter?: string; view?: string }>;
}) {
  const session = await requireAdmin("content.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "content.write");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const filter = (params.filter ?? "all") as AdminMediaFilter;
  const view = params.view === "grid" ? "grid" : "list";
  const rows = await listAdminMedia({ q, page, filter: filter === "all" ? undefined : filter });

  const queryBase = (next: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (page > 1) sp.set("page", String(page));
    for (const [key, value] of Object.entries(next)) sp.set(key, value);
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Media Library"
        description="Tải lên, tìm kiếm và quản lý tệp R2."
      />
      {canWrite ? <MediaUploadPanel /> : null}
      <div className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((item) => (
          <Link
            key={item.id}
            href={`/media${queryBase({ filter: item.id, view })}`}
            className={`rounded px-2 py-1 ${filter === item.id ? "bg-khepree-teal text-white" : "bg-khepree-mist"}`}
          >
            {item.label}
          </Link>
        ))}
        <span className="mx-2 text-khepree-slate/40">|</span>
        <Link href={`/media${queryBase({ filter, view: "list" })}`} className={view === "list" ? "underline" : ""}>
          Danh sách
        </Link>
        <Link href={`/media${queryBase({ filter, view: "grid" })}`} className={view === "grid" ? "underline" : ""}>
          Lưới
        </Link>
      </div>
      <SearchForm q={q} />
      {view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={`/media/${row.publicId}`}
              className="rounded border border-khepree-mist p-3 hover:bg-khepree-mist/30"
            >
              <div className="mb-2 flex h-24 items-center justify-center rounded bg-khepree-mist text-xs text-khepree-slate/60">
                {row.mimeType.startsWith("image/") ? "🖼" : "📄"}
              </div>
              <p className="truncate text-sm font-medium">{fileLabel(row.objectKey)}</p>
              <p className="text-xs text-khepree-slate/60">
                {row.width && row.height ? `${row.width}×${row.height}` : row.mimeType}
              </p>
              <AdminStatusBadge label={row.visibility} tone={row.visibility === "public" ? "success" : "muted"} />
            </Link>
          ))}
        </div>
      ) : (
        <AdminTable headers={["Tệp", "MIME", "Hiển thị", "Ngữ cảnh", "Ngày tạo", ""]} empty={rows.length === 0}>
          {rows.map((row) => (
            <tr key={row.id}>
              <AdminTd>
                <Link className="text-khepree-teal underline" href={`/media/${row.publicId}`}>
                  {fileLabel(row.objectKey)}
                </Link>
                <div className="text-xs text-khepree-slate/60">{row.publicId}</div>
              </AdminTd>
              <AdminTd>{row.mimeType}</AdminTd>
              <AdminTd>{row.visibility}</AdminTd>
              <AdminTd>
                {row.context ?? "—"}
                <AdminTechnicalDetails>{row.altText ?? row.objectKey}</AdminTechnicalDetails>
              </AdminTd>
              <AdminTd>{formatDate(row.createdAt)}</AdminTd>
              <AdminTd>
                {row.visibility === "private" ? (
                  <ActionForm action={signDownloadAction} submitLabel="Ký URL">
                    <input type="hidden" name="mediaPublicId" value={row.publicId} />
                  </ActionForm>
                ) : (
                  "public"
                )}
              </AdminTd>
            </tr>
          ))}
        </AdminTable>
      )}
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
