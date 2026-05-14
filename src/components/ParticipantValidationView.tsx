import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Check, ChevronLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Session {
  id: string;
  title: string;
  scheduled_at: string;
  location_name: string;
  location_lat: number;
  location_lng: number;
  organizer_id: string;
  activity_type: string;
  distance_km?: number | null;
}

interface ParticipantValidationViewProps {
  session: Session;
  userId: string;
  onBack?: () => void;
  onComplete: () => void;
}

type CandidateActivity = {
  id: string;
  title: string;
  sportType: string;
  distanceKm: number | null;
  durationMin: number | null;
  startDate: string;
  paceOrSpeed: string | null;
  compatibilityScore: number;
  isTopMatch?: boolean;
};

type SessionParticipantRow = {
  id: string;
  confirmed_by_gps: boolean | null;
  confirmed_by_creator: boolean | null;
  validation_status: string | null;
};

function activityEmoji(sportType: string) {
  const sport = (sportType || '').toLowerCase();
  if (sport.includes('run')) return '🏃';
  if (sport.includes('cycle') || sport.includes('ride') || sport.includes('velo')) return '🚴';
  if (sport.includes('swim')) return '🏊';
  return '🏃';
}

function activityAccent(sportType: string) {
  const sport = (sportType || '').toLowerCase();
  if (sport.includes('cycle') || sport.includes('ride') || sport.includes('velo')) return 'bg-[#FF3B30]';
  if (sport.includes('swim')) return 'bg-[#13B8B2]';
  return 'bg-[#0A84FF]';
}

