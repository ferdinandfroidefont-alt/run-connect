import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Calendar, CheckCircle2, XCircle, X, Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReliabilityDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  reliabilityRate: number;
  totalSessionsCreated: number;
  totalSessionsJoined: number;
  totalSessionsCompleted: number;
}

export const ReliabilityDetailsDialog = ({
  open,
  onOpenChange,
  userName,
  reliabilityRate,
  totalSessionsCreated,
  totalSessionsJoined,
  totalSessionsCompleted,
}: ReliabilityDetailsDialogProps) => {
  const { t } = useLanguage();
  const sessionsNotAttended = totalSessionsJoined - totalSessionsCompleted;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-background border border-border rounded-[22px] p-0 sm:rounded-[22px]">
        {/* iOS Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full hover:bg-secondary transition-colors flex items-center justify-center"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">Avis de fiabilité</h2>
          <div className="w-8" />
        </div>

        <div className="p-4 space-y-4">
          {/* Grande Card Centrée - Taux de fiabilité */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-[10px] p-6">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="text-5xl font-bold text-foreground">
                {reliabilityRate.toFixed(0)}%
              </div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">
                Taux de fiabilité
              </p>
            </div>
          </div>

          {/* Trois Mini-Cards Horizontales */}
          <div className="grid grid-cols-3 gap-3">
            {/* Séances créées */}
            <div className="bg-card border border-border rounded-[10px] p-4 flex flex-col items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{totalSessionsCreated}</p>
              <p className="text-xs text-muted-foreground text-center">Créées</p>
            </div>

            {/* Séances venues */}
            <div className="bg-card border border-border rounded-[10px] p-4 flex flex-col items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-600">{totalSessionsCompleted}</p>
              <p className="text-xs text-muted-foreground text-center">Venues</p>
            </div>

            {/* Séances pas venues */}
            <div className="bg-card border border-border rounded-[10px] p-4 flex flex-col items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{sessionsNotAttended}</p>
              <p className="text-xs text-muted-foreground text-center">Pas venues</p>
            </div>
          </div>

          {/* Texte d'explication */}
          <div className="bg-secondary border border-border rounded-[10px] p-3 flex items-start gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Info className="h-3 w-3 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground flex-1">
              Le taux augmente lorsque l'utilisateur respecte les présences confirmées.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
