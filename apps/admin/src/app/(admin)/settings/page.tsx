import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@khepree/config";
import type { Metadata } from "next";
import { AdminPageHeader, AdminSection } from "@/components/admin";
import { requireAdmin } from "@/lib/admin-session";

export const metadata: Metadata = { title: "Cài đặt" };

export default async function SettingsPage() {
  await requireAdmin("admin.access");

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Cài đặt"
        description="Giá trị vận hành công khai. Bí mật không được hiện ở đây."
      />
      <AdminSection title="Website công khai">
        <ul className="space-y-2 text-sm">
          <li>Ngôn ngữ mặc định: {DEFAULT_LOCALE}</li>
          <li>Tiền tệ mặc định: {DEFAULT_CURRENCY}</li>
        </ul>
      </AdminSection>
      <AdminSection title="Pháp lý">
        <p className="text-sm">
          Trang Bảo mật, Quyền riêng tư và Điều khoản cần luật sư rà soát trước khi ra mắt thương mại
          công khai.
        </p>
      </AdminSection>
    </div>
  );
}
