import { ADMIN_PAGE_SIZE, listAdminContent } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import Link from "next/link";
import {
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  statusTone,
} from "@/components/admin";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { adminUi, labelStatus } from "@/lib/labels";
import { formatDate, parsePage } from "@/lib/format";

const STATUS_FILTERS = [
  { id: "", label: "Tất cả" },
  { id: "DRAFT", label: "Nháp" },
  { id: "PUBLISHED", label: "Đã xuất bản" },
  { id: "ARCHIVED", label: "Lưu trữ" },
];

function seoOk(row: {
  seoTitle: string | null;
  seoDescription: string | null;
  excerpt: string | null;
  title: string;
}) {
  const title = row.seoTitle?.trim() || row.title.trim();
  const desc = row.seoDescription?.trim() || row.excerpt?.trim();
  return Boolean(title && desc);
}

export async function ContentListView({
  contentType,
  title,
  description,
  searchParams,
}: {
  contentType: "article" | "page" | "doc";
  title: string;
  description: string;
  searchParams: Promise<{ q?: string; locale?: string; status?: string; page?: string }>;
}) {
  const session = await requireAdmin("content.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "content.write");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const locale = params.locale?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const rows = await listAdminContent({
    q,
    locale: locale || undefined,
    status: status || undefined,
    contentType,
    page,
  });

  const newHref = `/content/new?type=${contentType}`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          canWrite ? (
            <Link href={newHref} className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-khepree-teal px-4 text-sm font-medium text-white">
              Tạo mới
            </Link>
          ) : null
        }
      />
      <div className="flex flex-wrap gap-2 text-sm">
        {STATUS_FILTERS.map((item) => (
          <Link
            key={item.id || "all"}
            href={`?status=${item.id}&locale=${locale}&q=${encodeURIComponent(q)}`}
            className={`rounded px-2 py-1 ${status === item.id ? "bg-khepree-teal text-white" : "bg-khepree-mist"}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <SearchForm
        q={q}
        extra={[
          {
            name: "locale",
            label: adminUi.locale,
            defaultValue: locale,
            type: "select",
            options: [
              { value: "", label: adminUi.all },
              { value: "vi", label: "VI" },
              { value: "en", label: "EN" },
            ],
          },
        ]}
      />
      <AdminTable
        headers={["Tiêu đề", "Locale", "Trạng thái", "Tác giả", "Cập nhật", "Xuất bản", "SEO", ""]}
        empty={rows.length === 0}
      >
        {rows.map((row) => (
          <tr key={row.versionId}>
            <AdminTd>
              <Link className="text-khepree-teal underline" href={`/content/${row.entryId}`}>
                {row.title}
              </Link>
              <div className="text-xs text-khepree-slate/70">{row.slug}</div>
            </AdminTd>
            <AdminTd>{row.locale.toUpperCase()}</AdminTd>
            <AdminTd>
              <AdminStatusBadge
                label={`${labelStatus(row.status.toLowerCase())} v${row.versionNumber}`}
                tone={statusTone(row.status.toLowerCase())}
              />
            </AdminTd>
            <AdminTd>{row.authorName ?? "—"}</AdminTd>
            <AdminTd>{formatDate(row.updatedAt)}</AdminTd>
            <AdminTd>{row.publishedAt ? formatDate(row.publishedAt) : row.scheduledAt ? `⏱ ${formatDate(row.scheduledAt)}` : "—"}</AdminTd>
            <AdminTd>{seoOk(row) ? <AdminStatusBadge label="OK" tone="success" /> : <span className="text-xs text-amber-800">Thiếu</span>}</AdminTd>
            <AdminTd>
              <Link className="text-sm underline" href={`/content/${row.entryId}`}>
                Mở
              </Link>
            </AdminTd>
          </tr>
        ))}
      </AdminTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} params={{ q, locale, status }} />
    </div>
  );
}
