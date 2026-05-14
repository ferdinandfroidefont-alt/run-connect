import { useEffect, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronRight,
  MapPin,
  Plus,
  Settings,
  Share,
} from "lucide-react";
import { format } from "date-fns";
import { fr as frLocale } from "date-fns/locale";
import { ProfileRecordsDisplay } from "@/components/profile/ProfileRecordsDisplay";

const ACTION_BLUE = "#007AFF";
const BG_MAQUETTE = "#F2F2F7";

export type ProfileMaquetteStoryHighlight = {
  id: string;
  story_id: string;
  title: string;
};

export type ProfileMaquetteNextSession = {
  id: string;
  title: string;
  scheduled_at: string;
  activity_type: string;
  location_name: string | null;
  current_participants: number | null;
};

export type ProfileMaquetteParticipantChip = {
  label: string;
  bg: string;
};

type ProfileLike = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  country?: string | null;
  is_premium: boolean;
};

function subtitleLine(profile: ProfileLike): string {
  const parts: string[] = [`@${profile.username}`];
  if (profile.country) parts.push(profile.country);
  if (profile.is_premium) parts.push("Premium");
  return parts.join(" · ");
}

function mondayBasedIndex(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
}

function formatKmFr(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return "0";
  const s = km >= 100 ? km.toFixed(0) : km >= 10 ? km.toFixed(1) : km.toFixed(1);
  return s.replace(".", ",");
}

function formatWeekDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "—";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h <= 0) return `${m}min`;
  if (m <= 0) return `${h}h`;
  return `${h}h${m}`;
}

function activityEmoji(activityType: string): string {
  const t = (activityType || "").toLowerCase();
  if (t.includes("velo") || t.includes("bike") || t.includes("cycl")) return "🚴";
  if (t.includes("nat") || t.includes("swim")) return "🏊";
  if (t.includes("trail") || t.includes("walk") || t.includes("marche")) return "🚶";
  if (t.includes("tri")) return "🔱";
  return "🏃";
}

