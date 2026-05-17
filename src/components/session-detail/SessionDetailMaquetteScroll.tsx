import type { ReactNode, RefObject } from "react";
import { CalendarDays, ChevronRight, Image as ImageIcon, MapPin } from "lucide-react";
import { getActivityEmoji, getDiscoverSportTileHex } from "@/lib/discoverSessionVisual";
import { getActivityLabel } from "@/lib/activityIcons";
import {
  getInitials,
  gradientForLetter,
  SessionDetailSectionTitle,
  SessionSchemaChart,
} from "@/components/session-detail/SessionDetailMaquetteParts";
import type { MaquetteChartBlock } from "@/components/session-detail/SessionDetailMaquetteParts";
import { SessionQuestions } from "@/components/SessionQuestions";

type ParticipantPreview = {
  user_id: string;
  profile: { username: string; display_name: string; avatar_url: string | null };
};

export type SessionDetailMaquetteScrollProps = {
  headerMapRef: RefObject<HTMLDivElement | null>;
  headerMapReady: boolean;
  headerMapFailed: boolean;
  headerStaticMapUrl: string | null;
  locationName: string;
  activityType: string;
  title: string;
  subtitle?: string | null;
  organizerName: string;
  organizerIsSelf: boolean;
  onOrganizerClick: () => void;
  participantsCount: number;
  participantPreviews: ParticipantPreview[];
  onParticipantsClick: () => void;
  chartBlocks: MaquetteChartBlock[];
  blockPills: { key: string; label: string; color: string }[];
  actionButtons: ReactNode;
  dateFull: string;
  timeLabel: string;
  onGoogleCalendar: () => void;
  onGoogleMaps: () => void;
  routeMapRef?: RefObject<HTMLDivElement | null>;
  routeSectionRef?: RefObject<HTMLDivElement | null>;
  hasRoute: boolean;
  routeDistanceLabel?: string;
  onRouteExpand?: () => void;
  imageUrl?: string | null;
  sessionId: string;
  organizerId: string;
  scheduledAt: string;
};

