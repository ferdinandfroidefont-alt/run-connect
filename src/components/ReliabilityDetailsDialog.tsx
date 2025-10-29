import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle2, Users, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReliabilityDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  reliabilityRate: number;
  totalSessionsCreated: number;
  totalSessionsJoined: number;
  totalSessionsCompleted: number;
  totalSessionsAbsent: number;
}

export const ReliabilityDetailsDialog = ({
  open,
  onOpenChange,
  userName,
  reliabilityRate,
  totalSessionsCreated,
  totalSessionsJoined,
  totalSessionsCompleted,
  totalSessionsAbsent,
}: ReliabilityDetailsDialogProps) => {
  const { t } = useLanguage();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            {t('reliability.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Taux de fiabilité */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {reliabilityRate.toFixed(0)}%
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('reliability.rate')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stats détaillées */}
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{totalSessionsCreated}</p>
                <p className="text-sm text-muted-foreground">
                  {t('reliability.sessionsCreated')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{totalSessionsJoined}</p>
                <p className="text-sm text-muted-foreground">
                  {t('reliability.sessionsJoined')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{totalSessionsCompleted}</p>
                <p className="text-sm text-muted-foreground">
                  Séances venues
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{totalSessionsAbsent}</p>
                <p className="text-sm text-muted-foreground">
                  Séances pas venues
                </p>
              </div>
            </div>
          </div>

          {/* Message récapitulatif */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-center">
              {t('reliability.summary')
                .replace('{{name}}', userName)
                .replace('{{joined}}', totalSessionsJoined.toString())
                .replace('{{created}}', totalSessionsCreated.toString())}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
