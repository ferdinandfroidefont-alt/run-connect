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
      <DialogContent className="max-w-sm bg-[#0D1B33] border border-sky-500/20 rounded-[22px] shadow-2xl shadow-black/50">
        {/* Header Custom */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-800/80 -m-6 mb-0 rounded-t-[22px]">
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
          <h2 className="text-lg font-semibold text-white">Avis de fiabilité</h2>
          <div className="w-8" /> {/* Spacer pour centrer le titre */}
        </div>

        <div className="space-y-4 pt-4">
          {/* Grande Card Centrée - Taux de fiabilité */}
          <div className="bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent border border-emerald-500/30 rounded-2xl p-6">
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              <div className="text-6xl font-bold text-white">
                {reliabilityRate.toFixed(0)}%
              </div>
              <p className="text-sm text-slate-400 uppercase tracking-wider">
                Taux de fiabilité
              </p>
            </div>
          </div>

          {/* Trois Mini-Cards Horizontales */}
          <div className="grid grid-cols-3 gap-3">
            {/* Séances créées */}
            <div className="bg-white/5 hover:bg-white/10 transition-all border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <p className="text-2xl font-bold text-white">{totalSessionsCreated}</p>
              <p className="text-xs text-slate-400 text-center">Créées</p>
            </div>

            {/* Séances venues */}
            <div className="bg-white/5 hover:bg-white/10 transition-all border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              <p className="text-2xl font-bold text-emerald-300">{totalSessionsCompleted}</p>
              <p className="text-xs text-slate-400 text-center">Venues</p>
            </div>

            {/* Séances pas venues */}
            <div className="bg-white/5 hover:bg-white/10 transition-all border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2">
              <XCircle className="h-6 w-6 text-red-400" />
              <p className="text-2xl font-bold text-red-300">{sessionsNotAttended}</p>
              <p className="text-xs text-slate-400 text-center">Pas venues</p>
            </div>
          </div>

          {/* Texte d'explication */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 text-center flex-1">
              Le taux augmente lorsque l'utilisateur respecte les présences confirmées.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
