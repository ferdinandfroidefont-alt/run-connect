import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseRCC, formatParsedBlockSummary, computeRCCSummary } from "@/lib/rccParser";
import type { SessionModelItem } from "@/components/coaching/models/types";

interface ModelDetailProps {
  model: SessionModelItem;
  onBack: () => void;
  onAdd: () => void;
}

export function ModelDetail({ model, onBack, onAdd }: ModelDetailProps) {
  const parsed = parseRCC(model.rccCode);
  const summary = computeRCCSummary(parsed.blocks);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded-lg px-1 py-1 text-[13px] font-semibold text-primary">
          <ChevronLeft className="h-4 w-4" />
          Retour
        </button>
        <p className="text-[15px] font-semibold text-foreground">Détail du modèle</p>
        <div className="w-14" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <p className="text-[16px] font-semibold text-foreground">{model.title}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {summary.totalDurationMin} min • {summary.totalDistanceKm} km • {summary.intensity}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Structure séance</p>
        <div className="space-y-1.5">
          {parsed.blocks.map((block, index) => (
            <p key={`${block.raw}-${index}`} className="text-[13px] text-foreground">
              {index + 1}. {formatParsedBlockSummary(block)}
            </p>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Intensité</p>
        <p className="mt-1 text-[13px] text-foreground">Zone cible: {model.objective || "à définir"}</p>
      </div>

      <Button type="button" className="h-11 w-full rounded-xl text-[15px] font-semibold" onClick={onAdd}>
        <Plus className="mr-1.5 h-4 w-4" />
        Ajouter au planning
      </Button>
    </div>
  );
}

