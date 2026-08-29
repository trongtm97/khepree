import { coercePlanFeatureRow, type FeatureValueType, type PlanFeatureValue } from "@khepree/db";
import type { PublicPlanFeature } from "./types";

export interface PlanFeatureEntry {
  key: string;
  name: string;
  valueType: FeatureValueType;
  value: PlanFeatureValue;
}

export class PlanFeatureSet {
  private readonly byKey: Map<string, PlanFeatureEntry>;

  constructor(features: PlanFeatureEntry[]) {
    this.byKey = new Map(features.map((feature) => [feature.key, feature]));
  }

  static fromPublicFeatures(features: PublicPlanFeature[]): PlanFeatureSet {
    return new PlanFeatureSet(
      features.map((feature) => ({
        key: feature.key,
        name: feature.name,
        valueType: feature.valueType,
        value: feature.value,
      })),
    );
  }

  hasFeature(key: string): boolean {
    const feature = this.byKey.get(key);
    if (!feature) return false;
    switch (feature.value.valueType) {
      case "boolean":
        return feature.value.booleanValue;
      case "integer":
        return feature.value.integerValue > 0;
      case "string":
        return feature.value.stringValue.length > 0;
      default: {
        const _exhaustive: never = feature.value;
        return Boolean(_exhaustive);
      }
    }
  }

  getFeatureLimit(key: string): number | null {
    const feature = this.byKey.get(key);
    if (!feature || feature.value.valueType !== "integer") return null;
    return feature.value.integerValue;
  }

  getFeatureValue(key: string): PlanFeatureValue | null {
    return this.byKey.get(key)?.value ?? null;
  }

  list(): PlanFeatureEntry[] {
    return [...this.byKey.values()];
  }
}

export function mapPlanFeatureRow(input: {
  key: string;
  name: string;
  valueType: FeatureValueType;
  booleanValue: boolean | null;
  integerValue: number | null;
  stringValue: string | null;
}): PublicPlanFeature {
  return {
    key: input.key,
    name: input.name,
    valueType: input.valueType,
    value: coercePlanFeatureRow(input.valueType, {
      booleanValue: input.booleanValue,
      integerValue: input.integerValue,
      stringValue: input.stringValue,
    }),
  };
}
