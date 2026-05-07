import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Check, X, Loader2, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

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

type ValidationState = 'pending' | 'confirmed' | 'not_confirmed' | 'absent';

type CandidateActivity = {
  id: string;
  participantId: string;
  title: string;
  sportType: string;
  distanceKm: number | null;
  durationMin: number | null;
  startDate: string;
  paceOrSpeed: string | null;
  compatibilityScore: number;
  isTopMatch: boolean;
};

interface Participant {
  id: string;
  user_id: string;
  confirmed_by_creator: boolean | null;
  confirmed_by_gps: boolean | null;
  validation_status: string | null;
  gps_validation_time: string | null;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  selectedActivity?: CandidateActivity | null;
  profileTag?: string;
  profileLevel?: string;
}

interface CreatorValidationViewProps {
  session: Session;
  onBack?: () => void;
  onComplete: () => void;
}

const avatarFallbackTones = [
  'from-[#2AA8FF] to-[#1A73E8]',
  'from-[#C46AFB] to-[#8B5CF6]',
  'from-[#34D399] to-[#14B8A6]',
  'from-[#FFA940] to-[#FF6B6B]',
  'from-[#FF6B35] to-[#FF8A00]',
  'from-[#FACC15] to-[#EAB308]',
];

function getInitials(name: string) {
  return (name || 'U')
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function getValidationState(participant: Participant): ValidationState {
  if (participant.confirmed_by_creator === true) return 'confirmed';
  if (participant.validation_status === 'absent') return 'absent';
  if (participant.validation_status === 'not_confirmed') return 'not_confirmed';
  return 'pending';
}

export const CreatorValidationView = ({ session, onBack, onComplete }: CreatorValidationViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState<null | 'present' | 'absent'>(null);
  const [candidateActivitiesByParticipant, setCandidateActivitiesByParticipant] = useState<Record<string, CandidateActivity[]>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void bootstrap();
  }, [session.id]);

  const bootstrap = async () => {
    setLoading(true);
    await fetchParticipants();
    await fetchStravaCandidates();
    setLoading(false);
  };

  const fetchStravaCandidates = async () => {
    const { data, error } = await supabase.functions.invoke('strava-session-candidates', {
      body: { sessionId: session.id },
    });

    if (error) {
      console.error('Error fetching strava candidates:', error);
      return;
    }

    const nextMap: Record<string, CandidateActivity[]> = {};
    const byParticipant = data?.byParticipant as Record<string, CandidateActivity[]> | undefined;
    Object.entries(byParticipant || {}).forEach(([participantId, activities]) => {
      nextMap[participantId] = (activities || []).map((item, idx) => ({
        ...item,
        participantId,
        isTopMatch: idx === 0,
      }));
    });
    setCandidateActivitiesByParticipant(nextMap);
  };

  const fetchParticipants = async () => {
    try {
      const { data: participantsData, error } = await supabase
        .from('session_participants')
        .select('id, user_id, confirmed_by_creator, confirmed_by_gps, validation_status, gps_validation_time')
        .eq('session_id', session.id)
        .neq('user_id', user?.id);

      if (error) throw error;

      if (participantsData && participantsData.length > 0) {
        const userIds = participantsData.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', userIds);

        const enriched = participantsData.map(p => ({
          ...p,
          username: profiles?.find(pr => pr.user_id === p.user_id)?.username || '',
          display_name: profiles?.find(pr => pr.user_id === p.user_id)?.display_name || null,
          avatar_url: profiles?.find(pr => pr.user_id === p.user_id)?.avatar_url || null,
          selectedActivity: null,
          profileTag: 'Senior',
          profileLevel: session.activity_type === 'running' ? 'Coureur' : 'Athlète',
        }));

        setParticipants(enriched);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const updateParticipant = async (
    participantId: string,
    payload: { confirmed_by_creator: boolean | null; validation_status: string | null }
  ) => {
    setValidating(participantId);
    try {
      const { error } = await supabase
        .from('session_participants')
        .update(payload)
        .eq('id', participantId);

      if (error) throw error;

      setParticipants(prev =>
        prev.map(p => (p.id === participantId ? { ...p, ...payload } : p))
      );
    } catch (error) {
      console.error('Error validating participant:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour ce participant.',
        variant: 'destructive',
      });
    } finally {
      setValidating(null);
    }
  };

  const handleMarkPresent = async (participantId: string) => {
    const participant = participants.find((p) => p.id === participantId);
    if (!participant) return;
    if (participant.confirmed_by_gps) return;

    await updateParticipant(participantId, {
      confirmed_by_creator: true,
      validation_status: 'validated',
    });
  };

  const handleMarkAbsent = async (participantId: string) => {
    await updateParticipant(participantId, {
      confirmed_by_creator: false,
      validation_status: 'absent',
    });
    toast({
      title: 'Participant marqué absent',
      description: 'Le statut a été enregistré.',
    });
  };

  const handleAssociateActivity = async (participantId: string, activity: CandidateActivity) => {
    await updateParticipant(participantId, {
      confirmed_by_creator: true,
      validation_status: 'validated',
    });

    setParticipants(prev =>
      prev.map(p => (p.id === participantId ? { ...p, selectedActivity: activity } : p))
    );

    toast({
      title: 'Activité associée',
      description: 'La participation est confirmée via Strava.',
    });
  };

  const filteredParticipants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const withStrava = participants.map((participant) => {
      const activities = candidateActivitiesByParticipant[participant.id] || [];
      return {
        ...participant,
        selectedActivity: participant.selectedActivity || activities[0] || null,
      };
    });

    if (!query) return withStrava;

    return withStrava.filter((participant) => {
      const label = `${participant.display_name || ''} ${participant.username || ''}`.toLowerCase();
      return label.includes(query);
    });
  }, [participants, candidateActivitiesByParticipant, searchQuery]);

  const confirmedCount = useMemo(
    () => participants.filter((p) => getValidationState(p) === 'confirmed').length,
    [participants],
  );

  const bulkMark = async (target: 'present' | 'absent') => {
    if (!participants.length) return;
    setBulkUpdating(target);

    try {
      const eligible = participants.filter((p) => !p.confirmed_by_gps).map((p) => p.id);
      if (!eligible.length) {
        setBulkUpdating(null);
        return;
      }

      const payload =
        target === 'present'
          ? { confirmed_by_creator: true, validation_status: 'validated' }
          : { confirmed_by_creator: false, validation_status: 'absent' };

      const { error } = await supabase
        .from('session_participants')
        .update(payload)
        .in('id', eligible);

      if (error) throw error;

      setParticipants((prev) =>
        prev.map((p) => (eligible.includes(p.id) ? { ...p, ...payload } : p)),
      );
    } catch (error) {
      console.error('Error updating all participants:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour tous les participants.',
        variant: 'destructive',
      });
    } finally {
      setBulkUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="ios-card p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <header className="flex h-11 items-center justify-between px-4">
        <button
          type="button"
          onClick={onBack ?? onComplete}
          className="inline-flex items-center gap-0.5 text-[17px] font-normal text-[#007AFF]"
        >
          <ChevronLeft className="h-5 w-5" />
          Séances
        </button>
        <h1 className="truncate px-2 text-[17px] font-semibold tracking-[-0.4px] text-foreground">
          Confirmer la séance
        </h1>
        <button
          type="button"
          onClick={onComplete}
          className="text-[17px] font-semibold text-[#007AFF]"
        >
          OK
        </button>
      </header>

      <div className="px-4 pb-3 pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8E93]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Rechercher un utilisateur"
            className="h-9 w-full rounded-[10px] border border-transparent bg-[rgba(120,120,128,0.12)] pl-8 pr-3 text-[17px] tracking-[-0.4px] text-foreground placeholder:text-[rgba(60,60,67,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </div>
      </div>

      <div className="shrink-0 grid grid-cols-[1fr_56px_56px] gap-1.5 px-[30px] pb-2 pt-1">
        <span className="text-[13px] tracking-[-0.1px] text-[rgba(60,60,67,0.6)]">
          <span className="font-semibold text-foreground">{confirmedCount}</span> / {participants.length} confirmés
        </span>
        <span className="text-center text-[11px] font-semibold uppercase tracking-[0.4px] text-[#FF3B30]">Absent</span>
        <span className="text-center text-[11px] font-semibold uppercase tracking-[0.4px] text-[#34C759]">Présent</span>
      </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(120px+env(safe-area-inset-bottom))]" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="mx-4 overflow-hidden rounded-[12px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {filteredParticipants.length === 0 ? (
          <div className="px-4 py-10 text-center text-[15px] text-muted-foreground">
            Aucun utilisateur trouvé
          </div>
        ) : (
          filteredParticipants.map((participant, index) => {
            const label = participant.display_name || participant.username || 'Participant';
            const state = getValidationState(participant);
            const isStravaValidated = !!participant.selectedActivity || !!participant.confirmed_by_gps;
            const isPresent = state === 'confirmed';
            const isAbsent = state === 'absent';
            const isLockedByGps = !!participant.confirmed_by_gps;
            const fallbackTone = avatarFallbackTones[index % avatarFallbackTones.length];

            return (
              <div
                key={participant.id}
                className={cn(
                  'grid grid-cols-[1fr_56px_56px] items-center gap-1.5 px-[14px] py-3',
                  index !== filteredParticipants.length - 1 && 'border-b border-[rgba(60,60,67,0.12)]',
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={participant.avatar_url || ''} alt={label} />
                    <AvatarFallback className={cn('bg-gradient-to-br text-[14px] font-semibold text-white', fallbackTone)}>
                      {getInitials(label)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-medium tracking-[-0.3px] text-foreground">{label}</p>
                    {isStravaValidated ? (
                      <p className="truncate text-[12px] font-semibold text-[#FC4C02]">Validé via Strava</p>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleMarkAbsent(participant.id)}
                  disabled={isLockedByGps || validating === participant.id}
                  className={cn(
                    'mx-auto flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] transition-colors',
                    isAbsent
                      ? 'border-[#FF3B30] bg-[#FF3B30] text-white'
                      : 'border-[rgba(60,60,67,0.25)] bg-transparent text-transparent',
                    (isLockedByGps || validating === participant.id) && 'opacity-60',
                  )}
                >
                  {validating === participant.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5 stroke-[2.4]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    isStravaValidated && participant.selectedActivity && !isLockedByGps
                      ? void handleAssociateActivity(participant.id, participant.selectedActivity)
                      : void handleMarkPresent(participant.id)
                  }
                  disabled={validating === participant.id || (isStravaValidated && !participant.selectedActivity)}
                  className={cn(
                    'mx-auto flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] transition-colors',
                    isPresent
                      ? 'border-[#34C759] bg-[#34C759] text-white'
                      : 'border-[rgba(60,60,67,0.25)] bg-transparent text-transparent',
                  )}
                >
                  {validating === participant.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5 stroke-[2.4]" />
                  )}
                </button>
              </div>
            );
          })
        )}
        </div>
      </div>

      <div className="shrink-0 px-[30px] pb-2">
        <div className="grid grid-cols-[1fr_56px_56px] items-center gap-1.5">
          <span />
          <button
            type="button"
            onClick={() => void bulkMark('absent')}
            disabled={bulkUpdating !== null}
            className="h-[30px] rounded-[8px] bg-[rgba(255,59,48,0.12)] px-1 text-[10.5px] font-semibold leading-tight text-[#FF3B30]"
          >
            Tous absent
          </button>
          <button
            type="button"
            onClick={() => void bulkMark('present')}
            disabled={bulkUpdating !== null}
            className="h-[30px] rounded-[8px] bg-[rgba(52,199,89,0.14)] px-1 text-[10.5px] font-semibold leading-tight text-[#34C759]"
          >
            Tous présent
          </button>
        </div>
      </div>
    </div>
  );
};
