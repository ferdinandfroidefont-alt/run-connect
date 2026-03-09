interface SportsBadgesProps {
  runningRecords?: any;
  cyclingRecords?: any;
  swimmingRecords?: any;
  triathlonRecords?: any;
  walkingRecords?: any;
}

const hasRecords = (records: any): boolean => {
  if (!records) return false;
  if (typeof records !== 'object') return false;
  return Object.keys(records).length > 0;
};

export const SportsBadges = ({
  runningRecords,
  cyclingRecords,
  swimmingRecords,
  triathlonRecords,
  walkingRecords,
}: SportsBadgesProps) => {
  const sports = [
    hasRecords(runningRecords) && { emoji: '🏃', label: 'Running' },
    hasRecords(cyclingRecords) && { emoji: '🚴', label: 'Cyclisme' },
    hasRecords(swimmingRecords) && { emoji: '🏊', label: 'Natation' },
    hasRecords(triathlonRecords) && { emoji: '🏅', label: 'Triathlon' },
    hasRecords(walkingRecords) && { emoji: '🚶', label: 'Marche' },
  ].filter(Boolean) as { emoji: string; label: string }[];

  if (sports.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {sports.map(sport => (
        <span
          key={sport.label}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-[12px] font-medium text-muted-foreground"
        >
          {sport.emoji} {sport.label}
        </span>
      ))}
    </div>
  );
};
