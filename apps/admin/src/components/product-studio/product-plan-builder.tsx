"use client";

import type { StudioPlan } from "@khepree/catalog/product/studio/types";
import {
  ACCESS_TERM_PRESETS,
  detectAccessTermKind,
  mergeFullDescription,
  type AccessTermKind,
} from "@khepree/catalog/product/studio-field-policy";
import { Input, Select } from "@khepree/ui";
import { useMemo, useState } from "react";

export type PlanDraft = {
  key: string;
  planId?: string;
  nameVi: string;
  amountMajor: string;
  termKind: AccessTermKind;
  termCount: number;
  accountRequired: boolean;
  deviceLimit: number;
  recommended: boolean;
  slug?: string;
  remove?: boolean;
};

function planFromSnapshot(plan: StudioPlan, recommended: boolean): PlanDraft {
  const term = detectAccessTermKind(plan.billingType, plan.accessTermDays);
  const price = plan.prices.find((p) => p.isActive) ?? plan.prices[0];
  const accountRequired =
    plan.features.find((f) => f.key === "account.required")?.booleanValue ?? false;
  const deviceLimit =
    plan.features.find((f) => f.key === "devices.max")?.integerValue ?? 1;
  return {
    key: plan.id,
    planId: plan.id,
    nameVi: plan.nameVi ?? plan.slug,
    amountMajor: price ? price.amountMinor.toString() : "0",
    termKind: term.kind,
    termCount: term.count,
    accountRequired,
    deviceLimit,
    recommended,
    slug: plan.slug,
  };
}

function emptyPlan(): PlanDraft {
  return {
    key: `new-${Date.now()}`,
    nameVi: "",
    amountMajor: "0",
    termKind: "month",
    termCount: 1,
    accountRequired: true,
    deviceLimit: 1,
    recommended: false,
  };
}

type Props = {
  plans: StudioPlan[];
  recommendedPlanPublicId: string | null;
};

export function ProductPlanBuilder({ plans, recommendedPlanPublicId }: Props) {
  const initial = useMemo(
    () =>
      plans
        .filter((p) => p.status !== "archived")
        .map((p) => planFromSnapshot(p, p.publicId === recommendedPlanPublicId)),
    [plans, recommendedPlanPublicId],
  );
  const [drafts, setDrafts] = useState<PlanDraft[]>(initial.length ? initial : [emptyPlan()]);
  const [openAdvanced, setOpenAdvanced] = useState<Record<string, boolean>>({});

  function update(key: string, patch: Partial<PlanDraft>) {
    setDrafts((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  function setRecommended(key: string) {
    setDrafts((prev) => prev.map((p) => ({ ...p, recommended: p.key === key })));
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="planCount" value={drafts.length} />
      {drafts.map((plan, index) => {
        if (plan.remove) {
          return (
            <div key={plan.key}>
              <input type="hidden" name={`plan_${index}_id`} value={plan.planId ?? ""} />
              <input type="hidden" name={`plan_${index}_remove`} value="1" />
            </div>
          );
        }
        const adv = openAdvanced[plan.key] ?? false;
        return (
          <div key={plan.key} className="rounded-lg border border-khepree-mist bg-khepree-white p-4 shadow-sm">
            <input type="hidden" name={`plan_${index}_id`} value={plan.planId ?? ""} />
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Input
                name={`plan_${index}_nameVi`}
                label="Tên gói"
                defaultValue={plan.nameVi}
                required
                onChange={(e) => update(plan.key, { nameVi: e.target.value })}
              />
              <div className="flex gap-2 pt-5">
                <button
                  type="button"
                  className="text-xs text-khepree-teal underline"
                  onClick={() => {
                    const src = drafts.find((p) => p.key === plan.key);
                    if (!src) return;
                    setDrafts((prev) => [...prev, { ...src, key: `dup-${Date.now()}`, planId: undefined }]);
                  }}
                >
                  Nhân bản
                </button>
                <button
                  type="button"
                  className="text-xs text-red-600 underline"
                  onClick={() => update(plan.key, { remove: true })}
                >
                  Xóa
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                name={`plan_${index}_amount`}
                label="Giá (VND)"
                defaultValue={plan.amountMajor}
                placeholder="99000"
              />
              <Select
                name={`plan_${index}_termKind`}
                label="Loại thời hạn"
                defaultValue={plan.termKind}
                options={ACCESS_TERM_PRESETS.map((p) => ({ value: p.kind, label: p.label }))}
              />
              <Input
                name={`plan_${index}_termCount`}
                label="Giá trị thời hạn"
                defaultValue={String(plan.termCount)}
                placeholder="1"
              />
              <Input
                name={`plan_${index}_deviceLimit`}
                label="Giới hạn thiết bị"
                defaultValue={String(plan.deviceLimit)}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name={`plan_${index}_accountRequired`}
                  defaultChecked={plan.accountRequired}
                />
                Yêu cầu tài khoản Khepree
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="recommendedPlan"
                  value={String(index)}
                  defaultChecked={plan.recommended}
                  onChange={() => setRecommended(plan.key)}
                />
                Gói nổi bật
              </label>
            </div>
            <button
              type="button"
              className="mt-3 text-xs text-khepree-slate/70 underline"
              onClick={() => setOpenAdvanced((s) => ({ ...s, [plan.key]: !adv }))}
            >
              {adv ? "Ẩn nâng cao" : "Nâng cao"}
            </button>
            {adv ? (
              <div className="mt-2">
                <Input name={`plan_${index}_slug`} label="Slug gói" defaultValue={plan.slug ?? ""} />
              </div>
            ) : null}
          </div>
        );
      })}
      <button
        type="button"
        className="rounded-[var(--radius-control)] border border-dashed border-khepree-mist px-4 py-2 text-sm text-khepree-teal hover:bg-khepree-mist/30"
        onClick={() => setDrafts((prev) => [...prev, emptyPlan()])}
      >
        + Thêm gói
      </button>
    </div>
  );
}

export function mergedDescriptionForLocale(
  translations: Array<{ locale: string; description: string | null; content: string | null }>,
  locale: string,
): string {
  const tr = translations.find((t) => t.locale === locale);
  return mergeFullDescription(tr?.description ?? null, tr?.content ?? null);
}
