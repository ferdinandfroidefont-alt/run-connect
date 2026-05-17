import type { MaquetteChartBlock } from "@/components/session-detail/SessionDetailMaquetteParts";

type SessionBlock = {
  id?: string;
  type: "warmup" | "interval" | "cooldown" | "steady";
  repetitions?: number;
};

const BLOCK_LABEL: Record<SessionBlock["type"], string> = {
  warmup: "Échauffement",
  interval: "Intervalles",
  cooldown: "Retour au calme",
  steady: "Continu",
};

const BLOCK_ZONE: Record<SessionBlock["type"], string> = {
  warmup: "Z1",
  interval: "Z4",
  cooldown: "Z1",
  steady: "Z2",
};

const PILL_COLOR: Record<SessionBlock["type"], string> = {
  warmup: "#FF9500",
  interval: "#FF3B30",
  cooldown: "#FF9500",
  steady: "#34C759",
};

export function sessionBlocksToMaquetteChart(
  blocks: SessionBlock[] | undefined,
): MaquetteChartBlock[] {
  if (!blocks?.length) return [];
  return blocks.map((b, i) => ({
    id: b.id ?? `b-${i}`,
    type: b.type === "interval" ? "intervalle" : "continu",
    label: BLOCK_LABEL[b.type],
    zone: BLOCK_ZONE[b.type],
    repetitions: b.type === "interval" ? b.repetitions ?? 6 : undefined,
  }));
}

export function blockPillColor(type: SessionBlock["type"]): string {
  return PILL_COLOR[type];
}

export function blockPillLabel(type: SessionBlock["type"]): string {
  return BLOCK_LABEL[type];
}
