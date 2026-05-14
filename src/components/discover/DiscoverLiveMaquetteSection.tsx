import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { DiscoverSession } from "@/hooks/useDiscoverFeed";
import { DiscoverMapCard } from "@/components/discover/DiscoverMapCard";
import { DiscoverMapMaquetteToolbar } from "@/components/discover/DiscoverMapMaquetteToolbar";

type DiscoverLiveMaquetteSectionProps = {
  liveSessions: DiscoverSession[];
  discoverLoading: boolean;
  mapStyleUrl?: string;
  mapPitch?: number;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenStyleSheet: () => void;
  onOpenFiltersSheet: () => void;
  onOpenSession: (session: DiscoverSession) => void;
  joinSession: (session: DiscoverSession) => void | Promise<void>;
};

/**
 * Onglet « Live » dans Découvrir : même carte Mapbox que l’onglet Carte, filtrée sur les séances en créneau live (backend via useDiscoverFeed).
 */
export function DiscoverLiveMaquetteSection({
  liveSessions,
  discoverLoading,
  mapStyleUrl,
  mapPitch = 0,
  fullscreen,
  onToggleFullscreen,
  onOpenStyleSheet,
  onOpenFiltersSheet,
  onOpenSession,
  joinSession,
}: DiscoverLiveMaquetteSectionProps) {
  const navigate = useNavigate();

  return (
    <>
      <button
        type="button"
        onClick={() => navigate("/discover/live")}
        className="mt-4 w-full touch-manipulation rounded-2xl bg-white py-3.5 text-[16px] font-bold text-[#0A0F1F] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        Voir mes séances live
      </button>

      <div
        className={`relative mt-4 overflow-hidden rounded-2xl ring-1 ring-black/[0.06] transition-all duration-300 ease-out ${
          fullscreen ? "h-[calc(100vh-220px)]" : "h-[260px]"
        }`}
      >
        <DiscoverMapCard
          sessions={liveSessions}
          mapStyleUrl={mapStyleUrl}
          mapPitch={mapPitch}
          onSessionMarkerClick={onOpenSession}
          className="h-full min-h-0"
        />
        {discoverLoading && liveSessions.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : null}
        <DiscoverMapMaquetteToolbar
          fullscreen={fullscreen}
          onToggleFullscreen={onToggleFullscreen}
          onOpenStyleSheet={onOpenStyleSheet}
          onOpenFiltersSheet={onOpenFiltersSheet}
        />
      </div>

      {!fullscreen ? (
        <>
          <h2 className="mb-3 mt-6 text-[22px] font-bold text-[#0A0F1F]">En direct près de toi</h2>

          {discoverLoading && liveSessions.length === 0 ? null : liveSessions.length === 0 ? (
            <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-[15px] leading-snug text-[#0A0F1F]">
                Aucune séance en direct dans ton périmètre pour l’instant. Élargis les filtres ou reviens un peu plus tard.
              </p>
            </div>
          ) : (
            liveSessions.slice(0, 12).map((s) => (
              <div
                key={s.id}
                className="mb-2.5 flex min-w-0 items-center gap-3 rounded-2xl bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left touch-manipulation transition-colors active:opacity-85"
                  onClick={() => onOpenSession(s)}
                >
                  <div className="relative flex-shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FF3B30]/10">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-[#FF3B30]" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-[#0A0F1F]">{s.title}</p>
                    <p className="text-[13px] text-[#8E8E93]">
                      EN COURS · {s.organizer.display_name || s.organizer.username}
                    </p>
                    <p className="mt-1 text-[12px] text-[#8E8E93]">
                      {format(new Date(s.scheduled_at), "HH:mm", { locale: fr })} ·{" "}
                      {typeof s.distance_km === "number" ? `${s.distance_km.toFixed(1)} km` : "—"} ·{" "}
                      {s.current_participants} part.
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  className="flex-shrink-0 touch-manipulation rounded-full bg-[#FF3B30] px-3 py-1.5 text-[13px] font-semibold text-white active:opacity-90"
                  onClick={() => void joinSession(s)}
                >
                  Suivre
                </button>
              </div>
            ))
          )}
        </>
      ) : null}
    </>
  );
}
