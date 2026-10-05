import { seedState, stateSchema } from "./model";

export const demoStorageKey = "finsight-demo-v3";
export const legacyDemoStorageKey = "finsight-demo-v2";

export function restoreDemo(saved: string | null, legacy: string | null) {
  if (saved)
    return { state: stateSchema.parse(JSON.parse(saved)), reseeded: false };
  // A previous currency cannot be inferred or converted from bare amounts.
  return { state: seedState(), reseeded: !!legacy };
}
