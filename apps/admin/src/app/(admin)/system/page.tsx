import {
  getEnv,
  getSepayIntegrationStatus,
  isDatabaseConfigured,
  isEmailConfigured,
  isGoogleAuthConfigured,
  isSePayConfigured,
  isStorageConfigured,
} from "@khepree/config";
import { ADMIN_PAGE_SIZE, listAdminSystemEvents } from "@khepree/db";
import type { Metadata } from "next";
import { AdminPageHeader, AdminSection, AdminTable, AdminTd } from "@/components/admin";
import { Pagination } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Hệ thống" };

export default async function SystemPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin("admin.access");
  const env = getEnv();
  const page = parsePage((await searchParams).page);
  const rows = await listAdminSystemEvents({ page });
  const flags = [
    { label: "NODE_ENV", value: env.NODE_ENV },
    { label: "Cơ sở dữ liệu", value: isDatabaseConfigured(env) ? "Đã cấu hình" : "Chưa cấu hình" },
    { label: "Lưu trữ", value: isStorageConfigured(env) ? "Đã cấu hình" : "Chưa cấu hình" },
    { label: "Email", value: isEmailConfigured(env) ? "Đã cấu hình" : "Chưa cấu hình" },
    {
      label: "Google Login",
      value: isGoogleAuthConfigured(env) ? "Đã cấu hình" : "Chưa cấu hình",
    },
    {
      label: "SePay",
      value: isSePayConfigured(env)
        ? `${env.SEPAY_ENV ?? "VietQR"} — ${getSepayIntegrationStatus(env).configured ? "OK" : "thiếu webhook/bank"}`
        : env.PAYMENT_PROVIDER === "mock"
          ? "mock (dev)"
          : "Chưa cấu hình",
    },
    {
      label: "MFA admin (prod)",
      value: "ADMIN và SUPER_ADMIN phải bật MFA trên production",
    },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Hệ thống" description="Trạng thái môi trường và sự kiện vận hành." />
      <ul className="space-y-1 text-sm">
        {flags.map((row) => (
          <li key={row.label}>
            <span className="font-medium">{row.label}:</span> {row.value}
          </li>
        ))}
      </ul>
      <AdminSection title="Sự kiện hệ thống">
        <AdminTable headers={["Thời gian", "Loại", "Mức độ"]} empty={rows.length === 0}>
          {rows.map((row) => (
            <tr key={row.id}>
              <AdminTd>{formatDate(row.createdAt)}</AdminTd>
              <AdminTd>{row.eventType}</AdminTd>
              <AdminTd>{row.severity}</AdminTd>
            </tr>
          ))}
        </AdminTable>
        <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} />
      </AdminSection>
    </div>
  );
}
