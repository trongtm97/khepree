import { listAdminUrlRedirects } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { Input, Select } from "@khepree/ui";
import type { Metadata } from "next";
import { AdminFormSection, AdminPageHeader, AdminTable, AdminTd } from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { requireAdmin } from "@/lib/admin-session";
import { createRedirectAction, deleteRedirectAction } from "./redirect-actions";

export const metadata: Metadata = { title: "Chuyển hướng URL" };

export default async function RedirectsPage() {
  const session = await requireAdmin("content.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "content.write");
  const rows = await listAdminUrlRedirects();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Chuyển hướng URL"
        description="Chuyển hướng đường dẫn công khai. Không nhập URL ngoài."
      />
      <AdminTable headers={["Từ", "Đến", "Status", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>{row.fromPath}</AdminTd>
            <AdminTd>{row.toPath}</AdminTd>
            <AdminTd>{row.status}</AdminTd>
            <AdminTd>
              {canWrite ? (
                <ActionForm action={deleteRedirectAction} submitLabel="Xóa">
                  <input type="hidden" name="id" value={row.id} />
                </ActionForm>
              ) : null}
            </AdminTd>
          </tr>
        ))}
      </AdminTable>
      {canWrite ? (
        <AdminFormSection title="Thêm chuyển hướng">
          <ActionForm action={createRedirectAction} submitLabel="Tạo">
            <Input name="fromPath" label="Từ đường dẫn" placeholder="/vi/old" required />
            <Input name="toPath" label="Đến đường dẫn" placeholder="/vi/products/new" required />
            <Select
              name="status"
              label="Status"
              defaultValue="308"
              options={[
                { value: "308", label: "308" },
                { value: "301", label: "301" },
              ]}
            />
          </ActionForm>
        </AdminFormSection>
      ) : null}
    </div>
  );
}
