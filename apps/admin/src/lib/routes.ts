import type { Permission } from "@khepree/security";

export const AUTH_ROUTES = {
  signIn: "/sign-in",
} as const;

export type AdminNavItem = {
  label: string;
  href: string;
  anyOf: Permission[];
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

/** Single source for sidebar + mobile drawer. URLs stay English; labels are Vietnamese. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "overview",
    label: "Tổng quan",
    items: [
      { label: "Tổng quan", href: "/dashboard", anyOf: ["admin.access"] },
      { label: "Việc cần xử lý", href: "/inbox", anyOf: ["admin.access"] },
    ],
  },
  {
    id: "products",
    label: "Sản phẩm",
    items: [
      { label: "Sản phẩm", href: "/products", anyOf: ["catalog.read"] },
      { label: "Gói & Giá", href: "/plans", anyOf: ["catalog.read"] },
      { label: "Phiên bản", href: "/releases", anyOf: ["content.read"] },
      { label: "Tải xuống", href: "/downloads", anyOf: ["content.read"] },
    ],
  },
  {
    id: "content",
    label: "Nội dung & SEO",
    items: [
      { label: "Bài viết", href: "/content/articles", anyOf: ["content.read"] },
      { label: "Trang", href: "/content/pages", anyOf: ["content.read"] },
      { label: "Tài liệu", href: "/content/docs", anyOf: ["content.read"] },
      { label: "Media", href: "/media", anyOf: ["content.read"] },
      { label: "SEO", href: "/seo", anyOf: ["content.read"] },
      { label: "Chuyển hướng URL", href: "/redirects", anyOf: ["content.read"] },
    ],
  },
  {
    id: "customers",
    label: "Khách hàng",
    items: [
      { label: "Người dùng", href: "/users", anyOf: ["admin.users.read"] },
      { label: "Tổ chức", href: "/organizations", anyOf: ["admin.users.read"] },
    ],
  },
  {
    id: "commerce",
    label: "Bán hàng",
    items: [
      { label: "Đơn hàng", href: "/orders", anyOf: ["finance.read", "support.read"] },
      { label: "Thanh toán", href: "/payments", anyOf: ["finance.read"] },
      { label: "Hoàn tiền", href: "/refunds", anyOf: ["finance.read"] },
    ],
  },
  {
    id: "licensing",
    label: "Bản quyền",
    items: [
      { label: "Quyền sử dụng", href: "/entitlements", anyOf: ["entitlement.read"] },
      { label: "License", href: "/licenses", anyOf: ["entitlement.read"] },
      { label: "Thiết bị", href: "/devices", anyOf: ["entitlement.read"] },
    ],
  },
  {
    id: "partners",
    label: "Đối tác",
    items: [
      { label: "Đại lý", href: "/partners", anyOf: ["partner.admin", "support.read", "finance.read"] },
      { label: "Hoa hồng", href: "/commissions", anyOf: ["finance.read"] },
    ],
  },
  {
    id: "system",
    label: "Hệ thống",
    items: [
      { label: "Nhật ký hoạt động", href: "/audit", anyOf: ["support.read", "finance.read"] },
      { label: "Hệ thống", href: "/system", anyOf: ["admin.access"] },
      { label: "Cài đặt", href: "/settings", anyOf: ["admin.access"] },
    ],
  },
];

export const ADMIN_NAV = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

export const PROTECTED_PATHS = ADMIN_NAV.map((item) => item.href);

export const PUBLIC_AUTH_PATHS = [
  AUTH_ROUTES.signIn,
  "/unauthorized",
  "/forbidden",
  "/mfa-required",
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function filterNavGroups(
  groups: AdminNavGroup[],
  canAccess: (permissions: Permission[]) => boolean,
): AdminNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccess(item.anyOf)),
    }))
    .filter((group) => group.items.length > 0);
}
