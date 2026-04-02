import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Calendar, CheckCircle2, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReliabilityDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** @deprecated Conservé pour compatibilité des appelants */
  userName?: string;
  reliabilityRate: number;
  totalSessionsCreated: number;
  totalSessionsJoined: number;
  totalSessionsCompleted: number;
}

/** Plein écran mobile (comme Profil / Paramètres) ; z-[118] pour passer au-dessus du dialogue profil si empilé. */
const RELIABILITY_FULLSCREEN_SHELL =
  "fixed inset-0 left-0 right-0 top-0 z-[118] mx-auto w-full min-w-0 max-w-full translate-x-0 translate-y-0 box-border flex h-[100dvh] max-h-[100dvh] flex-col overflow-x-hidden overflow-y-hidden rounded-none border-0 bg-secondary p-0 sm:inset-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:z-[115] sm:mx-0 sm:h-auto sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:overflow-y-auto sm:rounded-[20px] sm:border sm:border-border/60 sm:bg-card sm:shadow-[var(--shadow-card)]";

export const ReliabilityDetailsDialog = ({
  open,
  onOpenChange,
  reliabilityRate,
  totalSessionsCreated,
  totalSessionsJoined,
  totalSessionsCompleted,
}: ReliabilityDetailsDialogProps) => {
  const sessionsNotAttended = Math.max(0, totalSessionsJoined - totalSessionsCompleted);
  const rate = Math.min(100, Math.max(0, Number(reliabilityRate) || 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className={cn(RELIABILITY_FULLSCREEN_SHELL)}>
        <div className="shrink-0 border-b border-border/60 bg-card pt-[env(safe-area-inset-top,0px)]">
          <div className="flex min-w-0 items-center justify-between gap-2 px-ios-4 py-ios-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-secondary"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            <h2 className="flex-1 text-center text-ios-headline font-semibold text-foreground">Fiabilité</h2>
            <div className="h-9 w-9 shrink-0" aria-hidden />
          </div>
        </div>

        <div
          className={cn(
            "ios-scroll-region min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]",
            "px-ios-4 py-ios-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          )}
        >
          <div className="ios-card mb-ios-4 overflow-hidden border border-border/60 shadow-[var(--shadow-card)]">
            <div className="flex flex-col items-center gap-ios-3 px-ios-4 py-ios-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 ring-2 ring-primary/20">
                <CheckCircle2 className="h-7 w-7 text-primary" strokeWidth={2} />
              </div>
              <p className="text-[40px] font-bold tabular-nums leading-none tracking-tight text-foreground">
                {rate.toFixed(0)}%
              </p>
              <p className="text-ios-footnote font-medium uppercase tracking-wide text-muted-foreground">
                Taux de fiabilité
              </p>
            </div>
          </div>

          <div className="ios-card overflow-hidden border border-border/60 shadow-[var(--shadow-card)]">
            <div className="divide-y divide-border/60">
              <div className="flex items-center gap-ios-3 px-ios-4 py-ios-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ios-md bg-primary/12">
                  <Calendar className="h-[18px] w-[18px] text-primary" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-ios-subheadline text-foreground">Séances créées</p>
                  <p className="text-ios-footnote text-muted-foreground">Organisées par vous</p>
                </div>
                <p className="text-ios-title3 font-semibold tabular-nums text-foreground">
                  {totalSessionsCreated}
                </p>
              </div>
              <div className="flex items-center gap-ios-3 px-ios-4 py-ios-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ios-md bg-emerald-500/12">
                  <CheckCircle2 className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-ios-subheadline text-foreground">Présences honorées</p>
                  <p className="text-ios-footnote text-muted-foreground">Séances rejointes, effectuées</p>
                </div>
                <p className="text-ios-title3 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {totalSessionsCompleted}
                </p>
              </div>
              <div className="flex items-center gap-ios-3 px-ios-4 py-ios-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ios-md bg-destructive/12">
                  <XCircle className="h-[18px] w-[18px] text-destructive" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-ios-subheadline text-foreground">Absences</p>
                  <p className="text-ios-footnote text-muted-foreground">Après inscription</p>
                </div>
                <p className="text-ios-title3 font-semibold tabular-nums text-destructive">
                  {sessionsNotAttended}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-ios-4 flex gap-ios-3 rounded-ios-lg border border-border/60 bg-secondary/60 px-ios-3 py-ios-3 dark:bg-[#111]/80">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12">
              <Info className="h-4 w-4 text-primary" strokeWidth={2} />
            </div>
            <p className="text-ios-footnote leading-snug text-muted-foreground">
              Le taux augmente lorsque les présences confirmées sont respectées. Il reflète votre assiduité sur les
              séances auxquelles vous participez.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
