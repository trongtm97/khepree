import type { AnnouncementCtaKind, AnnouncementSeverity, AnnouncementType } from "@khepree/db";
import { Input, Select, Textarea } from "@khepree/ui";

const severityOptions = [
  { value: "info", label: "Thông tin" },
  { value: "success", label: "Thành công" },
  { value: "warning", label: "Cảnh báo" },
  { value: "error", label: "Lỗi" },
  { value: "action_required", label: "Cần thao tác" },
];

const platformOptions = [
  { value: "", label: "Tất cả nền tảng" },
  { value: "windows", label: "Windows" },
  { value: "macos", label: "macOS" },
  { value: "linux", label: "Linux" },
];

const architectureOptions = [
  { value: "", label: "Tất cả kiến trúc" },
  { value: "x64", label: "x64" },
  { value: "arm64", label: "arm64" },
  { value: "universal", label: "Universal" },
];

const channelOptions = [
  { value: "", label: "Tất cả kênh" },
  { value: "stable", label: "Stable" },
  { value: "beta", label: "Beta" },
  { value: "alpha", label: "Alpha" },
];

const ctaOptions = [
  { value: "none", label: "Không có CTA" },
  { value: "open_url", label: "Mở URL" },
  { value: "open_path", label: "Mở đường dẫn nội bộ" },
  { value: "software_update", label: "Cập nhật phần mềm (tải + auto-update)" },
];

const typeOptions = [
  { value: "general", label: "Thông thường (General)" },
  { value: "whats_new", label: "Tính năng mới (What's New)" },
  { value: "urgent", label: "Khẩn (Urgent — chỉ dùng với severity error/action_required)" },
];

export function AnnouncementFormFields({
  products,
  releases = [],
  defaultProductId = "",
  defaultSeverity = "info",
  defaultPlatform = "",
  defaultArchitecture = "",
  defaultChannel = "",
  defaultMinimumAppVersion = "",
  defaultMaximumAppVersion = "",
  defaultStartsAt = "",
  defaultExpiresAt = "",
  defaultCtaKind = "none",
  defaultCtaUrl = "",
  defaultCtaPath = "",
  defaultCtaReleasePublicId = "",
  defaultType = "general" as AnnouncementType,
  defaultTitleVi = "",
  defaultTitleEn = "",
  defaultBodyVi = "",
  defaultBodyEn = "",
  defaultCtaLabelVi = "",
  defaultCtaLabelEn = "",
}: {
  products: Array<{ id: string; label: string }>;
  releases?: Array<{ publicId: string; label: string }>;
  defaultProductId?: string;
  defaultSeverity?: AnnouncementSeverity;
  defaultPlatform?: string;
  defaultArchitecture?: string;
  defaultChannel?: string;
  defaultMinimumAppVersion?: string;
  defaultMaximumAppVersion?: string;
  defaultStartsAt?: string;
  defaultExpiresAt?: string;
  defaultCtaKind?: AnnouncementCtaKind;
  defaultCtaUrl?: string;
  defaultCtaPath?: string;
  defaultCtaReleasePublicId?: string;
  defaultType?: AnnouncementType;
  defaultTitleVi?: string;
  defaultTitleEn?: string;
  defaultBodyVi?: string;
  defaultBodyEn?: string;
  defaultCtaLabelVi?: string;
  defaultCtaLabelEn?: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Select
        name="productId"
        label="Sản phẩm"
        defaultValue={defaultProductId}
        options={[{ value: "", label: "Toàn hệ sinh thái" }, ...products.map((p) => ({ value: p.id, label: p.label }))]}
      />
      <Select name="severity" label="Mức độ" defaultValue={defaultSeverity} options={severityOptions} />
      <Select
        name="type"
        label="Loại thông báo (Rendering lane)"
        defaultValue={defaultType}
        options={typeOptions}
      />
      <Select name="targetPlatform" label="Nền tảng" defaultValue={defaultPlatform} options={platformOptions} />
      <Select
        name="targetArchitecture"
        label="Kiến trúc"
        defaultValue={defaultArchitecture}
        options={architectureOptions}
      />
      <Select name="releaseChannel" label="Kênh phát hành" defaultValue={defaultChannel} options={channelOptions} />
      <Input
        name="minimumAppVersion"
        label="Phiên bản tối thiểu (SemVer)"
        defaultValue={defaultMinimumAppVersion}
        placeholder="2.0.0"
      />
      <Input
        name="maximumAppVersion"
        label="Phiên bản tối đa (SemVer)"
        defaultValue={defaultMaximumAppVersion}
        placeholder="3.9.9"
      />
      <Input
        name="startsAt"
        label="Bắt đầu hiển thị (UTC)"
        type="datetime-local"
        defaultValue={defaultStartsAt}
      />
      <Input
        name="expiresAt"
        label="Kết thúc hiển thị (UTC)"
        type="datetime-local"
        defaultValue={defaultExpiresAt}
      />
      <Select name="ctaKind" label="CTA" defaultValue={defaultCtaKind} options={ctaOptions} />
      <Input name="ctaUrl" label="URL CTA (first-party)" defaultValue={defaultCtaUrl} placeholder="https://khepree.com/support" />
      <Input name="ctaPath" label="Đường dẫn CTA" defaultValue={defaultCtaPath} placeholder="/vi/support" />
      <Select
        name="ctaReleasePublicId"
        label="Release CTA (software_update)"
        defaultValue={defaultCtaReleasePublicId}
        options={[
          { value: "", label: "Chọn release đã publish…" },
          ...releases.map((r) => ({ value: r.publicId, label: r.label })),
        ]}
      />
      <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
        <Input name="titleVi" label="Tiêu đề (VI)" defaultValue={defaultTitleVi} required />
        <Input name="titleEn" label="Tiêu đề (EN)" defaultValue={defaultTitleEn} />
        <Textarea
          name="bodyVi"
          label="Nội dung (VI) — Markdown giới hạn"
          defaultValue={defaultBodyVi}
          rows={5}
        />
        <Textarea
          name="bodyEn"
          label="Nội dung (EN) — Markdown giới hạn"
          defaultValue={defaultBodyEn}
          rows={5}
        />
        <Input
          name="ctaLabelVi"
          label="Nhãn nút CTA (VI)"
          defaultValue={defaultCtaLabelVi}
          placeholder="Khám phá tính năng mới"
        />
        <Input
          name="ctaLabelEn"
          label="Nhãn nút CTA (EN)"
          defaultValue={defaultCtaLabelEn}
          placeholder="Explore what's new"
        />
      </div>
      <p className="md:col-span-2 text-xs text-khepree-slate/60">
        CTA software_update: desktop hiện nút Tải về + Tự động cập nhật. Chọn sản phẩm khớp release.
        Không hỗ trợ HTML thô — nội dung được làm sạch trước khi lưu.
      </p>
    </div>
  );
}
