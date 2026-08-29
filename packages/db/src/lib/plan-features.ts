import { z } from "zod";

export const featureValueTypeSchema = z.enum(["boolean", "integer", "string"]);
export type FeatureValueType = z.infer<typeof featureValueTypeSchema>;

export const planFeatureValueSchema = z.discriminatedUnion("valueType", [
  z.object({ valueType: z.literal("boolean"), booleanValue: z.boolean() }),
  z.object({ valueType: z.literal("integer"), integerValue: z.number().int() }),
  z.object({ valueType: z.literal("string"), stringValue: z.string().min(1) }),
]);

export type PlanFeatureValue = z.infer<typeof planFeatureValueSchema>;

export function parsePlanFeatureValue(input: unknown): PlanFeatureValue {
  return planFeatureValueSchema.parse(input);
}

/** Validate stored columns match declared value type. */
export function assertPlanFeatureColumns(
  valueType: FeatureValueType,
  row: {
    booleanValue: boolean | null;
    integerValue: number | null;
    stringValue: string | null;
  },
): void {
  parsePlanFeatureValue(coercePlanFeatureRow(valueType, row));
}

export function coercePlanFeatureRow(
  valueType: FeatureValueType,
  row: {
    booleanValue: boolean | null;
    integerValue: number | null;
    stringValue: string | null;
  },
): PlanFeatureValue {
  switch (valueType) {
    case "boolean":
      if (row.booleanValue === null) throw new Error("booleanValue required");
      return { valueType, booleanValue: row.booleanValue };
    case "integer":
      if (row.integerValue === null) throw new Error("integerValue required");
      return { valueType, integerValue: row.integerValue };
    case "string":
      if (!row.stringValue) throw new Error("stringValue required");
      return { valueType, stringValue: row.stringValue };
    default: {
      const _exhaustive: never = valueType;
      throw new Error(`Unknown value type: ${_exhaustive}`);
    }
  }
}
