import { Input, Textarea } from "@khepree/ui";

export function DangerFields({ reasonLabel = "Reason" }: { reasonLabel?: string }) {
  return (
    <>
      <Textarea name="reason" label={reasonLabel} required minLength={3} />
      <Input
        name="confirm"
        label="Type CONFIRM"
        required
        pattern="CONFIRM"
        autoComplete="off"
      />
    </>
  );
}
