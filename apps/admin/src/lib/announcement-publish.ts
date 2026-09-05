export function assertPublishConfirmation(formData: FormData): void {
  if (String(formData.get("confirm") ?? "") !== "CONFIRM") {
    throw new Error("Nhập CONFIRM để xuất bản thông báo");
  }
}

export function readAnnouncementFormData(formData: FormData) {
  return {
    productId: String(formData.get("productId") ?? ""),
    severity: String(formData.get("severity") ?? "info"),
    type: String(formData.get("type") ?? "general"),
    targetPlatform: String(formData.get("targetPlatform") ?? ""),
    targetArchitecture: String(formData.get("targetArchitecture") ?? ""),
    releaseChannel: String(formData.get("releaseChannel") ?? ""),
    minimumAppVersion: String(formData.get("minimumAppVersion") ?? ""),
    maximumAppVersion: String(formData.get("maximumAppVersion") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    expiresAt: String(formData.get("expiresAt") ?? ""),
    ctaKind: String(formData.get("ctaKind") ?? "none"),
    ctaUrl: String(formData.get("ctaUrl") ?? ""),
    ctaPath: String(formData.get("ctaPath") ?? ""),
    ctaReleasePublicId: String(formData.get("ctaReleasePublicId") ?? ""),
    titleVi: String(formData.get("titleVi") ?? ""),
    titleEn: String(formData.get("titleEn") ?? ""),
    bodyVi: String(formData.get("bodyVi") ?? ""),
    bodyEn: String(formData.get("bodyEn") ?? ""),
    ctaLabelVi: String(formData.get("ctaLabelVi") ?? ""),
    ctaLabelEn: String(formData.get("ctaLabelEn") ?? ""),
  };
}
