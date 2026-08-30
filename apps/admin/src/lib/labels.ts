/** Vietnamese UI copy for admin shell and shared patterns. */
export const adminUi = {
  search: "Tìm kiếm",
  filter: "Lọc",
  previous: "Trước",
  next: "Sau",
  noRows: "Không có dữ liệu",
  noRowsHint: "Không có bản ghi phù hợp bộ lọc hiện tại.",
  readOnly: "Chế độ chỉ xem với quyền của bạn.",
  signOut: "Đăng xuất",
  openMenu: "Mở menu điều hướng",
  closeMenu: "Đóng menu điều hướng",
  navLabel: "Điều hướng quản trị",
  technicalDetails: "Chi tiết kỹ thuật",
  working: "Đang xử lý…",
  confirmType: "Nhập CONFIRM",
  reason: "Lý do",
  dangerZone: "Vùng nguy hiểm",
  status: "Trạng thái",
  locale: "Ngôn ngữ",
  all: "Tất cả",
} as const;

export function labelStatus(status: string): string {
  const map: Record<string, string> = {
    active: "Hoạt động",
    draft: "Nháp",
    published: "Đã xuất bản",
    archived: "Lưu trữ",
    retired: "Ngừng",
    suspended: "Tạm dừng",
    blocked: "Chặn",
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    available: "Sẵn sàng",
    paid: "Đã thanh toán",
    succeeded: "Thành công",
    failed: "Thất bại",
    voided: "Đã hủy",
    revoked: "Thu hồi",
  };
  return map[status] ?? status.replaceAll("_", " ");
}
