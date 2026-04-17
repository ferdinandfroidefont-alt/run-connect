import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, ChevronLeft, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AthletePlanSessionModel } from "./types";
import { blockSummary, mapParticipationToUiStatus } from "./planUtils";
import { sportBadgeClass, sportLabel } from "./sportTokens";
import { AthleteSessionStatusBadge } from "./AthleteSessionStatusBadge";

type Felt = "easy" | "ok" | "hard" | null;

type Props = {
  session: AthletePlanSessionModel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
  onComplete?: () => void;
  onMessageCoach?: () => void;
  onSaveFeedback?: (payload: { note: string; rpe: number | null; felt: Felt }) => void;
  saving?: boolean;
};

export function AthletePlanSessionDetailSheet({
  session,
  open,
  onOpenChange,
  onConfirm,
  onComplete,
  onMessageCoach,
  onSaveFeedback,
  saving,
}: Props) {
  const [note, setNote] = useState("");
  const [rpe, setRpe] = useState<string>("");
  const [felt, setFelt] = useState<Felt>(null);

  useEffect(() => {
    if (session) {
      setNote(session.athleteNote?.trim() || "");
      setRpe("");
      setFelt(null);
    }
  }, [session?.id, session?.athleteNote, open]);

  if (!session) return null;

  const ui = mapParticipationToUiStatus(session.participationStatus, session.hasConflict);
  const actionUi = ui === "conflict" ? mapParticipationToUiStatus(session.participationStatus, false) : ui;
  const blocks = [...session.blocks].sort((a, b) => a.order - b.order);
  const dt = parseISO(session.assignedDate);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-t-3xl border-border p-0 sm:max-w-lg sm:rounded-t-3xl"
      >
        <div className="sticky top-0 z-10 border-b border-border bg-card px-4 pb-3 pt-[max(0.5rem,var(--safe-area-top))]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-secondary"
              onClick={() => onOpenChange(false)}
              aria-label="Fermer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-[16px] font-semibold">Détail séance</p>
            </div>
            <span className="inline-flex h-9 w-9" aria-hidden />
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-[max(1rem,var(--safe-area-bottom))]">
          <div className="space-y-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-2.5 py-0.5 text-[12px] font-semibold", sportBadgeClass(session.sport))}>
                {sportLabel(session.sport)}
              </span>
              <AthleteSessionStatusBadge status={ui} />
            </div>

            <div>
              <h2 className="text-[22px] font-bold leading-tight text-foreground">{session.title}</h2>
              <p className="mt-1 text-[14px] text-muted-foreground">
                {session.coachName}
                {session.clubName ? ` · ${session.clubName}` : ""}
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-secondary/40 px-3 py-2.5 text-[14px]">
              <p className="font-semibold text-foreground">
                {format(dt, "EEEE d MMMM yyyy", { locale: fr })} · {format(dt, "HH:mm")}
              </p>
              {session.locationName ? (
                <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {session.locationName}
                </p>
              ) : null}
            </div>

            {session.objective ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Objectif</p>
                <p className="mt-1 text-[14px] leading-relaxed text-foreground">{session.objective}</p>
              </div>
            ) : null}

            {session.coachNotes ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes coach</p>
                <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">{session.coachNotes}</p>
              </div>
            ) : null}

            {session.description ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{session.description}</p>
              </div>
            ) : null}

            {blocks.length > 0 ? (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Structure</p>
                <ol className="mt-2 space-y-2">
                  {blocks.map((b, i) => (
                    <li key={b.id} className="rounded-xl border border-border/60 bg-card px-3 py-2 text-[13px] text-foreground">
                      <span className="font-semibold text-muted-foreground">{i + 1}. </span>
                      {blockSummary(b)}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {session.hasConflict ? (
              <div className="rounded-xl border border-violet-400/40 bg-violet-500/10 px-3 py-2 text-[13px] text-violet-950 dark:text-violet-100">
                Deux séances sont proches sur cette plage horaire. Parlez-en avec votre coach.
              </div>
            ) : null}

            <div className="space-y-2 rounded-2xl border border-border/80 bg-secondary/30 p-3">
              <p className="text-[12px] font-semibold text-foreground">Votre retour</p>
              <div className="flex gap-2">
                {(["easy", "ok", "hard"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFelt((f) => (f === key ? null : key))}
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-[12px] font-semibold transition-colors",
                      felt === key ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {key === "easy" ? "Facile" : key === "ok" ? "Ok" : "Dur"}
                  </button>
                ))}
              </div>
              <label className="text-[11px] font-medium text-muted-foreground">RPE (optionnel)</label>
              <Input
                inputMode="numeric"
                placeholder="1–10"
                value={rpe}
                onChange={(e) => setRpe(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                className="h-10 rounded-xl"
              />
              <label className="text-[11px] font-medium text-muted-foreground">Commentaire</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ressenti, sensations, imprévus…"
                className="min-h-[100px] rounded-xl text-[14px]"
              />
              {onSaveFeedback ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full rounded-xl"
                  disabled={saving}
                  onClick={() => {
                    const n = Number.parseInt(rpe, 10);
                    onSaveFeedback({
                      note,
                      rpe: Number.isFinite(n) && n >= 1 && n <= 10 ? n : null,
                      felt,
                    });
                  }}
                >
                  Enregistrer le retour
                </Button>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 pb-2">
              {actionUi !== "done" && actionUi !== "missed" ? (
                <>
                  {actionUi === "planned" ? (
                    <Button type="button" className="h-11 w-full rounded-xl text-[15px] font-semibold" onClick={onConfirm}>
                      Confirmer la séance
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant={actionUi === "planned" ? "outline" : "default"}
                    className="h-11 w-full gap-2 rounded-xl text-[15px] font-semibold"
                    onClick={onComplete}
                  >
                    <Check className="h-4 w-4" />
                    Marquer comme faite
                  </Button>
                </>
              ) : null}
              {onMessageCoach ? (
                <Button type="button" variant="secondary" className="h-11 w-full gap-2 rounded-xl" onClick={onMessageCoach}>
                  <MessageCircle className="h-4 w-4" />
                  Message au coach
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
