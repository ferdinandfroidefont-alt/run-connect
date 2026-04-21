import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ActivityIcon } from "@/lib/activityIcons";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronRight, Clock, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type SessionSource = "created" | "joined";
type SessionTab = "created" | "joined" | "to-confirm";

interface UserSession {
  id: string;
  title: string;
  activity_type: string;
  location_name: string;
  scheduled_at: string;
  current_participants: number;
  organizer_id: string;
}

interface ParticipantStatus {
  confirmed_by_creator: boolean | null;
  confirmed_by_gps: boolean | null;
  validation_status: string | null;
}

const CARD_SWIPE_THRESHOLD = -80;
const SWIPE_ACTION_WIDTH = 124;

function SessionCard({
  session,
  source,
  badgeLabel,
  badgeClassName,
  showConfirmAction,
  onConfirm,
}: {
  session: UserSession;
  source: SessionSource;
  badgeLabel: string;
  badgeClassName: string;
  showConfirmAction: boolean;
  onConfirm: (sessionId: string, source: SessionSource) => void;
}) {
  const [opened, setOpened] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-ios-lg bg-card">
      {showConfirmAction && (
        <div className="absolute inset-y-0 right-0 flex w-[124px] items-center justify-center bg-primary px-3">
          <button
            type="button"
            onClick={() => onConfirm(session.id, source)}
            className="h-10 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            Confirmer
          </button>
        </div>
      )}

      <motion.div
        drag={showConfirmAction ? "x" : false}
        dragConstraints={{ left: -SWIPE_ACTION_WIDTH, right: 0 }}
        dragElastic={0.08}
        animate={{ x: opened ? -SWIPE_ACTION_WIDTH : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < CARD_SWIPE_THRESHOLD) {
            setOpened(true);
            return;
          }
          if (info.offset.x > -24) {
            setOpened(false);
          }
        }}
        onTap={() => {
          if (opened) {
            setOpened(false);
          }
        }}
        className="ios-list-row border border-white/70 dark:border-white/10"
      >
        <div className="flex items-start gap-ios-2">
          <ActivityIcon activityType={session.activity_type} size="md" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5">
              <Badge className={badgeClassName}>{badgeLabel}</Badge>
            </div>
            <h3 className="truncate text-ios-headline font-semibold">{session.title}</h3>
            <div className="mt-0.5 flex items-center gap-ios-3 text-[12px] leading-tight text-muted-foreground">
              {session.location_name ? (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{session.location_name}</span>
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex items-center gap-ios-3 text-[12px] leading-tight text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Calendar className="h-3 w-3 shrink-0" />
                {format(new Date(session.scheduled_at), "dd/MM", { locale: fr })}
              </span>
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3 shrink-0" />
                {format(new Date(session.scheduled_at), "HH:mm", { locale: fr })}
              </span>
              <span className="flex items-center gap-0.5">
                <Users className="h-3 w-3 shrink-0" />
                {session.current_participants || 0}
              </span>
            </div>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50" />
        </div>
      </motion.div>
    </div>
  );
}

