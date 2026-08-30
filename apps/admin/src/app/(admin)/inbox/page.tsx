import { listAdminActionQueue } from "@khepree/db";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader, AdminSection } from "@/components/admin";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Việc cần xử lý" };

export default async function InboxPage() {
  await requireAdmin("admin.access");
  const queue = await listAdminActionQueue();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Việc cần xử lý"
        description="Nháp, hoàn tiền cần xác nhận và SEO còn thiếu — dữ liệu thật, không có số liệu giả."
      />
      <AdminSection title="Sản phẩm nháp">
        <QueueList
          empty="Không có sản phẩm nháp."
          items={queue.draftProducts.map((row) => ({
            href: `/products/${row.id}`,
            label: row.nameVi ?? row.slug,
            meta: formatDate(row.updatedAt),
          }))}
        />
      </AdminSection>
      <AdminSection title="Nội dung nháp">
        <QueueList
          empty="Không có bản nháp CMS."
          items={queue.draftContent.map((row) => ({
            href: `/content/${row.entryId}`,
            label: `${row.title} (${row.locale})`,
            meta: formatDate(row.updatedAt),
          }))}
        />
      </AdminSection>
      <AdminSection title="Phiên bản nháp">
        <QueueList
          empty="Không có phiên bản nháp."
          items={queue.draftReleases.map((row) => ({
            href: `/products/${row.productId}?tab=releases`,
            label: row.version,
            meta: formatDate(row.updatedAt),
          }))}
        />
      </AdminSection>
      <AdminSection title="Hoàn tiền cần xác nhận">
        <QueueList
          empty="Không có hoàn tiền chờ xử lý."
          items={queue.manualRefunds.map((row) => ({
            href: "/refunds",
            label: row.publicId,
            meta: formatDate(row.createdAt),
          }))}
        />
      </AdminSection>
      <AdminSection title="SEO còn thiếu">
        <QueueList
          empty="Không có bản dịch đang thiếu tiêu đề SEO."
          items={queue.missingSeo.map((row) => ({
            href: `/products/${row.id}?tab=seo`,
            label: `${row.name} (${row.locale})`,
            meta: row.slug,
          }))}
        />
      </AdminSection>
    </div>
  );
}

function QueueList({
  items,
  empty,
}: {
  empty: string;
  items: Array<{ href: string; label: string; meta: string }>;
}) {
  if (items.length === 0) return <p className="text-sm text-khepree-slate/70">{empty}</p>;
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={`${item.href}-${item.label}`}>
          <Link className="text-khepree-teal underline" href={item.href}>
            {item.label}
          </Link>
          <span className="text-khepree-slate/60"> · {item.meta}</span>
        </li>
      ))}
    </ul>
  );
}
