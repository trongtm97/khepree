import { Input, Textarea } from "@khepree/ui";
import type { ProductMarketingMetadata } from "@khepree/catalog";
import { ActionForm } from "@/components/action-form";
import { AdminFormSection } from "@/components/admin";
import { saveMarketingAction } from "@/app/(admin)/products/studio-actions";

const SOLUTION_SLOTS = 4;
const HIGHLIGHT_SLOTS = 6;
const FAQ_SLOTS = 6;
const RELATED_SLOTS = 6;

function slot<T>(items: T[] | undefined, index: number): T | undefined {
  return items?.[index];
}

export function ProductMarketingForm({
  productId,
  marketing,
  canWrite,
}: {
  productId: string;
  marketing: ProductMarketingMetadata;
  canWrite: boolean;
}) {
  if (!canWrite) {
    return <p className="text-sm text-khepree-slate/70">Chế độ chỉ xem.</p>;
  }

  return (
    <ActionForm action={saveMarketingAction} submitLabel="Lưu trang thương mại">
      <input type="hidden" name="productId" value={productId} />

      <AdminFormSection title="Giải pháp" description="Phần mềm này giúp bạn khi… (tối đa 4 mục)">
        {Array.from({ length: SOLUTION_SLOTS }, (_, index) => {
          const item = slot(marketing.solutions, index);
          return (
            <fieldset key={index} className="space-y-2 rounded border border-khepree-mist p-3">
              <legend className="px-1 text-xs font-medium text-khepree-slate/70">Giải pháp {index + 1}</legend>
              <Input name={`solution_${index}_problem`} label="Tình huống / vấn đề" defaultValue={item?.problem ?? ""} />
              <Textarea name={`solution_${index}_helps`} label="Phần mềm giúp gì" defaultValue={item?.helps ?? ""} />
              <Input name={`solution_${index}_result`} label="Kết quả (tùy chọn)" defaultValue={item?.result ?? ""} />
            </fieldset>
          );
        })}
      </AdminFormSection>

      <AdminFormSection title="Tính năng (bento)" description="Lợi ích — không chỉ tên kỹ thuật (tối đa 6 mục)">
        {Array.from({ length: HIGHLIGHT_SLOTS }, (_, index) => {
          const item = slot(marketing.highlights, index);
          return (
            <fieldset key={index} className="space-y-2 rounded border border-khepree-mist p-3">
              <legend className="px-1 text-xs font-medium text-khepree-slate/70">Tính năng {index + 1}</legend>
              <Input name={`highlight_${index}_title`} label="Tiêu đề" defaultValue={item?.title ?? ""} />
              <Textarea name={`highlight_${index}_description`} label="Lợi ích" defaultValue={item?.description ?? ""} />
            </fieldset>
          );
        })}
      </AdminFormSection>

      <AdminFormSection title="Hướng dẫn liên quan" description="Docs/bài viết gắn sản phẩm (tối đa 6 mục)">
        {Array.from({ length: RELATED_SLOTS }, (_, index) => {
          const item = slot(marketing.relatedContent, index);
          return (
            <fieldset key={index} className="grid gap-2 rounded border border-khepree-mist p-3 sm:grid-cols-2">
              <legend className="px-1 text-xs font-medium text-khepree-slate/70 sm:col-span-2">
                Liên kết {index + 1}
              </legend>
              <Input name={`related_${index}_title`} label="Tiêu đề" defaultValue={item?.title ?? ""} />
              <Input name={`related_${index}_href`} label="URL hoặc đường dẫn" defaultValue={item?.href ?? ""} placeholder="/vi/docs/..." />
            </fieldset>
          );
        })}
      </AdminFormSection>

      <AdminFormSection title="FAQ" description="Câu hỏi riêng cho sản phẩm (tối đa 6 mục)">
        {Array.from({ length: FAQ_SLOTS }, (_, index) => {
          const item = slot(marketing.faq, index);
          return (
            <fieldset key={index} className="space-y-2 rounded border border-khepree-mist p-3">
              <legend className="px-1 text-xs font-medium text-khepree-slate/70">FAQ {index + 1}</legend>
              <Input name={`faq_${index}_question`} label="Câu hỏi" defaultValue={item?.question ?? ""} />
              <Textarea name={`faq_${index}_answer`} label="Trả lời" defaultValue={item?.answer ?? ""} />
            </fieldset>
          );
        })}
      </AdminFormSection>

      <AdminFormSection title="CTA cuối trang" description="Không dùng CTA chung của Khepree — đặt theo sản phẩm">
        <Input name="cta_headline" label="Tiêu đề" defaultValue={marketing.cta?.headline ?? ""} />
        <Textarea name="cta_description" label="Mô tả (tùy chọn)" defaultValue={marketing.cta?.description ?? ""} />
        <Input name="cta_buttonLabel" label="Nút — nhãn" defaultValue={marketing.cta?.buttonLabel ?? ""} />
        <Input
          name="cta_buttonHref"
          label="Nút — liên kết"
          defaultValue={marketing.cta?.buttonHref ?? ""}
          placeholder="#pricing hoặc https://..."
        />
      </AdminFormSection>
    </ActionForm>
  );
}
