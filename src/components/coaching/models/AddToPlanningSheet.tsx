import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DaySelector } from "@/components/coaching/models/DaySelector";
import type { SessionModelItem } from "@/components/coaching/models/types";

interface AddToPlanningSheetProps {
  open: boolean;
  model: SessionModelItem | null;
  days: Date[];
  getExistingSessionTitle?: (day: Date) => string | undefined;
  onClose: () => void;
  onConfirm: (day: Date, replaceExisting: boolean) => void;
}

export function AddToPlanningSheet({
  open,
  model,
  days,
  getExistingSessionTitle,
  onClose,
  onConfirm,
}: AddToPlanningSheetProps) {
  const [selectedDay, setSelectedDay] = useState<Date>(days[0] ?? new Date());
  const [replaceExisting, setReplaceExisting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedDay(days[0] ?? new Date());
      setReplaceExisting(false);
    }
  }, [days, open]);

  const existingSessionTitle = getExistingSessionTitle?.(selectedDay);

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent side="bottom" showCloseButton={false} className="h-[66dvh] rounded-t-[20px] border-border bg-card p-0">
        <div className="border-b border-border px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="h-1.5 w-10 rounded-full bg-muted" />
            <button type="button" className="rounded-full bg-secondary p-1.5 text-muted-foreground" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-center text-[17px] font-semibold text-foreground">Ajouter au planning</p>
        </div>

        <div className="space-y-4 px-4 py-4">
          {model ? (
            <div className="rounded-2xl border border-border bg-secondary/40 p-3">
              <p className="text-[14px] font-semibold text-foreground">{model.title}</p>
              <p className="text-[12px] text-muted-foreground">{model.objective || "Séance modèle"}</p>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Choisir le jour</p>
            <DaySelector days={days} selected={selectedDay} onSelect={setSelectedDay} />
          </div>

          <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2">
            <p className="text-[13px] font-medium text-foreground">
              {format(selectedDay, "EEEE d MMMM", { locale: fr })}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {existingSessionTitle ? `Séance prévue: ${existingSessionTitle}` : "Aucune séance prévue"}
            </p>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
            <span className="text-[13px] font-medium text-foreground">Remplacer séance existante</span>
            <button
              type="button"
              onClick={() => setReplaceExisting((v) => !v)}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${replaceExisting ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  replaceExisting ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          <Button
            type="button"
            className="h-11 w-full rounded-xl text-[15px] font-semibold"
            onClick={() => onConfirm(selectedDay, replaceExisting)}
            disabled={!model}
          >
            Ajouter au planning
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

