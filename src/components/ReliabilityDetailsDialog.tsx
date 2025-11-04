import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle2, Users } from "lucide-react";
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
                  Séances créées
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{totalSessionsCompleted}</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Séances venues
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <Users className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{sessionsNotAttended}</p>
                <p className="text-sm text-red-600 dark:text-red-400">
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
