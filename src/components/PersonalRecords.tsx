import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonStanding, Bike, Waves, Trophy, Footprints } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PersonalRecordsProps {
  records: {
    running_records?: any;
    cycling_records?: any;
    swimming_records?: any;
    triathlon_records?: any;
    walking_records?: any;
  };
}

export const PersonalRecords = ({ records }: PersonalRecordsProps) => {
  const { t } = useLanguage();

  const formatTime = (time: string | number) => {
    if (!time) return null;
    return time.toString();
  };

  const renderRecords = (recordsData: any, icon: React.ReactNode, sport: string) => {
    if (!recordsData || typeof recordsData !== 'object') return null;

    const entries = Object.entries(recordsData)
      .filter(([_, value]) => value && value !== "" && value !== null)
      .map(([distance, time]) => ({ distance, time: time as string | number }));

    if (entries.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          <span>{sport}</span>
        </div>
        <div className="space-y-1">
          {entries.map(({ distance, time }) => {
            const formattedTime = formatTime(time);
            if (!formattedTime) return null;
            
            return (
              <div key={distance} className="flex justify-between items-center bg-muted/30 rounded-lg px-3 py-2">
                <span className="text-sm font-medium">{distance}</span>
                <span className="text-sm text-primary font-mono">{formattedTime}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const hasRecords = 
    (records.running_records && Object.keys(records.running_records).some(k => records.running_records[k])) ||
    (records.cycling_records && Object.keys(records.cycling_records).some(k => records.cycling_records[k])) ||
    (records.swimming_records && Object.keys(records.swimming_records).some(k => records.swimming_records[k])) ||
    (records.triathlon_records && Object.keys(records.triathlon_records).some(k => records.triathlon_records[k])) ||
    (records.walking_records && Object.keys(records.walking_records).some(k => records.walking_records[k]));

  if (!hasRecords) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {t('records.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('records.noRecords')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          {t('records.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderRecords(records.running_records, <PersonStanding className="h-4 w-4" />, t('records.running'))}
        {renderRecords(records.cycling_records, <Bike className="h-4 w-4" />, t('records.cycling'))}
        {renderRecords(records.swimming_records, <Waves className="h-4 w-4" />, t('records.swimming'))}
        {renderRecords(records.triathlon_records, <Trophy className="h-4 w-4" />, t('records.triathlon'))}
        {renderRecords(records.walking_records, <Footprints className="h-4 w-4" />, t('records.walking'))}
      </CardContent>
    </Card>
  );
};
