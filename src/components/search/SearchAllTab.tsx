import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronRight, MapPin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { buildSessionStaticMapUrl } from "@/lib/mapboxStaticImage";
import { ProfileResultRow } from "@/components/search/ProfileResultRow";
import { ClubResultRow } from "@/components/search/ClubResultRow";
import {
  searchProfilesForQuery,
  searchClubsByText,
  searchSessionsForQuery,
  sessionTypeLabelFr,
  type ProfileSearchHit,
  type ClubSearchHit,
  type SessionSearchHit,
} from "@/components/search/searchQueries";

type Row =
  | { kind: "profile"; data: ProfileSearchHit }
  | { kind: "club"; data: ClubSearchHit }
  | { kind: "session"; data: SessionSearchHit };

export function SearchAllTab({ searchQuery }: { searchQuery: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const [profiles, clubs, sessions] = await Promise.all([
        searchProfilesForQuery(supabase, user?.id, q),
        searchClubsByText(supabase, user?.id, q),
        searchSessionsForQuery(supabase, user?.id, q),
      ]);
      const next: Row[] = [
        ...profiles.map((data) => ({ kind: "profile" as const, data })),
        ...clubs.map((data) => ({ kind: "club" as const, data })),
        ...sessions.map((data) => ({ kind: "session" as const, data })),
      ];
      setRows(next);
    } catch (e) {
      console.error("[SearchAllTab]", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, user?.id]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void runSearch();
    }, 320);
    return () => clearTimeout(t);
  }, [runSearch]);

  if (!searchQuery.trim()) {
    return (
      <div className="flex flex-col items-center px-6 pb-12 pt-16 text-center">
        <p className="max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          Recherche des athlètes, clubs et séances publiques à venir. Saisis un mot-clé ci-dessus.
        </p>
      </div>
    );
  }

  if (loading && rows.length === 0) {
    return (
      <div className="divide-y divide-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-9 w-20 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 pb-12 pt-16 text-center">
        <p className="text-[15px] font-semibold text-foreground">Aucun résultat</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Aucune personne, club ou séance ne correspond à « {searchQuery.trim()} ».
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => {
        if (row.kind === "profile") {
          return <ProfileResultRow key={`p-${row.data.user_id}`} profile={row.data} />;
        }
        if (row.kind === "club") {
          return <ClubResultRow key={`c-${row.data.id}`} club={row.data} />;
        }
        return <SessionSearchRow key={`s-${row.data.id}`} session={row.data} navigate={navigate} />;
      })}
    </div>
  );
}

function SessionSearchRow({
  session,
  navigate,
}: {
  session: SessionSearchHit;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const thumb =
    session.image_url ||
    buildSessionStaticMapUrl({
      pin: { lat: session.location_lat, lng: session.location_lng },
      routePath: [],
      width: 112,
      height: 112,
      padding: 0,
    });

  const dateLine = (() => {
    const raw = format(new Date(session.scheduled_at), "EEE d MMM • HH:mm", { locale: fr });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();

  return (
    <button
      type="button"
      onClick={() =>
        navigate(`/?sessionId=${session.id}&lat=${session.location_lat}&lng=${session.location_lng}&zoom=14`)
      }
      className="flex w-full gap-3 px-4 py-3 text-left transition-colors active:bg-muted/40 touch-manipulation"
    >
      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MapPin className="h-7 w-7 text-primary" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-[16px] font-semibold leading-tight text-foreground">{session.title}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{sessionTypeLabelFr(session.session_type)}</p>
        <p className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {dateLine}
        </p>
        <p className="mt-0.5 flex items-start gap-1 text-[13px] text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
          <span className="min-w-0 leading-snug">{session.location_name}</span>
        </p>
      </div>
      <ChevronRight className="mt-6 h-5 w-5 shrink-0 text-muted-foreground/45" aria-hidden />
    </button>
  );
}