export const ParticipantValidationView = ({ session, userId, onBack, onComplete }: ParticipantValidationViewProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [participantRow, setParticipantRow] = useState<SessionParticipantRow | null>(null);
  const [activities, setActivities] = useState<CandidateActivity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  useEffect(() => {
    void bootstrap();
  }, [session.id, userId]);

  const bootstrap = async () => {
    setLoading(true);
    try {
      const { data: participation, error: participationError } = await supabase
        .from('session_participants')
        .select('id, confirmed_by_gps, confirmed_by_creator, validation_status')
        .eq('session_id', session.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (participationError) throw participationError;
      if (!participation?.id) {
        setParticipantRow(null);
        setActivities([]);
        return;
      }

      setParticipantRow(participation);
      if (participation.validation_status === 'validated') {
        setSelectedActivityId('validated');
      }

      const { data, error } = await supabase.functions.invoke('strava-session-candidates', {
        body: { sessionId: session.id },
      });

      if (error) throw error;
      const byParticipant = (data?.byParticipant ?? {}) as Record<string, CandidateActivity[]>;
      const mine = (byParticipant[participation.id] ?? []).map((item, index) => ({
        ...item,
        isTopMatch: index === 0,
      }));
      setActivities(mine);
    } catch (error) {
      console.error('Error loading participant validation view:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les activites.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activities;
    return activities.filter((activity) =>
      `${activity.title} ${activity.sportType}`.toLowerCase().includes(query),
    );
  }, [activities, searchQuery]);

  const handleSelectActivity = async (activity: CandidateActivity) => {
    if (!participantRow?.id) return;
    setSelectingId(activity.id);
    try {
      const { error } = await supabase
        .from('session_participants')
        .update({
          confirmed_by_creator: true,
          validation_status: 'validated',
        })
        .eq('id', participantRow.id);

      if (error) throw error;
      setSelectedActivityId(activity.id);
    } catch (error) {
      console.error('Error selecting strava activity:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de confirmer cette activite.',
        variant: 'destructive',
      });
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col pb-[max(10px,env(safe-area-inset-bottom))]">
      <div className="shrink-0 bg-white pb-2 pt-[calc(env(safe-area-inset-top,0px)+10px)] shadow-[0_1px_0_rgba(60,60,67,0.12)]">
        <header className="flex h-12 items-center justify-between px-4">
          <button
            type="button"
            onClick={onBack ?? onComplete}
            className="inline-flex min-w-0 items-center text-[17px] font-medium text-[#007AFF]"
          >
            <ChevronLeft className="h-5 w-5 shrink-0" />
            <span className="truncate">Séance</span>
          </button>
          <h1 className="min-w-0 flex-1 truncate px-2 text-center text-[17px] font-semibold tracking-[-0.4px] text-foreground">
            Confirmer ma séance
          </h1>
          <button
            type="button"
            onClick={onComplete}
            className="text-[17px] font-semibold text-[#007AFF]"
          >
            OK
          </button>
        </header>

        <section className="mx-4 mt-2 rounded-[12px] bg-[#f5f5f7] p-[12px_14px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#8E8E93]">
              Séance à confirmer
            </p>
            <p className="mt-1 truncate text-[15px] font-semibold tracking-[-0.2px] text-foreground">
              {session.title}
            </p>
            <p className="text-[13px] tracking-[-0.1px] text-[rgba(60,60,67,0.6)]">
              {format(new Date(session.scheduled_at), "EEE d MMM · HH'h'mm", { locale: fr })}
              {session.distance_km ? ` · ${session.distance_km.toString().replace('.', ',')} km` : ''}
            </p>
          </div>
        </section>

        <div className="px-4 pb-2 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(60,60,67,0.6)]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une activité"
              className="h-9 w-full rounded-[10px] border border-transparent bg-[rgba(120,120,128,0.12)] pl-8 pr-3 text-[17px] tracking-[-0.4px] text-foreground placeholder:text-[rgba(60,60,67,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-[22px] pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[rgba(60,60,67,0.6)]">
            Activités récentes
          </p>
          <div className="rounded-full bg-[#FC4C02] px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.2px] text-white">
            Strava
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-[90px]" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div className="mx-4 rounded-[12px] bg-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : !participantRow ? (
          <div className="mx-4 rounded-[12px] bg-white p-6 text-center text-[15px] text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            Vous n etes pas inscrit a cette seance.
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="mx-4 rounded-[12px] bg-white p-6 text-center text-[15px] text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            Aucune activite trouvee.
          </div>
        ) : (
          <div className="mx-4 overflow-hidden rounded-[12px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            {filteredActivities.map((activity, index) => {
              const selected = selectedActivityId === activity.id;
              const dimmed = selectedActivityId !== null && selectedActivityId !== activity.id;

              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => void handleSelectActivity(activity)}
                  disabled={!!selectingId || !!participantRow.confirmed_by_gps}
                  className={cn(
                    'grid w-full grid-cols-[44px_1fr_32px] items-center gap-3 px-[14px] py-3 text-left transition-colors',
                    selected && 'bg-[rgba(52,199,89,0.06)]',
                    dimmed && 'opacity-85',
                    index !== filteredActivities.length - 1 && 'border-b border-[rgba(60,60,67,0.12)]',
                  )}
                >
                  <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[24px]', activityAccent(activity.sportType))}>
                    <span>{activityEmoji(activity.sportType)}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[15px] font-semibold tracking-[-0.2px] text-foreground">{activity.title}</p>
                      {activity.isTopMatch ? (
                        <span className="rounded-full bg-[rgba(52,199,89,0.14)] px-1.5 py-[2px] text-[9.5px] font-bold uppercase tracking-[0.2px] text-[#34C759]">
                          Suggérée
                        </span>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-[12px] leading-[1.2] text-[rgba(60,60,67,0.6)]">
                      {format(new Date(activity.startDate), "d MMM HH'h'mm", { locale: fr })}
                      {activity.distanceKm ? ` · ${activity.distanceKm.toFixed(1)} km` : ''}
                      {activity.durationMin ? ` · ${activity.durationMin} min` : ''}
                      {activity.paceOrSpeed ? ` · ${activity.paceOrSpeed}` : ''}
                    </p>
                  </div>

                  <div
                    className={cn(
                      'mx-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                      selected ? 'border-[#34C759] bg-[#34C759] text-white' : 'border-[rgba(60,60,67,0.25)] bg-transparent text-transparent',
                    )}
                  >
                    {selectingId === activity.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    ) : (
                      <Check className="h-3.5 w-3.5 stroke-[2.4]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
