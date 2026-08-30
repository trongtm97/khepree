import Link from "next/link";
import { AdminPageHeader } from "@/components/admin";
import { requireAdmin } from "@/lib/admin-session";

export default async function ContentHubPage() {
  await requireAdmin("content.read");
  const links = [
    { href: "/content/articles", label: "Bài viết", desc: "Blog" },
    { href: "/content/pages", label: "Trang", desc: "Pages" },
    { href: "/content/docs", label: "Tài liệu", desc: "Docs" },
  ];
  return (
    <div className="space-y-6">
      <AdminPageHeader title="CMS" description="Quản lý nội dung — Markdown, versioning, preview." />
      <div className="grid gap-4 sm:grid-cols-3">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className="rounded border border-khepree-mist p-4 hover:bg-khepree-mist/30">
            <p className="font-medium">{item.label}</p>
            <p className="text-sm text-khepree-slate/70">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
