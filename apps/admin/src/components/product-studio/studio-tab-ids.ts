export const STUDIO_TABS = [
  { id: "overview", label: "Tổng quan" },
  { id: "content", label: "Nội dung" },
  { id: "marketing", label: "Trang TM" },
  { id: "plans", label: "Gói & Giá" },
  { id: "features", label: "Tính năng" },
  { id: "media", label: "Media" },
  { id: "licensing", label: "Bản quyền" },
  { id: "releases", label: "Phiên bản" },
  { id: "seo", label: "SEO" },
  { id: "publish", label: "Xuất bản" },
] as const;

export type StudioTabId = (typeof STUDIO_TABS)[number]["id"];

export function resolveStudioTab(raw: string | null | undefined): StudioTabId {
  const hit = STUDIO_TABS.find((tab) => tab.id === raw);
  return hit?.id ?? "overview";
}
