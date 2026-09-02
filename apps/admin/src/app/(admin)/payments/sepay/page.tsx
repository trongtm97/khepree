import type { Metadata } from "next";
import Link from "next/link";
import { getEnv, getSepayIntegrationStatus } from "@khepree/config";
import { listAdminWebhookEvents } from "@khepree/db";
import { AdminPageHeader, AdminSection, AdminStatusBadge, AdminTable, AdminTd } from "@/components/admin";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "SePay" };

const B1_CHECKLIST = [
  "Checkout QR hoàn tất trên account.khepree.com",
  "Webhook chuyển khoản POST tới api.khepree.com với chữ ký/API key hợp lệ",
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
        title="SePay VietQR"
        description="Thanh toán chuyển khoản QR + webhook ngân hàng (cùng mô hình CHAPMEE)."
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
            <span className="font-medium">Ngân hàng:</span> {status.bankCode ?? "—"}
          </li>
          <li>
            <span className="font-medium">Tài khoản:</span>{" "}
            <code>{status.bankAccountMasked}</code> — {status.bankAccountName ?? "—"}
          </li>
          <li>
            <span className="font-medium">Webhook auth:</span> {status.webhookAuth}
            {" · "}
            {status.webhookSecretConfigured || status.webhookAuth === "api_key"
              ? "Đã cấu hình"
              : "Thiếu secret"}
          </li>
          {status.missing.length > 0 ? (
            <li className="text-amber-700">Thiếu: {status.missing.join(", ")}</li>
          ) : null}
        </ul>
      </AdminSection>

      <AdminSection title="URL đăng ký với SePay">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-khepree-slate">Webhook chuyển khoản (bắt buộc)</dt>
            <dd className="mt-1 break-all font-mono text-xs text-khepree-teal">
              {status.webhookUrl ?? "Đặt API_URL (vd: https://api.khepree.com)"}
            </dd>
            <dd className="mt-1 text-khepree-slate/70">
              Xác thực: {status.webhookAuth === "api_key" ? "API Key (Authorization: Apikey …)" : "HMAC-SHA256 (x-sepay-signature)"}
            </dd>
            <dd className="mt-1 text-khepree-slate/70">
              Tiền tố mã thanh toán trên SePay: <code>KHP</code> (nội dung chuyển khoản dạng{" "}
              <code>KHP12345678</code> — 8 chữ số, dễ nhập tay)
            </dd>
          </div>
          <div>
            <dt className="font-medium text-khepree-slate">QR base URL</dt>
            <dd className="mt-1 break-all font-mono text-xs">{status.qrBaseUrl ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-khepree-slate">Trang thanh toán</dt>
            <dd className="mt-1 break-all font-mono text-xs">
              {status.accountUrl ? `${status.accountUrl}/checkout/pay/{orderPublicId}` : "Đặt ACCOUNT_URL"}
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

      <AdminSection title="Webhook gần đây">
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
