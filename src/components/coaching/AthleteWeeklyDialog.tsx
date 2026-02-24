import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { AthleteWeeklyView } from "./AthleteWeeklyView";
import { CoachingSessionDetail } from "./CoachingSessionDetail";

interface CoachingSession {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  activity_type: string;
  distance_km: number | null;
  pace_target: string | null;
  status: string;
  coach_id: string;
  club_id: string;
  objective?: string | null;
  rcc_code?: string | null;
}

interface AthleteWeeklyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  clubName: string;
}

export const AthleteWeeklyDialog = ({ isOpen, onClose, clubId, clubName }: AthleteWeeklyDialogProps) => {
  const [selectedSession, setSelectedSession] = useState<CoachingSession | null>(null);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent fullScreen hideCloseButton>
          <DialogHeader className="sticky top-0 bg-background z-10 border-b p-4">
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -ml-2">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="truncate">Mon plan · {clubName}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 bg-secondary">
            <AthleteWeeklyView
              clubId={clubId}
              sessions={[]}
              onSessionClick={(s) => setSelectedSession(s)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <CoachingSessionDetail
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        session={selectedSession}
        isCoach={false}
      />
    </>
  );
};