export default function MySessions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<SessionTab>("created");
  const [createdSessions, setCreatedSessions] = useState<UserSession[]>([]);
  const [joinedSessions, setJoinedSessions] = useState<UserSession[]>([]);
  const [joinedStatusBySession, setJoinedStatusBySession] = useState<Record<string, ParticipantStatus>>({});
  const [createdPendingSet, setCreatedPendingSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchParams.get("tab") === "confirm") {
      setTab("to-confirm");
    }
  }, [searchParams]);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      const { data: created, error: createdError } = await supabase
        .from("sessions")
        .select("id,title,activity_type,location_name,scheduled_at,current_participants,organizer_id")
        .eq("organizer_id", user.id)
        .order("scheduled_at", { ascending: false });
      if (createdError) throw createdError;

      const { data: joinedRows, error: joinedRowsError } = await supabase
        .from("session_participants")
        .select("session_id,confirmed_by_creator,confirmed_by_gps,validation_status")
        .eq("user_id", user.id);
      if (joinedRowsError) throw joinedRowsError;

      const joinedSessionIds = (joinedRows || []).map((row) => row.session_id);

      let joinedData: UserSession[] = [];
      if (joinedSessionIds.length) {
        const { data: joined, error: joinedError } = await supabase
          .from("sessions")
          .select("id,title,activity_type,location_name,scheduled_at,current_participants,organizer_id")
          .in("id", joinedSessionIds)
          .neq("organizer_id", user.id)
          .order("scheduled_at", { ascending: false });
        if (joinedError) throw joinedError;
        joinedData = (joined || []) as UserSession[];
      }

      const participantStatusMap: Record<string, ParticipantStatus> = {};
      (joinedRows || []).forEach((row) => {
        participantStatusMap[row.session_id] = {
          confirmed_by_creator: row.confirmed_by_creator,
          confirmed_by_gps: row.confirmed_by_gps,
          validation_status: row.validation_status,
        };
      });

      const pastCreatedIds = (created || [])
        .filter((session) => new Date(session.scheduled_at).getTime() < Date.now())
        .map((session) => session.id);

      let pendingSet = new Set<string>();
      if (pastCreatedIds.length) {
        const { data: creatorPendingRows, error: pendingError } = await supabase
          .from("session_participants")
          .select("session_id,confirmed_by_creator,user_id")
          .in("session_id", pastCreatedIds)
          .neq("user_id", user.id)
          .is("confirmed_by_creator", null);
        if (pendingError) throw pendingError;
        pendingSet = new Set((creatorPendingRows || []).map((row) => row.session_id));
      }

      setCreatedSessions((created || []) as UserSession[]);
      setJoinedSessions(joinedData);
      setJoinedStatusBySession(participantStatusMap);
      setCreatedPendingSet(pendingSet);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos séances.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (!user) return;
    void loadSessions();
  }, [user, loadSessions]);

  const needsConfirmation = useCallback((session: UserSession, source: SessionSource) => {
    const isPast = new Date(session.scheduled_at).getTime() < Date.now();
    if (!isPast) return false;

    if (source === "created") {
      return createdPendingSet.has(session.id);
    }

    const status = joinedStatusBySession[session.id];
    if (!status) return true;
    return !(
      status.confirmed_by_creator === true ||
      status.confirmed_by_gps === true ||
      status.validation_status === "validated"
    );
  }, [createdPendingSet, joinedStatusBySession]);

  const getBadge = (session: UserSession, source: SessionSource) => {
    const isPast = new Date(session.scheduled_at).getTime() < Date.now();
    const shouldConfirm = needsConfirmation(session, source);

    if (shouldConfirm) {
      return {
        label: "À confirmer",
        className: "bg-orange-500 text-white border-0 text-xs",
      };
    }
    if (isPast) {
      return {
        label: "Terminée",
        className: "bg-muted text-muted-foreground border-0 text-xs",
      };
    }
    return {
      label: "À venir",
      className: "bg-primary text-primary-foreground border-0 text-xs",
    };
  };

  const toConfirmSessions = useMemo(() => {
    const fromCreated = createdSessions
      .filter((session) => needsConfirmation(session, "created"))
      .map((session) => ({ ...session, source: "created" as const }));

    const fromJoined = joinedSessions
      .filter((session) => needsConfirmation(session, "joined"))
      .map((session) => ({ ...session, source: "joined" as const }));

    return [...fromCreated, ...fromJoined].sort(
      (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
    );
  }, [createdSessions, joinedSessions, needsConfirmation]);

  const activeSessions =
    tab === "created"
      ? createdSessions.map((session) => ({ ...session, source: "created" as const }))
      : tab === "joined"
        ? joinedSessions.map((session) => ({ ...session, source: "joined" as const }))
        : toConfirmSessions;

  const handleConfirm = (sessionId: string, source: SessionSource) => {
    navigate(`/my-sessions/confirm/${sessionId}?source=${source}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary">
      <div className="z-50 shrink-0 border-b border-border bg-card pt-[var(--safe-area-top)]">
        <div className="relative flex items-center justify-center px-ios-4 py-ios-3">
          <h1 className="text-ios-title1 font-bold text-center">Mes séances</h1>
        </div>

        <div className="px-ios-4 pb-ios-3">
          <div className="rounded-ios-lg bg-secondary p-ios-1">
            <div className="w-full rounded-ios-sm bg-card py-ios-2 text-center text-ios-footnote font-semibold">
              Programmées
            </div>
            <div className="mt-ios-1 flex gap-ios-1">
              {[
                { key: "created", label: "Créées" },
                { key: "joined", label: "Rejointes" },
                { key: "to-confirm", label: "À confirmer" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key as SessionTab)}
                  className={`flex-1 rounded-ios-sm py-1.5 text-[12px] font-semibold transition-colors ${
                    tab === item.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="ios-scroll-region min-h-0 flex-1 overflow-y-auto px-ios-4 pb-ios-6 pt-ios-2">
        {loading ? (
          <div className="space-y-ios-2">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-24 animate-pulse rounded-ios-lg bg-card" />
            ))}
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="ios-card mt-ios-4 p-6 text-center">
            <p className="text-ios-subheadline text-muted-foreground">
              {tab === "to-confirm"
                ? "Aucune séance à confirmer."
                : tab === "created"
                  ? "Aucune séance créée."
                  : "Aucune séance rejointe."}
            </p>
          </div>
        ) : (
          <div className="ios-list-stack space-y-ios-2">
            {activeSessions.map((session) => {
              const badge = getBadge(session, session.source);
              return (
                <SessionCard
                  key={`${session.source}-${session.id}`}
                  session={session}
                  source={session.source}
                  badgeLabel={badge.label}
                  badgeClassName={badge.className}
                  showConfirmAction={needsConfirmation(session, session.source)}
                  onConfirm={handleConfirm}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
