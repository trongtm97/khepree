"use client";

import type { ReadinessResult } from "@khepree/catalog/product/studio/types";
import { Alert } from "@khepree/ui";

const SECTION_HASH: Record<string, string> = {
  name_vi: "#info",
  category: "#info",
  product_type: "#info",
  slug: "#info",
  short_vi: "#info",
  full_vi: "#info",
  licensing: "#info",
  seo: "#info",
  icon: "#media",
  sellable_plan: "#plans",
};

type Props = {
  readiness: ReadinessResult;
};

export function ProductReadinessPanel({ readiness }: Props) {
  if (readiness.ready) return null;

  const required = readiness.items.filter((item) => item.required);
  const missing = required.filter((item) => !item.ok);

  return (
    <Alert variant="warning" className="text-sm">
      <p className="font-medium">
        Còn {readiness.blockingCount} mục bắt buộc trước khi xuất bản
      </p>
      <p className="mt-1 text-xs text-khepree-slate/80">
        Bấm <strong>Lưu nháp</strong> sau khi sửa — xuất bản chỉ kiểm tra dữ liệu đã lưu.
      </p>
      <ul className="mt-3 space-y-1.5 text-xs">
        {required.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <span
              className={item.ok ? "text-green-700" : "text-amber-900"}
              aria-hidden
            >
              {item.ok ? "✓" : "○"}
            </span>
            {item.ok ? (
              <span className="text-khepree-slate/70">{item.label}</span>
            ) : (
              <a
                href={SECTION_HASH[item.id] ?? "#info"}
                className="font-medium text-amber-900 underline hover:text-amber-950"
              >
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ul>
      {missing.length > 0 ? (
        <p className="mt-2 text-xs text-khepree-slate/70">
          Cần bổ sung: {missing.map((item) => item.label).join(" · ")}
        </p>
      ) : null}
    </Alert>
  );
}
