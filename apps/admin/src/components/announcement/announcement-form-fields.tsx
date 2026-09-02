import type { AnnouncementCtaKind, AnnouncementSeverity } from "@khepree/db";
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
];

export function AnnouncementFormFields({
  products,
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
  defaultTitleVi = "",
  defaultTitleEn = "",
  defaultBodyVi = "",
  defaultBodyEn = "",
}: {
  products: Array<{ id: string; label: string }>;
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
  defaultTitleVi?: string;
  defaultTitleEn?: string;
  defaultBodyVi?: string;
  defaultBodyEn?: string;
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
      </div>
      <p className="md:col-span-2 text-xs text-khepree-slate/60">
        Không hỗ trợ HTML thô. Nội dung được làm sạch trước khi lưu và hiển thị trên desktop.
      </p>
    </div>
  );
}