export function SessionDetailMaquetteScroll(props: SessionDetailMaquetteScrollProps) {
  const sportColor = getDiscoverSportTileHex(props.activityType);
  const sportEmoji = getActivityEmoji(props.activityType);
  const sportLabel = getActivityLabel(props.activityType);
  const organizerLetters = getInitials(props.organizerName || "?");

  return (
    <div className="flex-1 overflow-y-auto pb-8">
      <div className="relative h-[200px] overflow-hidden">
        {props.headerStaticMapUrl ? (
          <img
            src={props.headerStaticMapUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
        ) : null}
        <div
          ref={props.headerMapRef}
          className="absolute inset-0"
          style={{
            opacity: props.headerMapReady && !props.headerMapFailed ? 1 : 0,
            transition: "opacity 220ms ease",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[60px]"
          style={{ background: "linear-gradient(180deg, rgba(242,242,247,0) 0%, #F2F2F7 100%)" }}
        />
        <div
          className="absolute bottom-3.5 left-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)" }}
        >
          <MapPin className="h-3.5 w-3.5 text-[#FF3B30]" strokeWidth={2.6} />
          <span className="text-[13px] font-extrabold tracking-[-0.01em] text-[#0A0F1F]">
            {props.locationName || "Lieu du rendez-vous"}
          </span>
        </div>
      </div>

      <div className="-mt-2 px-4">
        <div className="rounded-[22px] bg-white p-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.05)]">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px]"
            style={{ background: `${sportColor}15` }}
          >
            <span className="text-[14px]">{sportEmoji}</span>
            <span
              className="text-[11.5px] font-black uppercase tracking-[0.08em]"
              style={{ color: sportColor }}
            >
              {sportLabel}
            </span>
          </div>

          <h1 className="mt-2 text-[26px] font-black leading-[1.1] tracking-[-0.035em] text-[#0A0F1F]">
            {props.title}
          </h1>
          {props.subtitle ? (
            <p className="mt-1 text-[15.5px] font-bold tracking-[-0.02em] text-[#0A0F1F]/75">
              {props.subtitle}
            </p>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E5E5EA] pt-4">
            <button
              type="button"
              onClick={props.onOrganizerClick}
              className="flex min-w-0 items-center gap-2.5 text-left active:opacity-70"
            >
              <div
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-black tracking-[-0.02em] text-white shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
                style={{ background: gradientForLetter(organizerLetters[0] ?? "?") }}
              >
                {organizerLetters}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-extrabold leading-[1.15] tracking-[-0.01em] text-[#0A0F1F]">
                  {props.organizerIsSelf ? `${props.organizerName} (toi)` : props.organizerName}
                </p>
                <p className="mt-0.5 text-[12px] font-bold text-[#007AFF]">Voir le profil ›</p>
              </div>
            </button>

            <button
              type="button"
              onClick={props.onParticipantsClick}
              className="flex shrink-0 items-center gap-2 active:opacity-70"
            >
              <div className="flex -space-x-2">
                {(props.participantPreviews.length > 0
                  ? props.participantPreviews.slice(0, 4)
                  : []
                ).map((p, i) => {
                  const letters = getInitials(
                    p.profile.display_name || p.profile.username || "?",
                  );
                  return (
                    <div
                      key={p.user_id}
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-black tracking-[-0.02em] text-white"
                      style={{
                        background: gradientForLetter(letters[0] ?? "?"),
                        zIndex: 4 - i,
                      }}
                    >
                      {letters}
                    </div>
                  );
                })}
              </div>
              <div>
                <p className="text-[14.5px] font-black tabular-nums leading-[1.15] tracking-[-0.01em] text-[#0A0F1F]">
                  {props.participantsCount}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-[#8E8E93]">participants</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <SessionDetailSectionTitle label="Schéma de séance" />
      <div className="px-4">
        <div className="rounded-[22px] bg-white px-4 py-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.05)]">
          <SessionSchemaChart blocks={props.chartBlocks} />
          {props.blockPills.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {props.blockPills.map((b) => (
                <div
                  key={b.key}
                  className="flex items-center gap-1 rounded-full px-[9px] py-[3px]"
                  style={{ background: `${b.color}15` }}
                >
                  <div className="h-[5px] w-[5px] rounded-full" style={{ background: b.color }} />
                  <span className="text-[12px] font-extrabold tracking-[-0.01em] text-[#0A0F1F]">
                    {b.label}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 px-4">{props.actionButtons}</div>

      <SessionDetailSectionTitle label="Détail séance" />
      <div className="grid grid-cols-2 gap-2 px-4">
        <div className="rounded-[18px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.05)]">
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#FF9500]" strokeWidth={2.6} />
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-[#8E8E93]">
              Date
            </span>
          </div>
          <p className="text-[16px] font-black leading-[1.2] tracking-[-0.02em] text-[#0A0F1F]">
            {props.dateFull}
          </p>
          <p className="mt-0.5 text-[13px] font-bold text-[#8E8E93]">{props.timeLabel}</p>
          <button
            type="button"
            onClick={props.onGoogleCalendar}
            className="mt-3 flex items-center gap-1.5 rounded-full bg-[#4285F415] px-[9px] py-[5px] active:opacity-70"
          >
            <div
              className="h-3.5 w-3.5 rounded-[3px]"
              style={{ background: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)" }}
            />
            <span className="text-[11.5px] font-extrabold tracking-[-0.01em] text-[#4285F4]">
              Google Calendar
            </span>
          </button>
        </div>

        <div className="rounded-[18px] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.05)]">
          <div className="mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#FF3B30]" strokeWidth={2.6} />
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-[#8E8E93]">
              Lieu
            </span>
          </div>
          <p className="text-[16px] font-black leading-[1.2] tracking-[-0.02em] text-[#0A0F1F]">
            {props.locationName || "—"}
          </p>
          <button
            type="button"
            onClick={props.onGoogleMaps}
            className="mt-3 flex items-center gap-1.5 rounded-full bg-[#FF3B3015] px-[9px] py-[5px] active:opacity-70"
          >
            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-[#FF3B30]">
              <MapPin className="h-2.5 w-2.5 text-white" strokeWidth={3} />
            </div>
            <span className="text-[11.5px] font-extrabold tracking-[-0.01em] text-[#FF3B30]">
              Google Maps
            </span>
          </button>
        </div>
      </div>

      {props.hasRoute ? (
        <>
          <SessionDetailSectionTitle label="Itinéraire" />
          <div className="px-4">
            <button
              type="button"
              ref={props.routeSectionRef as RefObject<HTMLButtonElement> | undefined}
              onClick={props.onRouteExpand}
              className="w-full overflow-hidden rounded-[18px] bg-white text-left shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.05)] transition-transform active:scale-[0.99]"
            >
              <div className="relative h-40 bg-secondary">
                <div ref={props.routeMapRef} className="absolute inset-0" />
                {props.routeDistanceLabel ? (
                  <div
                    className="absolute right-3 top-3 rounded-full px-2.5 py-[5px] text-[12px] font-black tracking-[-0.01em] text-[#0A0F1F] shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
                    style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)" }}
                  >
                    {props.routeDistanceLabel}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between border-t border-[#E5E5EA] px-4 py-3">
                <span className="text-[14px] font-bold tracking-[-0.01em] text-[#0A0F1F]">
                  Voir l&apos;itinéraire en grand
                </span>
                <ChevronRight className="h-4 w-4 text-[#C7C7CC]" />
              </div>
            </button>
          </div>
        </>
      ) : null}

      <SessionDetailSectionTitle label="Photos" />
      <div className="px-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {props.imageUrl ? (
            <img
              src={props.imageUrl}
              alt=""
              className="h-24 w-24 shrink-0 rounded-[14px] object-cover shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.05)]"
            />
          ) : (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.05)]"
                style={{
                  background: `linear-gradient(135deg, ${sportColor}22 0%, ${sportColor}11 100%)`,
                }}
              >
                <ImageIcon className="h-7 w-7 opacity-50" style={{ color: sportColor }} strokeWidth={2} />
              </div>
            ))
          )}
        </div>
      </div>

      <SessionDetailSectionTitle label="Commentaires" />
      <div className="px-4 pb-4">
        <SessionQuestions
          sessionId={props.sessionId}
          sessionTitle={props.title}
          organizerId={props.organizerId}
          activityType={props.activityType}
          locationName={props.locationName}
          scheduledAt={props.scheduledAt}
        />
      </div>
    </div>
  );
}
