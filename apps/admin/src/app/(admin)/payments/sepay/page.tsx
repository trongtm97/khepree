import type { Metadata } from "next";
import Link from "next/link";
import { getEnv, getSepayIntegrationStatus } from "@khepree/config";
import { listAdminWebhookEvents } from "@khepree/db";
import { AdminPageHeader, AdminSection, AdminStatusBadge, AdminTable, AdminTd } from "@/components/admin";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "SePay" };

const B1_CHECKLIST = [
  "Checkout sandbox hoàn tất trên account.khepree.com",
  "IPN POST tới api.khepree.com với X-Secret-Key hợp lệ",
  "Đơn hàng + payment chuyển paid, entitlement kích hoạt",
  "Ghi nhận trong nhật ký ops (docs/SEPAY-SANDBOX.md)",
] as const;

export default async function SepaySettingsPage() {
  await requireAdmin("finance.read");
  const status = getSepayIntegrationStatus(getEnv());
  const webhooks = await listAdminWebhookEvents({ provider: "sepay", limit: 15 });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="SePay Payment Gateway"
        description="Cổng thanh toán form POST + IPN (khác mô hình chuyển khoản QR của CHAPMEE)."
        actions={
          <Link className="text-sm text-khepree-teal underline" href="/payments">
            ← Thanh toán
          </Link>
        }
      />

      <AdminSection title="Trạng thái cấu hình">
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-medium">Provider:</span> {status.paymentProvider}{" "}
            <AdminStatusBadge
              label={status.configured ? "Sẵn sàng" : "Thiếu cấu hình"}
              tone={status.configured ? "success" : "warning"}
            />
          </li>
          <li>
            <span className="font-medium">Môi trường:</span> {status.env ?? "—"}
            {status.env === "production" && !status.productionGoLiveAcknowledged ? (
              <span className="ml-2 text-amber-700">— cần KHEPREE_ALLOW_SEPAY_PRODUCTION=1</span>
            ) : null}
          </li>
          <li>
            <span className="font-medium">Merchant ID:</span> <code>{status.merchantIdMasked}</code>
          </li>
          <li>
            <span className="font-medium">Secret key:</span>{" "}
            {status.secretKeyConfigured ? "Đã cấu hình" : "Thiếu"}
          </li>
          <li>
            <span className="font-medium">IPN secret:</span>{" "}
            {status.ipnSecretConfigured ? "Đã cấu hình" : "Thiếu"}
          </li>
          {status.missing.length > 0 ? (
            <li className="text-amber-700">Thiếu: {status.missing.join(", ")}</li>
          ) : null}
        </ul>
      </AdminSection>

      <AdminSection title="URL đăng ký với SePay">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-khepree-slate">IPN (bắt buộc)</dt>
            <dd className="mt-1 break-all font-mono text-xs text-khepree-teal">
              {status.ipnUrl ?? "Đặt API_URL (vd: https://api.khepree.com)"}
            </dd>
            <dd className="mt-1 text-khepree-slate/70">Header: X-Secret-Key = SEPAY_IPN_SECRET hoặc SEPAY_SECRET_KEY</dd>
          </div>
          <div>
            <dt className="font-medium text-khepree-slate">Checkout init</dt>
            <dd className="mt-1 break-all font-mono text-xs">{status.checkoutInitUrl ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-khepree-slate">Success redirect</dt>
            <dd className="mt-1 break-all font-mono text-xs">
              {status.accountUrl ? `${status.accountUrl}/billing?checkout=processing` : "Đặt ACCOUNT_URL"}
            </dd>
          </div>
        </dl>
      </AdminSection>

      <AdminSection title="B1 — Sandbox gate (chưa go-live production)">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-khepree-slate/90">
          {B1_CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-khepree-slate/60">
          Chi tiết: <code>docs/SEPAY-SANDBOX.md</code> · Go-live production:{" "}
          <code>docs/PRODUCTION-INTEGRATIONS.md</code> §7
        </p>
      </AdminSection>

      <AdminSection title="IPN gần đây">
        <AdminTable
          headers={["Thời gian", "Loại", "Event ID", "Đã xử lý"]}
          empty={webhooks.length === 0}
        >
          {webhooks.map((row) => (
            <tr key={row.id}>
              <AdminTd>{formatDate(row.createdAt)}</AdminTd>
              <AdminTd>{row.eventType}</AdminTd>
              <AdminTd>
                <span className="font-mono text-xs">{row.eventId}</span>
              </AdminTd>
              <AdminTd>{row.processedAt ? formatDate(row.processedAt) : "—"}</AdminTd>
            </tr>
          ))}
        </AdminTable>
      </AdminSection>
    </div>
  );
}
