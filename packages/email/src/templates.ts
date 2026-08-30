import type { SupportedLocale } from "@khepree/config";
import { DEFAULT_LOCALE } from "@khepree/config";

export type TransactionalTemplateId =
  | "verify_email"
  | "password_reset"
  | "payment_confirmed"
  | "order_receipt"
  | "license_activated"
  | "renewal_reminder"
  | "expiration_reminder"
  | "device_notification";

export interface TemplateCopy {
  subject: string;
  text: string;
}

const vi: Record<TransactionalTemplateId, TemplateCopy> = {
  verify_email: {
    subject: "Xác minh email Khepree",
    text: "Nhấn vào liên kết để xác minh địa chỉ email của bạn.",
  },
  password_reset: {
    subject: "Đặt lại mật khẩu Khepree",
    text: "Nhấn vào liên kết để đặt lại mật khẩu. Nếu bạn không yêu cầu, hãy bỏ qua email này.",
  },
  payment_confirmed: {
    subject: "Thanh toán thành công",
    text: "Chúng tôi đã xác nhận thanh toán của bạn. Đơn hàng sẽ xuất hiện trong tài khoản.",
  },
  order_receipt: {
    subject: "Biên nhận đơn hàng Khepree",
    text: "Cảm ơn bạn. Đây là biên nhận cho đơn hàng của bạn.",
  },
  license_activated: {
    subject: "Sản phẩm / giấy phép đã kích hoạt",
    text: "Quyền truy cập sản phẩm đã được kích hoạt trên tài khoản của bạn.",
  },
  renewal_reminder: {
    subject: "Nhắc gia hạn Khepree",
    text: "Gói của bạn sắp hết hạn. Gia hạn bằng một lần thanh toán mới.",
  },
  expiration_reminder: {
    subject: "Gói Khepree sắp hết hạn",
    text: "Quyền truy cập của bạn sẽ hết hạn sớm. Gia hạn để tiếp tục sử dụng.",
  },
  device_notification: {
    subject: "Thông báo thiết bị Khepree",
    text: "Có thay đổi trên thiết bị gắn với tài khoản của bạn.",
  },
};

const en: Record<TransactionalTemplateId, TemplateCopy> = {
  verify_email: {
    subject: "Verify your Khepree email",
    text: "Open the link to verify your email address.",
  },
  password_reset: {
    subject: "Reset your Khepree password",
    text: "Open the link to reset your password. Ignore this email if you did not ask.",
  },
  payment_confirmed: {
    subject: "Payment confirmed",
    text: "We confirmed your payment. The order will appear in your account.",
  },
  order_receipt: {
    subject: "Khepree order receipt",
    text: "Thank you. This is the receipt for your order.",
  },
  license_activated: {
    subject: "Product / license activated",
    text: "Product access is now active on your account.",
  },
  renewal_reminder: {
    subject: "Khepree renewal reminder",
    text: "Your access term is ending. Renew with a new one-time payment.",
  },
  expiration_reminder: {
    subject: "Your Khepree access is expiring",
    text: "Access will expire soon. Renew to keep using the product.",
  },
  device_notification: {
    subject: "Khepree device notification",
    text: "A device linked to your account changed.",
  },
};

export function transactionalTemplate(
  id: TransactionalTemplateId,
  locale: SupportedLocale = DEFAULT_LOCALE,
): TemplateCopy {
  const table = locale === "en" ? en : vi;
  return table[id];
}

export function renderTransactionalEmail(
  id: TransactionalTemplateId,
  locale: SupportedLocale = DEFAULT_LOCALE,
): { subject: string; html: string; text: string } {
  const copy = transactionalTemplate(id, locale);
  return {
    subject: copy.subject,
    text: copy.text,
    html: `<p>${copy.text}</p>`,
  };
}
