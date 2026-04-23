import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  CheckCircle,
  CircleAlert,
  Clock3,
  Loader2,
  MapPin,
  MessageSquare,
  Route,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
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

type ValidationState = 'pending' | 'confirmed' | 'not_confirmed' | 'absent';
type ValidationMode = 'strava' | 'manual' | 'none';
type TabId = 'participants' | 'strava' | 'comments';

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
  strava_connected?: boolean;
  selectedActivity?: CandidateActivity | null;
}

type SessionComment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
};

interface CreatorValidationViewProps {
  session: Session;
  onComplete: () => void;
}

const tabLabels: Record<TabId, string> = {
  participants: 'Participants',
  strava: 'Activités Strava',
  comments: 'Commentaires',
};

const statusBadgeStyles: Record<ValidationState, string> = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  not_confirmed: 'bg-amber-100 text-amber-700 border-amber-200',
  absent: 'bg-red-100 text-red-700 border-red-200',
};

const modeBadgeStyles: Record<ValidationMode, string> = {
  strava: 'bg-sky-100 text-sky-700 border-sky-200',
  manual: 'bg-violet-100 text-violet-700 border-violet-200',
  none: 'bg-slate-100 text-slate-600 border-slate-200',
};

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

function getValidationMode(participant: Participant): ValidationMode {
  if (participant.selectedActivity) return 'strava';
  if (participant.confirmed_by_creator === true) return 'manual';
  return 'none';
}

function statusLabel(state: ValidationState) {
  switch (state) {
    case 'confirmed':
      return 'Confirmé';
    case 'absent':
      return 'Absent';
    case 'not_confirmed':
      return 'Non confirmé';
    default:
      return 'En attente';
  }
}

function modeLabel(mode: ValidationMode) {
  switch (mode) {
    case 'strava':
      return 'Via Strava';
    case 'manual':
      return 'Manuel';
    default:
      return 'Aucun';
  }
}

