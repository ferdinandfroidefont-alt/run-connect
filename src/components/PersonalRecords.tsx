import { PersonStanding, Bike, Waves, Trophy, Footprints, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

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

  const renderSportRecords = (recordsData: any, sportKey: keyof typeof sportConfig) => {
    if (!recordsData || typeof recordsData !== 'object') return null;

    const entries = Object.entries(recordsData)
      .filter(([_, value]) => value && value !== "" && value !== null)
      .map(([distance, time]) => ({ distance, time: time as string | number }));

    if (entries.length === 0) return null;

    const config = sportConfig[sportKey];
    const Icon = config.icon;

    return (
      <div key={sportKey} className="relative">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className={cn("h-[30px] w-[30px] rounded-[7px] flex items-center justify-center flex-shrink-0", config.color)}>
            <Icon className="h-[18px] w-[18px] text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[17px] text-foreground">{config.label}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {entries.map(({ distance, time }) => {
                const formattedTime = formatTime(time);
                if (!formattedTime) return null;
                return (
                  <span key={distance} className="text-[13px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {distance}: <span className="text-primary font-medium">{formattedTime}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-[54px] right-0 h-px bg-border" />
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4">
        Records personnels
      </p>
      
      {/* iOS Inset Grouped Card */}
      <div className="bg-card rounded-[10px] overflow-hidden">
        {hasRecords ? (
          <>
            {renderSportRecords(records.running_records, 'running')}
            {renderSportRecords(records.cycling_records, 'cycling')}
            {renderSportRecords(records.swimming_records, 'swimming')}
            {renderSportRecords(records.triathlon_records, 'triathlon')}
            {renderSportRecords(records.walking_records, 'walking')}
          </>
        ) : (
          <div className="px-4 py-4 text-center">
            <div className="text-3xl mb-2">🏅</div>
            <p className="text-[15px] text-muted-foreground">
              Aucun record enregistré
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
