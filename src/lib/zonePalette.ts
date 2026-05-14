import type { ComputedZone } from "@/lib/athleteIntensity";

export const ZONE_COLOR: Record<ComputedZone, string> = {
  Z1: "#B5B5BA",
  Z2: "#0066cc",
  Z3: "#34C759",
  Z4: "#FFCC00",
  Z5: "#FF9500",
  Z6: "#FF3B30",
};

export function zoneColor(zone: ComputedZone): string {
  return ZONE_COLOR[zone];
}