export const CreatorValidationView = ({ session, onComplete }: CreatorValidationViewProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [comments, setComments] = useState<SessionComment[]>([]);
  const [organizerLabel, setOrganizerLabel] = useState('Créateur');
  const [activeTab, setActiveTab] = useState<TabId>('participants');
  const [globalComment, setGlobalComment] = useState('');
  const [participantCommentDrafts, setParticipantCommentDrafts] = useState<Record<string, string>>({});
  const [publishingComment, setPublishingComment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [bulkConfirming, setBulkConfirming] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, [session.id]);

  const bootstrap = async () => {
    setLoading(true);
    await Promise.all([fetchParticipants(), fetchComments(), fetchOrganizer()]);
    setLoading(false);
  };

  const fetchOrganizer = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', session.organizer_id)
      .maybeSingle();

    if (data) {
      setOrganizerLabel(data.display_name || data.username || 'Créateur');
    }
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
          .select('user_id, username, display_name, avatar_url, strava_connected')
          .in('user_id', userIds);

        const enriched = participantsData.map(p => ({
          ...p,
          username: profiles?.find(pr => pr.user_id === p.user_id)?.username || '',
          display_name: profiles?.find(pr => pr.user_id === p.user_id)?.display_name || null,
          avatar_url: profiles?.find(pr => pr.user_id === p.user_id)?.avatar_url || null,
          strava_connected: profiles?.find(pr => pr.user_id === p.user_id)?.strava_connected || false,
          selectedActivity: null,
        }));

        setParticipants(enriched);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('session_comments')
      .select('id, content, created_at, user_id')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    const userIds = Array.from(new Set((data || []).map(item => item.user_id)));
    const { data: profiles } = userIds.length
      ? await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', userIds)
      : { data: [] };

    const profileById = new Map((profiles || []).map(p => [p.user_id, p]));
    const parsed: SessionComment[] = (data || []).map(item => {
      const profile = profileById.get(item.user_id);
      return {
        id: item.id,
        content: item.content,
        created_at: item.created_at,
        user_id: item.user_id,
        display_name: profile?.display_name || profile?.username || 'Utilisateur',
        username: profile?.username || 'utilisateur',
        avatar_url: profile?.avatar_url || null,
      };
    });
    setComments(parsed);
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

  const handleManualValidate = async (participantId: string) => {
    await updateParticipant(participantId, {
      confirmed_by_creator: true,
      validation_status: 'validated',
    });
    toast({
      title: 'Participation confirmée',
      description: 'Le participant a été confirmé manuellement.',
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

  const handleMarkNotConfirmed = async (participantId: string) => {
    await updateParticipant(participantId, {
      confirmed_by_creator: false,
      validation_status: 'not_confirmed',
    });
    toast({
      title: 'Participant non confirmé',
      description: 'Le statut a été enregistré.',
    });
  };

  const handleConfirmAll = async () => {
    if (!participants.length) return;

    setBulkConfirming(true);
    try {
      const ids = participants
        .filter(p => getValidationState(p) === 'pending')
        .map(p => p.id);

      if (!ids.length) {
        toast({
          title: 'Tout est déjà traité',
          description: 'Aucun participant en attente à confirmer.',
        });
        return;
      }

      const { error } = await supabase
        .from('session_participants')
        .update({ confirmed_by_creator: true, validation_status: 'validated' })
        .in('id', ids);

      if (error) throw error;

      setParticipants(prev =>
        prev.map(p =>
          ids.includes(p.id)
            ? { ...p, confirmed_by_creator: true, validation_status: 'validated' }
            : p
        )
      );

      toast({
        title: 'Participants confirmés',
        description: `${ids.length} participant(s) confirmé(s).`,
      });
    } catch (error) {
      console.error('Error confirming all participants:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de confirmer tous les participants.',
        variant: 'destructive',
      });
    } finally {
      setBulkConfirming(false);
    }
  };

  const addComment = async (content: string) => {
    if (!user || !content.trim()) return;

    setPublishingComment(true);
    const { error } = await supabase.from('session_comments').insert({
      session_id: session.id,
      user_id: user.id,
      content: content.trim(),
    });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Le commentaire n’a pas pu être publié.',
        variant: 'destructive',
      });
      setPublishingComment(false);
      return;
    }

    setGlobalComment('');
    await fetchComments();
    setPublishingComment(false);
  };

  const addParticipantComment = async (participant: Participant) => {
    const raw = participantCommentDrafts[participant.id] || '';
    if (!raw.trim()) return;
    const label = participant.display_name || participant.username || 'Participant';
    await addComment(`[@${label}] ${raw.trim()}`);
    setParticipantCommentDrafts(prev => ({ ...prev, [participant.id]: '' }));
  };

  const candidateActivitiesByParticipant = useMemo(() => {
    const map = new Map<string, CandidateActivity[]>();
    participants.forEach(participant => {
      const generated: CandidateActivity[] = [];

      if (participant.confirmed_by_gps && participant.gps_validation_time) {
        generated.push({
          id: `gps-${participant.id}`,
          participantId: participant.id,
          title: 'Sortie détectée proche de la séance',
          sportType: session.activity_type,
          distanceKm: session.distance_km ?? null,
          durationMin: null,
          startDate: participant.gps_validation_time,
          paceOrSpeed: null,
          compatibilityScore: 78,
          isTopMatch: true,
        });
      }

      map.set(
        participant.id,
        generated.sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      );
    });

    return map;
  }, [participants, session.activity_type, session.distance_km]);

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

  const counts = useMemo(() => {
    let confirmed = 0;
    let pending = 0;
    let absent = 0;

    participants.forEach(item => {
      const state = getValidationState(item);
      if (state === 'confirmed') confirmed += 1;
      if (state === 'pending') pending += 1;
      if (state === 'absent') absent += 1;
    });

    return {
      total: participants.length,
      confirmed,
      pending,
      absent,
    };
  }, [participants]);

  const globalStatus = useMemo(() => {
    if (!counts.total || counts.pending === counts.total) return 'À confirmer';
    if (counts.confirmed === counts.total) return 'Confirmée';
    return 'Partiellement confirmée';
  }, [counts]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-[10px] p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-2">
      <div className="ios-card space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-primary/80">Confirmer la séance</p>
            <h2 className="truncate text-[20px] font-semibold text-foreground">{session.title}</h2>
            <div className="mt-2 space-y-1.5 text-[13px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(new Date(session.scheduled_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Route className="h-3.5 w-3.5" />
                <span className="capitalize">{session.activity_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{session.location_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5" />
                <span>Créateur: {organizerLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge className="border-0 bg-primary/10 text-primary">{globalStatus}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-[10px] border border-border bg-secondary/50 p-3">
            <p className="text-[12px] text-muted-foreground">Inscrits</p>
            <p className="text-[18px] font-semibold text-foreground">{counts.total}</p>
          </div>
          <div className="rounded-[10px] border border-border bg-secondary/50 p-3">
            <p className="text-[12px] text-muted-foreground">Confirmés</p>
            <p className="text-[18px] font-semibold text-emerald-700">{counts.confirmed}</p>
          </div>
          <div className="rounded-[10px] border border-border bg-secondary/50 p-3">
            <p className="text-[12px] text-muted-foreground">En attente</p>
            <p className="text-[18px] font-semibold text-amber-700">{counts.pending}</p>
          </div>
          <div className="rounded-[10px] border border-border bg-secondary/50 p-3">
            <p className="text-[12px] text-muted-foreground">Absents</p>
            <p className="text-[18px] font-semibold text-red-700">{counts.absent}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleConfirmAll}
            disabled={bulkConfirming}
            className="h-10 rounded-[10px]"
          >
            {bulkConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmer tout
          </Button>
          <Button variant="outline" onClick={onComplete} className="h-10 rounded-[10px]">
            Terminer plus tard
          </Button>
        </div>
      </div>

      <div className="ios-card p-2">
        <div className="grid grid-cols-3 gap-1">
          {(Object.keys(tabLabels) as TabId[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors ${
                activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'participants' && (
        <div className="space-y-3">
          {!participants.length ? (
            <div className="ios-card p-8 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-[15px] text-muted-foreground">Aucun participant inscrit</p>
            </div>
          ) : (
            participants.map(participant => {
              const label = participant.display_name || participant.username || 'Participant';
              const state = getValidationState(participant);
              const mode = getValidationMode(participant);
              return (
                <div key={participant.id} className="ios-card space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={participant.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-sm text-primary">{getInitials(label)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-foreground">{label}</p>
                      <p className="text-[13px] text-muted-foreground capitalize">{session.activity_type}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className={statusBadgeStyles[state]}>
                          {statusLabel(state)}
                        </Badge>
                        <Badge variant="outline" className={modeBadgeStyles[mode]}>
                          {modeLabel(mode)}
                        </Badge>
                        {mode === 'manual' && state === 'confirmed' ? (
                          <Badge variant="outline" className="border-violet-200 bg-violet-100 text-violet-700">
                            Participation confirmée manuellement
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className="h-9 justify-start gap-2 rounded-[10px]"
                      onClick={() => void handleManualValidate(participant.id)}
                      disabled={validating === participant.id}
                    >
                      {validating === participant.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />}
                      Valider manuellement
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 justify-start gap-2 rounded-[10px]"
                      onClick={() => setActiveTab('strava')}
                    >
                      <Route className="h-3.5 w-3.5 text-sky-600" />
                      Associer une activité Strava
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 justify-start gap-2 rounded-[10px]"
                      onClick={() => void handleMarkAbsent(participant.id)}
                      disabled={validating === participant.id}
                    >
                      <XCircle className="h-3.5 w-3.5 text-red-600" />
                      Marquer absent
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 justify-start gap-2 rounded-[10px]"
                      onClick={() => void handleMarkNotConfirmed(participant.id)}
                      disabled={validating === participant.id}
                    >
                      <CircleAlert className="h-3.5 w-3.5 text-amber-600" />
                      Marquer non confirmé
                    </Button>
                  </div>

                  <div className="space-y-2 rounded-[10px] border border-border bg-secondary/40 p-3">
                    <p className="text-[13px] font-medium text-foreground">Ajouter un commentaire</p>
                    <textarea
                      value={participantCommentDrafts[participant.id] || ''}
                      onChange={(event) =>
                        setParticipantCommentDrafts(prev => ({ ...prev, [participant.id]: event.target.value }))
                      }
                      rows={2}
                      placeholder="Commentaire rapide sur ce participant"
                      className="w-full rounded-[8px] border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void addParticipantComment(participant)}
                        disabled={publishingComment}
                        className="h-8 rounded-[8px]"
                      >
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                        Ajouter commentaire
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'strava' && (
        <div className="space-y-3">
          {participants.map(participant => {
            const label = participant.display_name || participant.username || 'Participant';
            const activities = candidateActivitiesByParticipant.get(participant.id) || [];
            return (
              <div key={participant.id} className="ios-card space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-foreground">{label}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {activities.length
                        ? `${activities.length} activité(s) pertinente(s)`
                        : participant.strava_connected
                          ? 'Aucune activité récente détectée'
                          : 'Strava non connecté'}
                    </p>
                  </div>
                  {activities.length ? (
                    <Badge className="border-0 bg-sky-100 text-sky-700">Plus probable disponible</Badge>
                  ) : null}
                </div>

                {activities.length ? (
                  <div className="space-y-2">
                    {activities.map(activity => (
                      <div key={activity.id} className="rounded-[10px] border border-border bg-secondary/40 p-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[14px] font-semibold text-foreground">{activity.title}</p>
                            <p className="text-[12px] text-muted-foreground">
                              {format(new Date(activity.startDate), "EEEE d MMM • HH:mm", { locale: fr })}
                            </p>
                          </div>
                          {activity.isTopMatch ? (
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-700">
                              La plus probable
                            </Badge>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[12px] text-muted-foreground sm:grid-cols-4">
                          <div>Sport: <span className="font-medium text-foreground">{activity.sportType}</span></div>
                          <div>Distance: <span className="font-medium text-foreground">{activity.distanceKm ? `${activity.distanceKm.toFixed(1)} km` : '—'}</span></div>
                          <div>Durée: <span className="font-medium text-foreground">{activity.durationMin ? `${activity.durationMin} min` : '—'}</span></div>
                          <div>Compatibilité: <span className="font-medium text-foreground">{activity.compatibilityScore}%</span></div>
                        </div>
                        {activity.paceOrSpeed ? (
                          <p className="mt-2 text-[12px] text-muted-foreground">{activity.paceOrSpeed}</p>
                        ) : null}
                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            className="h-8 rounded-[8px]"
                            onClick={() => void handleAssociateActivity(participant.id, activity)}
                          >
                            Associer à la séance
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[10px] border border-dashed border-border p-4 text-[13px] text-muted-foreground">
                    Les suggestions Strava sont triées par proximité horaire, sport, cohérence distance/durée et localisation.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-3">
          <div className="ios-card space-y-3 p-4">
            <p className="text-[15px] font-semibold text-foreground">Commenter la séance</p>
            <textarea
              value={globalComment}
              onChange={event => setGlobalComment(event.target.value)}
              rows={3}
              placeholder="Retour global, ressenti, précision sur la participation..."
              className="w-full rounded-[10px] border border-border bg-card px-3 py-2 text-[14px] text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex justify-end">
              <Button
                onClick={() => void addComment(globalComment)}
                disabled={publishingComment || !globalComment.trim()}
                className="h-9 rounded-[10px]"
              >
                Publier le commentaire
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {comments.length ? (
              comments.map(item => (
                <div key={item.id} className="ios-card p-4">
                  <div className="mb-2 flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={item.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">{getInitials(item.display_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-foreground">{item.display_name}</p>
                        <span className="truncate text-[12px] text-muted-foreground">@{item.username}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        {format(new Date(item.created_at), "d MMM yyyy • HH:mm", { locale: fr })}
                      </div>
                    </div>
                  </div>
                  <p className="text-[14px] leading-relaxed text-foreground">{item.content}</p>
                </div>
              ))
            ) : (
              <div className="ios-card p-6 text-center text-[14px] text-muted-foreground">
                Aucun commentaire pour le moment.
              </div>
            )}
          </div>
        </div>
      )}

      <Button onClick={onComplete} className="w-full h-11 rounded-[10px]">
        Terminer
      </Button>
    </div>
  );
};
