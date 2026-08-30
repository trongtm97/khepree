import { adminUi } from "@/lib/labels";
import { Input, Textarea } from "@khepree/ui";

export function DangerFields({ reasonLabel = adminUi.reason }: { reasonLabel?: string }) {
  return (
    <>
      <Textarea name="reason" label={reasonLabel} required minLength={3} />
      <Input
        name="confirm"
        label={adminUi.confirmType}
        required
        pattern="CONFIRM"
        autoComplete="off"
      />
    </>
  );
}
