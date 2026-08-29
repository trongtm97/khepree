import { ErrorScreen } from "@khepree/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <ErrorScreen
      title="Page not found"
      description="That page does not exist, or it is no longer published. / Trang này không tồn tại hoặc đã ngừng xuất bản."
    >
      <span className="flex gap-4">
        <Link className="text-sm text-khepree-teal underline" href="/en">
          Home
        </Link>
        <Link className="text-sm text-khepree-teal underline" href="/vi">
          Trang chủ
        </Link>
      </span>
    </ErrorScreen>
  );
}
