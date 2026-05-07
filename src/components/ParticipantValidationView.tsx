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
}

interface ParticipantValidationViewProps {
  session: Session;
  userId: string;
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

export const ParticipantValidationView = ({ session, userId, onComplete }: ParticipantValidationViewProps) => {
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
      <div className="shrink-0 space-y-3">
        <header className="ios-card flex items-center justify-between px-3 py-3">
          <button
            type="button"
            onClick={onComplete}
            className="inline-flex items-center text-[17px] font-medium text-[#007AFF]"
          >
            <ChevronLeft className="h-5 w-5" />
            Seances
          </button>
          <h1 className="truncate px-2 text-[33px] font-semibold tracking-[-0.4px] text-foreground">
            Confirmer ma seance
          </h1>
          <button
            type="button"
            onClick={onComplete}
            className="text-[17px] font-semibold text-[#007AFF]"
          >
            OK
          </button>
        </header>

        <section className="ios-card space-y-3 p-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#8E8E93]">
              Seance a confirmer
            </p>
            <p className="mt-1 truncate text-[31px] font-semibold tracking-[-0.3px] text-foreground">
              {session.title}
            </p>
            <p className="text-[26px] tracking-[-0.2px] text-[#6E6E73]">
              {format(new Date(session.scheduled_at), "EEE d MMM · HH'h'mm", { locale: fr })}
              {' · '}
              {session.location_name}
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une activite"
              className="h-12 w-full rounded-[11px] border border-transparent bg-[#E7E7ED] pl-10 pr-3 text-[17px] text-foreground placeholder:text-[#8E8E93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#8E8E93]">
              Activites recentes
            </p>
            <div className="rounded-full bg-[#FC4C02] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
              Strava
            </div>
          </div>
        </section>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div className="ios-card flex items-center justify-center p-8">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : !participantRow ? (
          <div className="ios-card p-6 text-center text-[15px] text-muted-foreground">
            Vous n etes pas inscrit a cette seance.
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="ios-card p-6 text-center text-[15px] text-muted-foreground">
            Aucune activite trouvee.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-border/70 bg-card">
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
                    'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors',
                    selected && 'bg-[#EDF8EF]',
                    dimmed && 'opacity-85',
                    index !== filteredActivities.length - 1 && 'border-b border-border/60',
                  )}
                >
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] text-[20px]', activityAccent(activity.sportType))}>
                    <span>{activityEmoji(activity.sportType)}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[17px] font-semibold text-foreground">{activity.title}</p>
                      {activity.isTopMatch ? (
                        <span className="rounded-full bg-[#A7F3B9] px-1.5 py-[2px] text-[10px] font-bold uppercase tracking-[0.06em] text-[#13A538]">
                          Sugeree
                        </span>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-[14px] leading-[1.2] text-[#6E6E73]">
                      {format(new Date(activity.startDate), "d MMM HH'h'mm", { locale: fr })}
                      {activity.distanceKm ? ` · ${activity.distanceKm.toFixed(1)} km` : ''}
                      {activity.durationMin ? ` · ${activity.durationMin} min` : ''}
                      {activity.paceOrSpeed ? ` · ${activity.paceOrSpeed}` : ''}
                    </p>
                  </div>

                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                      selected ? 'border-[#34C759] bg-[#34C759] text-white' : 'border-[#C7C7CC] bg-transparent text-transparent',
                    )}
                  >
                    {selectingId === activity.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <Check className="h-4 w-4 stroke-[3]" />
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
