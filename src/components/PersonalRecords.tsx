import { useState } from "react";
import { PersonStanding, Bike, Waves, Trophy, Footprints, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PersonalRecordsProps {
  records: {
    running_records?: any;
    cycling_records?: any;
    swimming_records?: any;
    triathlon_records?: any;
    walking_records?: any;
  };
}

const sportConfig = {
  running: { icon: PersonStanding, color: "bg-orange-500", label: "Course" },
  cycling: { icon: Bike, color: "bg-green-500", label: "Vélo" },
  swimming: { icon: Waves, color: "bg-blue-500", label: "Natation" },
  triathlon: { icon: Trophy, color: "bg-purple-500", label: "Triathlon" },
  walking: { icon: Footprints, color: "bg-yellow-500", label: "Marche" },
};

export const PersonalRecords = ({ records }: PersonalRecordsProps) => {
  const { t } = useLanguage();
  const [showDialog, setShowDialog] = useState(false);

  const formatTime = (time: string | number) => {
    if (!time) return null;
    return time.toString();
  };

  const hasRecords = 
    (records.running_records && Object.keys(records.running_records).some(k => records.running_records[k])) ||
    (records.cycling_records && Object.keys(records.cycling_records).some(k => records.cycling_records[k])) ||
    (records.swimming_records && Object.keys(records.swimming_records).some(k => records.swimming_records[k])) ||
    (records.triathlon_records && Object.keys(records.triathlon_records).some(k => records.triathlon_records[k])) ||
    (records.walking_records && Object.keys(records.walking_records).some(k => records.walking_records[k]));

  const getRecordsCount = () => {
    let count = 0;
    if (records.running_records) count += Object.values(records.running_records).filter(v => v).length;
    if (records.cycling_records) count += Object.values(records.cycling_records).filter(v => v).length;
    if (records.swimming_records) count += Object.values(records.swimming_records).filter(v => v).length;
    if (records.triathlon_records) count += Object.values(records.triathlon_records).filter(v => v).length;
    if (records.walking_records) count += Object.values(records.walking_records).filter(v => v).length;
    return count;
  };

  const renderSportRecordsDetail = (recordsData: any, sportKey: keyof typeof sportConfig) => {
    if (!recordsData || typeof recordsData !== 'object') return null;

    const entries = Object.entries(recordsData)
      .filter(([_, value]) => value && value !== "" && value !== null)
      .map(([distance, time]) => ({ distance, time: time as string | number }));

    if (entries.length === 0) return null;

    const config = sportConfig[sportKey];
    const Icon = config.icon;

    return (
      <div key={sportKey} className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", config.color)}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
          <span>{config.label}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {entries.map(({ distance, time }) => {
            const formattedTime = formatTime(time);
            if (!formattedTime) return null;
            return (
              <div
                key={distance}
                className="flex min-w-0 items-center justify-between gap-2 bg-secondary/50 rounded-lg px-3 py-2 ios-shell:px-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{distance}</span>
                <span className="min-w-0 truncate text-right text-sm font-mono text-primary tabular-nums">
                  {formattedTime}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const recordsCount = getRecordsCount();

  return (
    <>
      {/* iOS List Item Row */}
      <button
        onClick={() => setShowDialog(true)}
        className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors"
      >
        <div className="h-[30px] w-[30px] rounded-[7px] bg-orange-500 flex items-center justify-center">
          <Trophy className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-[17px] text-foreground">Records personnels</span>
          <div className="flex items-center gap-2">
            <span className="text-[15px] text-muted-foreground">
              {hasRecords ? `${recordsCount} record${recordsCount > 1 ? 's' : ''}` : "Aucun"}
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </div>
      </button>

      {/* Dialog with full records */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md p-0">
          <div className="p-4">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-orange-500" />
              Records personnels
            </h3>
            {hasRecords ? (
              <div className="space-y-4">
                {renderSportRecordsDetail(records.running_records, 'running')}
                {renderSportRecordsDetail(records.cycling_records, 'cycling')}
                {renderSportRecordsDetail(records.swimming_records, 'swimming')}
                {renderSportRecordsDetail(records.triathlon_records, 'triathlon')}
                {renderSportRecordsDetail(records.walking_records, 'walking')}
              </div>
            ) : (
              <div className="text-center py-8 px-4 bg-secondary/50 rounded-lg">
                <div className="text-5xl mb-4">🏅</div>
                <p className="text-base font-semibold mb-2">Aucun record pour l'instant !</p>
                <p className="text-sm text-muted-foreground">
                  Les records seront affichés ici une fois renseignés.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