export function ProfileSelfMaquetteLayout(props: {
  profile: ProfileLike;
  avatarPreview: string;
  getInitials: (fullName: string | null | undefined, username: string | null | undefined) => string;
  navigate: NavigateFunction;

  followerCount: number;
  followingCount: number;
  sessionsJoinedCount: number;
  formatCompactCount: (n: number) => string;
  openFollowDialog: (type: "followers" | "following") => void;

  onShareProfile: () => void;
  onOpenSettings: () => void;

  nextSession: ProfileMaquetteNextSession | null;
  friendCountPreview: ProfileMaquetteParticipantChip[];
  onOpenNextSessionDetail: () => void;
  onGoToNextSession: () => void;

  weekKm: number;
  weekSessionsCount: number;
  weekMinutes: number | null;
  weekBarLevels: number[];
  referenceDate: Date;
  onWeekVoirTout: () => void;

  storyHighlights: ProfileMaquetteStoryHighlight[];
  highlightPreviewByStoryId: Record<string, string>;
  onOpenHighlight: (storyId: string) => void;

  reliabilityRate: number;
  totalSessionsJoined: number;
  totalSessionsCompleted: number;
  /** Ouvre le détail fiabilité (maquette plein écran), comme dans la maquette RunConnect */
  onOpenReliabilityDetail: () => void;

  userIdForRecords: string;
  legacyRecords: {
    running_records?: unknown;
    cycling_records?: unknown;
    swimming_records?: unknown;
    triathlon_records?: unknown;
    walking_records?: unknown;
  };

}) {
  const {
    profile,
    avatarPreview,
    getInitials,
    navigate,
    followerCount,
    followingCount,
    sessionsJoinedCount,
    formatCompactCount,
    openFollowDialog,
    onShareProfile,
    onOpenSettings,
    nextSession,
    friendCountPreview,
    onOpenNextSessionDetail,
    onGoToNextSession,
    weekKm,
    weekSessionsCount,
    weekMinutes,
    weekBarLevels,
    referenceDate,
    onWeekVoirTout,
    storyHighlights,
    highlightPreviewByStoryId,
    onOpenHighlight,
    reliabilityRate,
    totalSessionsJoined,
    totalSessionsCompleted,
    onOpenReliabilityDetail,
    userIdForRecords,
    legacyRecords,
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 4);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const todayIdx = mondayBasedIndex(referenceDate);
  const dayLetters = ["L", "M", "M", "J", "V", "S", "D"];

  const subtitle = subtitleLine(profile);
  const truncatedSubtitle =
    subtitle.length > 36 ? `${subtitle.slice(0, 33)}…` : subtitle;

  const scheduledLabel =
    nextSession &&
    format(new Date(nextSession.scheduled_at), "EEEE · HH:mm", { locale: frLocale });

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="ios-scroll-region relative min-h-0 flex-1 overflow-y-auto"
        style={{
          background: BG_MAQUETTE,
          overscrollBehaviorY: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          className="sticky top-0 z-50 transition-all duration-200 ease-out"
          style={{
            background: scrolled ? "rgba(242, 242, 247, 0.72)" : BG_MAQUETTE,
            backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
            WebkitBackdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
            borderBottom: scrolled ? "0.5px solid rgba(0, 0, 0, 0.08)" : "0.5px solid transparent",
            paddingTop: "env(safe-area-inset-top, 0px)",
          }}
        >
          <div className="px-5 pb-3 pt-4">
            <div className="flex items-center justify-between gap-3">
              <h1
                className="min-w-0 truncate text-[#0A0F1F]"
                style={{
                  fontSize: 52,
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                }}
              >
                Profil
              </h1>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={onShareProfile}
                  className="flex h-9 w-9 items-center justify-center active:opacity-70"
                  aria-label="Partager le profil"
                >
                  <Share className="h-[22px] w-[22px]" color={ACTION_BLUE} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="flex h-9 w-9 items-center justify-center active:opacity-70"
                  aria-label="Paramètres"
                >
                  <Settings className="h-6 w-6" color={ACTION_BLUE} strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="px-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-3">
          <button
            type="button"
            onClick={() => navigate("/profile/edit")}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:bg-[#F8F8F8]"
          >
            <Avatar className="h-14 w-14 shrink-0 rounded-full">
              <AvatarImage src={avatarPreview || profile.avatar_url || ""} className="object-cover" />
              <AvatarFallback
                className="text-[20px] font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                }}
              >
                {getInitials(profile.display_name, profile.username)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold text-[#0A0F1F]">
                {profile.display_name || profile.username}
              </p>
              <p className="truncate text-[13px] text-[#8E8E93]">{truncatedSubtitle}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
          </button>

          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
            {[
              {
                v: formatCompactCount(sessionsJoinedCount),
                l: "Séances",
                onClick: () => navigate("/profile/sessions"),
              },
              {
                v: formatCompactCount(followerCount),
                l: "Abonnés",
                onClick: () => openFollowDialog("followers"),
              },
              {
                v: formatCompactCount(followingCount),
                l: "Suivis",
                onClick: () => openFollowDialog("following"),
              },
            ].map((s) => (
              <button
                key={s.l}
                type="button"
                onClick={s.onClick}
                className="rounded-2xl bg-white py-3 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-[0.98]"
              >
                <p className="text-[22px] font-bold leading-none text-[#0A0F1F]">{s.v}</p>
                <p className="mt-1 text-[12px] text-[#8E8E93]">{s.l}</p>
              </button>
            ))}
          </div>

          {/* Prochaine séance */}
          <div
            role={nextSession ? "button" : undefined}
            tabIndex={nextSession ? 0 : undefined}
            onClick={() => nextSession && onOpenNextSessionDetail()}
            onKeyDown={(e) => {
              if (nextSession && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onOpenNextSessionDetail();
              }
            }}
            className={`relative mt-3 w-full overflow-hidden rounded-2xl bg-white text-left ${
              nextSession ? "cursor-pointer active:bg-[#F8F8F8]" : ""
            }`}
            style={{
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
            }}
          >
            <div
              className="absolute bottom-0 left-0 top-0 w-1"
              style={{ background: nextSession ? ACTION_BLUE : "#C7C7CC" }}
              aria-hidden
            />
            <div className="p-4 pl-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14 }}>{activityEmoji(nextSession?.activity_type || "")}</span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 800,
                      color: ACTION_BLUE,
                      letterSpacing: "0.12em",
                    }}
                  >
                    PROCHAINE SÉANCE
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#C7C7CC]" />
              </div>

              {nextSession ? (
                <>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 24,
                      fontWeight: 900,
                      color: "#0A0F1F",
                      letterSpacing: "-0.03em",
                      lineHeight: 1.15,
                    }}
                  >
                    {scheduledLabel}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      marginTop: 4,
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#0A0F1F",
                    }}
                  >
                    {nextSession.title}
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    <MapPin className="h-4 w-4 shrink-0 text-[#8E8E93]" strokeWidth={2.2} />
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13.5,
                        color: "#8E8E93",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {nextSession.location_name?.trim() || "Lieu à préciser"}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex min-w-0 flex-1 items-center">
                      <div className="flex shrink-0">
                        {friendCountPreview.map((p, i) => (
                          <div
                            key={`${p.label}-${i}`}
                            className="flex items-center justify-center rounded-full border-2 border-white font-extrabold text-white"
                            style={{
                              width: 30,
                              height: 30,
                              background: p.bg,
                              fontSize: 12,
                              marginLeft: i === 0 ? 0 : -10,
                              zIndex: 3 - i,
                            }}
                          >
                            {p.label}
                          </div>
                        ))}
                      </div>
                      {(nextSession.current_participants ?? 0) > 1 ? (
                        <p
                          style={{
                            margin: 0,
                            marginLeft: 8,
                            fontSize: 13,
                            color: "#8E8E93",
                            fontWeight: 600,
                          }}
                          className="truncate"
                        >
                          {`${Math.max((nextSession.current_participants ?? 1) - 1, 0)} participant(s)`}
                        </p>
                      ) : (
                        <p
                          style={{
                            margin: 0,
                            marginLeft: 8,
                            fontSize: 13,
                            color: "#8E8E93",
                            fontWeight: 600,
                          }}
                        >
                          Rejoins la séance
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGoToNextSession();
                      }}
                      className="ml-2 shrink-0 transition-transform active:scale-[0.97]"
                      style={{
                        background: ACTION_BLUE,
                        color: "white",
                        borderRadius: 9999,
                        padding: "9px 16px",
                        fontSize: 13.5,
                        fontWeight: 800,
                        letterSpacing: "-0.01em",
                        boxShadow: "0 2px 6px rgba(0,122,255,0.25)",
                      }}
                    >
                      Y aller
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-[15px] font-semibold leading-snug text-[#8E8E93]">
                  Aucune séance à venir. Planifie une sortie depuis l’accueil ou rejoins une séance découverte.
                </p>
              )}
            </div>
          </div>

          {/* Ma semaine */}
          <div
            className="mt-3 rounded-2xl bg-white p-4"
            style={{
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#8E8E93",
                  letterSpacing: "0.12em",
                }}
              >
                MA SEMAINE
              </p>
              <button type="button" onClick={onWeekVoirTout}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: ACTION_BLUE,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Voir tout
                </span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: formatKmFr(weekKm), l: "km" },
                { v: `${weekSessionsCount}`, l: "séances" },
                {
                  v: weekMinutes != null ? formatWeekDuration(weekMinutes) : "—",
                  l: "temps",
                },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <p
                    style={{
                      margin: 0,
                      fontSize: 26,
                      fontWeight: 900,
                      color: "#0A0F1F",
                      letterSpacing: "-0.02em",
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1,
                    }}
                  >
                    {s.v}
                  </p>
                  <p
                    style={{
                      margin: "5px 0 0",
                      fontSize: 12,
                      color: "#8E8E93",
                      fontWeight: 600,
                    }}
                  >
                    {s.l}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-end justify-between gap-1.5">
              {weekBarLevels.map((h, i) => {
                const today = i === todayIdx;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex h-10 w-full items-end justify-center">
                      {h > 0 ? (
                        <div
                          className="w-full"
                          style={{
                            height: `${h * 100}%`,
                            background: today
                              ? `linear-gradient(180deg, ${ACTION_BLUE}, #0064D6)`
                              : `linear-gradient(180deg, ${ACTION_BLUE}CC, ${ACTION_BLUE})`,
                            borderTopLeftRadius: 4,
                            borderTopRightRadius: 4,
                            borderBottomLeftRadius: 2,
                            borderBottomRightRadius: 2,
                          }}
                        />
                      ) : (
                        <div
                          className="w-full bg-[#E5E5EA]"
                          style={{ height: 3, borderRadius: 9999 }}
                        />
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: today ? ACTION_BLUE : "#8E8E93",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {dayLetters[i]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-3 mt-6 flex items-center justify-between">
            <h2 className="text-[22px] font-bold text-[#0A0F1F]">Stories à la une</h2>
            <button
              type="button"
              className="text-[15px] font-semibold"
              style={{ color: ACTION_BLUE }}
              onClick={() => navigate("/stories/create")}
            >
              Voir tout
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1">
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => navigate("/stories/create")}
                className="flex h-32 w-24 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D1D1D6] active:opacity-80"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-2xl font-light text-white"
                  style={{ background: ACTION_BLUE }}
                >
                  +
                </div>
                <p className="mt-1 text-[13px] font-semibold" style={{ color: ACTION_BLUE }}>
                  Nouvelle
                </p>
              </button>
            </div>

            {storyHighlights.slice(0, 8).map((story) => (
              <div key={story.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenHighlight(story.story_id)}
                  className="relative h-32 w-24 overflow-hidden rounded-xl border border-[#E5E5EA] bg-muted text-left"
                >
                  {highlightPreviewByStoryId[story.story_id] ? (
                    <img
                      src={highlightPreviewByStoryId[story.story_id]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#007AFF]/20 to-[#007AFF]/5" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-3">
                    <p className="truncate text-[14px] font-semibold text-white">
                      {story.title?.trim() || "À la une"}
                    </p>
                  </div>
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/stories/create")}
              className="rounded-2xl bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-red-500 text-lg">
                📸
              </div>
              <p className="mt-2 text-[15px] font-bold text-[#0A0F1F]">Créer une story</p>
              <p className="text-[12px] text-[#8E8E93]">Partage ta sortie</p>
            </button>
            <button
              type="button"
              onClick={() => navigate("/profile/records")}
              className="rounded-2xl bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-[0.98]"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                style={{ background: ACTION_BLUE }}
              >
                🏅
              </div>
              <p className="mt-2 text-[15px] font-bold text-[#0A0F1F]">Nouveau record</p>
              <p className="text-[12px] text-[#8E8E93]">Bats ton PR</p>
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenReliabilityDetail}
            className="mt-2.5 flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:bg-[#F8F8F8]"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] text-[12px] font-bold"
              style={{
                borderColor: ACTION_BLUE,
                color: ACTION_BLUE,
              }}
            >
              {Math.round(Math.max(0, Math.min(100, reliabilityRate)))}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[16px] font-bold text-[#0A0F1F]">Mes séances</p>
              <p className="text-[12px] text-[#8E8E93]">
                {totalSessionsCompleted}/{totalSessionsJoined} confirmées · Fiabilité{" "}
                {Math.round(Math.max(0, Math.min(100, reliabilityRate)))}%
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
          </button>

          <div className="mb-3 mt-7 flex items-center justify-between">
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
                color: "#0A0F1F",
                letterSpacing: "-0.02em",
              }}
            >
              Mes records
            </h2>
            <button
              type="button"
              onClick={() => navigate("/profile/records")}
              className="flex items-center gap-1 transition-transform active:scale-[0.96]"
            >
              <Plus className="h-4 w-4" color={ACTION_BLUE} strokeWidth={2.6} />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: ACTION_BLUE,
                  letterSpacing: "-0.01em",
                }}
              >
                Ajouter
              </span>
            </button>
          </div>

          <ProfileRecordsDisplay
            presentation="maquette"
            userId={userIdForRecords}
            legacy={{
              ...legacyRecords,
            }}
          />
        </main>
      </div>
    </div>
  );
}
