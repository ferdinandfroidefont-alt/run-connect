import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseRCC, formatParsedBlockSummary } from "@/lib/rccParser";
import { buildWorkoutSegments, renderWorkoutMiniProfile } from "@/lib/workoutVisualization";
import { resolveWorkoutMetrics, workoutAccentColor } from "@/lib/workoutPresentation";
import { ModelTabs } from "@/components/coaching/models/ModelTabs";
import { ModelFilters } from "@/components/coaching/models/ModelFilters";
import { ModelCard } from "@/components/coaching/models/ModelCard";
import { ModelDetail } from "@/components/coaching/models/ModelDetail";
import { AddToPlanningSheet } from "@/components/coaching/models/AddToPlanningSheet";
import type { ModelSportFilter, SessionModelItem } from "@/components/coaching/models/types";

interface ModelsPageProps {
  weekDays: Date[];
  existingSessionsByDay: Record<string, string | undefined>;
  myModels: SessionModelItem[];
  baseModels: SessionModelItem[];
  onCreateModel: () => void;
  onAddToPlanning: (model: SessionModelItem, day: Date, replaceExisting: boolean) => void;
  onEditModel: (model: SessionModelItem) => void;
  onDuplicateModel: (model: SessionModelItem) => void;
  onDeleteModel: (model: SessionModelItem) => void;
}

const ACTIVITY_TO_FILTER: Record<string, ModelSportFilter> = {
  running: "running",
  cycling: "cycling",
  strength: "strength",
};

export function ModelsPage({
  weekDays,
  existingSessionsByDay,
  myModels,
  baseModels,
  onCreateModel,
  onAddToPlanning,
  onEditModel,
  onDuplicateModel,
  onDeleteModel,
}: ModelsPageProps) {
  const [activeTab, setActiveTab] = useState<"mine" | "base">("mine");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ModelSportFilter>("all");
  const [selectedModel, setSelectedModel] = useState<SessionModelItem | null>(null);
  const [sheetModel, setSheetModel] = useState<SessionModelItem | null>(null);

  const list = activeTab === "mine" ? myModels : baseModels;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((model) => {
      const activityFilter = ACTIVITY_TO_FILTER[model.activityType] ?? "running";
      const sportMatch = filter === "all" || activityFilter === filter;
      if (!sportMatch) return false;
      if (!q) return true;
      return (
        model.title.toLowerCase().includes(q) ||
        (model.objective || "").toLowerCase().includes(q) ||
        model.rccCode.toLowerCase().includes(q)
      );
    });
  }, [filter, list, search]);

  if (selectedModel) {
    return (
      <>
        <ModelDetail model={selectedModel} onBack={() => setSelectedModel(null)} onAdd={() => setSheetModel(selectedModel)} />
        <AddToPlanningSheet
          open={!!sheetModel}
          model={sheetModel}
          days={weekDays}
          getExistingSessionTitle={(day) => existingSessionsByDay[day.toISOString().slice(0, 10)]}
          onClose={() => setSheetModel(null)}
          onConfirm={(day, replaceExisting) => {
            if (!sheetModel) return;
            onAddToPlanning(sheetModel, day, replaceExisting);
            setSheetModel(null);
            setSelectedModel(null);
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-0 pb-6">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <p className="text-[17px] font-semibold text-foreground">Modèles</p>
          <Button type="button" variant="secondary" size="sm" className="h-9 rounded-lg text-[12px] font-semibold" onClick={onCreateModel}>
            <Plus className="mr-1.5 h-4 w-4" />
            Créer un modèle
          </Button>
        </div>

        <div className="border-b border-border bg-card px-4 py-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un modèle"
              className="h-10 rounded-lg border-border/60 bg-background pl-9 text-[14px]"
            />
          </div>
        </div>

        <div className="border-b border-border bg-card px-4 py-2">
          <ModelFilters value={filter} onChange={setFilter} />
        </div>
        <div className="border-b border-border bg-card px-4 py-2">
          <ModelTabs value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="flex flex-col divide-y divide-border border-b border-border bg-card">
          {filtered.map((model) => {
            const parsed = parseRCC(model.rccCode);
            const segments = buildWorkoutSegments(parsed.blocks, { sport: model.activityType as any });
            const metrics = resolveWorkoutMetrics({
              segments,
            });
            const preview = parsed.blocks[0] ? formatParsedBlockSummary(parsed.blocks[0]) : "Séance modèle";
            return (
              <ModelCard
                key={model.id}
                model={model}
                summaryLine={[metrics.durationLabel, metrics.distanceLabel, metrics.intensityLabel].filter(Boolean).join(" • ")}
                previewLine={preview}
                accentColor={workoutAccentColor(segments, model.activityType as any)}
                miniProfile={renderWorkoutMiniProfile(segments, { density: "compact" })}
                onOpen={() => setSelectedModel(model)}
                onAdd={() => setSheetModel(model)}
                onMenu={
                  model.source === "mine"
                    ? () => {
                        const action = window.prompt("Action: edit / duplicate / delete", "edit");
                        if (action === "edit") onEditModel(model);
                        if (action === "duplicate") onDuplicateModel(model);
                        if (action === "delete") onDeleteModel(model);
                      }
                    : undefined
                }
              />
            );
          })}
          {filtered.length === 0 ? (
            <div className="bg-secondary/20 px-4 py-10 text-center">
              <p className="text-[14px] font-semibold text-foreground">Aucun modèle trouvé</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Affinez votre recherche ou changez de filtre.</p>
            </div>
          ) : null}
        </div>
      </div>

      <AddToPlanningSheet
        open={!!sheetModel}
        model={sheetModel}
        days={weekDays}
        getExistingSessionTitle={(day) => existingSessionsByDay[day.toISOString().slice(0, 10)]}
        onClose={() => setSheetModel(null)}
        onConfirm={(day, replaceExisting) => {
          if (!sheetModel) return;
          onAddToPlanning(sheetModel, day, replaceExisting);
          setSheetModel(null);
        }}
      />
    </>
  );
}

