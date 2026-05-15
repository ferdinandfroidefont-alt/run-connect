import { Fragment, useEffect, useId, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Check,
  ChevronRight,
  MapPin,
  Plus,
  Settings,
  Share,
  Star,
} from "lucide-react";
import { format } from "date-fns";
import { fr as frLocale } from "date-fns/locale";
import { ProfileRecordsDisplay } from "@/components/profile/ProfileRecordsDisplay";
import { splitCountryLabel } from "@/lib/countryLabels";
import {
  PROFILE_SPORT_LABELS,
  parseProfileSports,
  type ProfileSportKey,
} from "@/lib/profileSports";

const ACTION_BLUE = "#007AFF";
const BG_MAQUETTE = "#F2F2F7";

const HIGHLIGHT_RING_GRADIENTS = [
  "linear-gradient(135deg, #FF9500, #FF3B30)",
  "linear-gradient(135deg, #34C759, #5AC8FA)",
  "linear-gradient(135deg, #AF52DE, #5856D6)",
  "linear-gradient(135deg, #FF2D55, #FF9500)",
  "linear-gradient(135deg, #007AFF, #5AC8FA)",
  "linear-gradient(135deg, #5856D6, #007AFF)",
] as const;

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
  favorite_sport?: string | null;
};

function primarySportMeta(favoriteSport: string | null | undefined): {
  emoji: string;
  label: string;
} | null {
  const keys = parseProfileSports(favoriteSport);
  const first = keys[0] as ProfileSportKey | undefined;
  if (!first || !(first in PROFILE_SPORT_LABELS)) return null;
  return PROFILE_SPORT_LABELS[first];
}

function activityEmoji(activityType: string): string {
  const t = (activityType || "").toLowerCase();
  if (t.includes("velo") || t.includes("bike") || t.includes("cycl")) return "🚴";
  if (t.includes("nat") || t.includes("swim")) return "🏊";
  if (t.includes("trail") || t.includes("walk") || t.includes("marche")) return "🚶";
  if (t.includes("tri")) return "🔱";
  return "🏃";
}

function ProfileHeroSelf({
  profile,
  avatarPreview,
  getInitials,
  avatarGradient,
  badgeColor,
  locationLabel,
  sportMeta,
  statsFormatted,
  onOpenSeances,
  onOpenAbonnes,
  onOpenSuivis,
  onEditProfile,
  onShareSecondary,
}: {
  profile: ProfileLike;
  avatarPreview: string;
  getInitials: (fullName: string | null | undefined, username: string | null | undefined) => string;
  avatarGradient: string;
  badgeColor: string;
  locationLabel: string | undefined;
  sportMeta: { emoji: string; label: string } | null;
  statsFormatted: { seances: string; abonnes: string; suivis: string };
  onOpenSeances: () => void;
  onOpenAbonnes: () => void;
  onOpenSuivis: () => void;
  onEditProfile: () => void;
  onShareSecondary: () => void;
}) {
  const avatarSrc = (avatarPreview || profile.avatar_url || "").trim();
  const showPhoto = /^https?:\/\//i.test(avatarSrc);

  return (
    <div
      className="overflow-hidden rounded-2xl bg-white"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${badgeColor}0F 0%, #FFFFFF 55%)`,
          padding: "18px 18px 16px 18px",
        }}
      >
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div
              className="flex items-center justify-center overflow-hidden"
              style={{
                width: 78,
                height: 78,
                borderRadius: "50%",
                background: showPhoto ? "#fff" : avatarGradient,
                color: "white",
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                boxShadow: `0 6px 18px ${badgeColor}40`,
                border: "3px solid white",
              }}
            >
              {showPhoto ? (
                <Avatar className="h-full w-full rounded-none">
                  <AvatarImage src={avatarSrc} className="object-cover" alt="" />
                  <AvatarFallback
                    className="rounded-none text-[26px] font-black text-white"
                    style={{ background: avatarGradient }}
                  >
                    {getInitials(profile.display_name, profile.username)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                getInitials(profile.display_name, profile.username)
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <p
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: "#0A0F1F",
                letterSpacing: "-0.03em",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {profile.display_name || profile.username}
            </p>
            <p
              className="truncate"
              style={{
                fontSize: 13.5,
                color: "#8E8E93",
                margin: 0,
                marginTop: 2,
                fontWeight: 600,
              }}
            >
              @{profile.username}
            </p>

            {(locationLabel || profile.age != null || sportMeta) && (
              <div className="mt-2 flex flex-wrap items-center" style={{ gap: "2px 6px" }}>
                {locationLabel ? (
                  <>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" color="#8E8E93" strokeWidth={2.4} />
                      <span style={{ fontSize: 12.5, color: "#8E8E93", fontWeight: 600 }}>{locationLabel}</span>
                    </div>
                    {profile.age != null ? (
                      <span style={{ color: "#C7C7CC", fontSize: 12 }}>·</span>
                    ) : null}
                  </>
                ) : null}
                {profile.age != null && profile.age > 0 ? (
                  <span style={{ fontSize: 12.5, color: "#8E8E93", fontWeight: 600 }}>{profile.age} ans</span>
                ) : null}
                {(locationLabel || (profile.age != null && profile.age > 0)) && sportMeta ? (
                  <span style={{ color: "#C7C7CC", fontSize: 12 }}>·</span>
                ) : null}
                {sportMeta ? (
                  <div className="flex items-center gap-1">
                    <span style={{ fontSize: 13 }}>{sportMeta.emoji}</span>
                    <span style={{ fontSize: 12.5, color: "#8E8E93", fontWeight: 600 }}>{sportMeta.label}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-stretch">
          {[
            { v: statsFormatted.seances, l: "Séances", action: onOpenSeances },
            { v: statsFormatted.abonnes, l: "Abonnés", action: onOpenAbonnes },
            { v: statsFormatted.suivis, l: "Suivis", action: onOpenSuivis },
          ].map((s, i) => (
            <Fragment key={s.l}>
              {i > 0 ? (
                <div style={{ width: 1, background: "#E5E5EA", marginTop: 8, marginBottom: 8 }} />
              ) : null}
              <button
                type="button"
                onClick={s.action}
                className="flex-1 rounded-lg py-1.5 text-center transition-colors active:bg-[#F2F2F7]"
              >
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "#0A0F1F",
                    letterSpacing: "-0.02em",
                    margin: 0,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.v}
                </p>
                <p
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: "#8E8E93",
                    marginTop: 5,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {s.l}
                </p>
              </button>
            </Fragment>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 14px 14px 14px", borderTop: "1px solid #F2F2F7", background: "white" }}>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEditProfile}
            className="flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 transition-transform active:scale-[0.98]"
            style={{
              background: ACTION_BLUE,
              color: "white",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              boxShadow: "0 3px 10px rgba(0,122,255,0.28)",
            }}
          >
            <span style={{ fontSize: 14 }} aria-hidden>
              ✏️
            </span>
            Modifier le profil
          </button>
          <button
            type="button"
            onClick={onShareSecondary}
            className="flex items-center justify-center rounded-full px-4 py-2.5 transition-transform active:scale-[0.96]"
            style={{ background: "#F2F2F7" }}
            aria-label="Partager le profil"
          >
            <Share className="h-[18px] w-[18px]" color="#0A0F1F" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
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

  storyHighlights: ProfileMaquetteStoryHighlight[];
  highlightPreviewByStoryId: Record<string, string>;
  onOpenHighlight: (storyId: string) => void;

  reliabilityRate: number;
  totalSessionsJoined: number;
  totalSessionsCompleted: number;
  totalSessionsAbsent: number;
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
    storyHighlights,
    highlightPreviewByStoryId,
    onOpenHighlight,
    reliabilityRate,
    totalSessionsJoined,
    totalSessionsCompleted,
    totalSessionsAbsent,
    onOpenReliabilityDetail,
    userIdForRecords,
    legacyRecords,
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const reliabilityGradId = useId().replace(/:/g, "");

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 4);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const countryParts = splitCountryLabel(profile.country);
  const locationLabel = countryParts?.name?.trim() || undefined;
  const sportMeta = primarySportMeta(profile.favorite_sport);

  const scheduledLabel = nextSession
    ? format(new Date(nextSession.scheduled_at), "EEEE · HH:mm", { locale: frLocale })
    : "";

  const rateRounded = Math.round(Math.max(0, Math.min(100, reliabilityRate)));
  const reliabilityTitle =
    rateRounded >= 90 ? "Fiabilité au top" : rateRounded >= 70 ? "Bonne fiabilité" : "Fiabilité à améliorer";
  const ringR = 36;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC * (1 - rateRounded / 100);

  const participantCaption = (() => {
    const friends = friendCountPreview.length;
    const participants = nextSession?.current_participants ?? 0;
    if (friends >= 2) return `${friends} amis y vont`;
    if (friends === 1 && participants > 1) return `1 ami y va`;
    if (participants > 1) return `${Math.max(participants - 1, 0)} participant(s)`;
    return "Rejoins la séance";
  })();

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
          <ProfileHeroSelf
            profile={profile}
            avatarPreview={avatarPreview}
            getInitials={getInitials}
            avatarGradient="linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)"
            badgeColor={ACTION_BLUE}
            locationLabel={locationLabel}
            sportMeta={sportMeta}
            statsFormatted={{
              seances: formatCompactCount(sessionsJoinedCount),
              abonnes: formatCompactCount(followerCount),
              suivis: formatCompactCount(followingCount),
            }}
            onOpenSeances={() => navigate("/profile/sessions")}
            onOpenAbonnes={() => openFollowDialog("followers")}
            onOpenSuivis={() => openFollowDialog("following")}
            onEditProfile={() => navigate("/profile/edit")}
            onShareSecondary={onShareProfile}
          />

          {nextSession ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => onOpenNextSessionDetail()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenNextSessionDetail();
                }
              }}
              className="relative mt-3 w-full cursor-pointer overflow-hidden rounded-2xl bg-white text-left active:bg-[#F8F8F8]"
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
              }}
            >
              <div
                className="absolute bottom-0 left-0 top-0"
                style={{ width: 4, background: ACTION_BLUE }}
                aria-hidden
              />
              <div className="p-4 pl-5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 14 }}>{activityEmoji(nextSession.activity_type || "")}</span>
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
                      {participantCaption}
                    </p>
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
                    Ouvrir
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Stories à la une — anneaux type maquette */}
          <div className="mt-4 -mx-5">
            <div className="mb-3 flex items-center justify-between px-5">
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#0A0F1F",
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                Stories à la une
              </h2>
              <button type="button" onClick={() => navigate("/stories/create")}>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: ACTION_BLUE,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Voir tout
                </span>
              </button>
            </div>
            <div
              className="flex gap-3.5 overflow-x-auto px-5 pb-1"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <button
                type="button"
                onClick={() => navigate("/stories/create")}
                className="flex shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-[0.96]"
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "#F2F2F7",
                    border: "2px dashed #C7C7CC",
                  }}
                >
                  <div
                    className="flex items-center justify-center text-white"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: ACTION_BLUE,
                      fontSize: 22,
                      fontWeight: 300,
                      lineHeight: 1,
                      boxShadow: "0 3px 10px rgba(0,122,255,0.35)",
                    }}
                  >
                    +
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: ACTION_BLUE,
                    letterSpacing: "-0.01em",
                    maxWidth: 72,
                  }}
                >
                  Créer
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate("/feed")}
                className="flex shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-[0.96]"
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "#F2F2F7",
                    border: "2px dashed #C7C7CC",
                  }}
                >
                  <div
                    className="flex items-center justify-center text-white"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "#FF9500",
                      boxShadow: "0 3px 10px rgba(255,149,0,0.4)",
                    }}
                  >
                    <Star className="h-[18px] w-[18px]" color="white" strokeWidth={2.6} fill="white" />
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#FF9500",
                    letterSpacing: "-0.01em",
                    maxWidth: 72,
                  }}
                >
                  À la une
                </p>
              </button>

              {storyHighlights.slice(0, 8).map((story, idx) => {
                const preview = highlightPreviewByStoryId[story.story_id];
                const gradient = HIGHLIGHT_RING_GRADIENTS[idx % HIGHLIGHT_RING_GRADIENTS.length];
                const letter = (story.title?.trim()?.[0] || profile.username?.[0] || "S").toUpperCase();
                return (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => onOpenHighlight(story.story_id)}
                    className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-[0.96]"
                  >
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: gradient,
                        padding: 2.5,
                      }}
                    >
                      <div
                        className="relative flex items-center justify-center overflow-hidden text-white"
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          border: "2.5px solid white",
                          fontSize: preview ? 0 : 26,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                          background: gradient,
                        }}
                      >
                        {preview ? (
                          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          letter
                        )}
                      </div>
                    </div>
                    <p
                      className="truncate"
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: "#0A0F1F",
                        letterSpacing: "-0.01em",
                        maxWidth: 72,
                      }}
                    >
                      {story.title?.trim() || "À la une"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mes séances / fiabilité */}
          <button
            type="button"
            onClick={onOpenReliabilityDetail}
            className="mt-5 w-full overflow-hidden rounded-2xl bg-white active:bg-[#F8F8F8]"
            style={{
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
            }}
          >
            <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
              <p
                style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: "#8E8E93",
                  letterSpacing: "0.12em",
                  margin: 0,
                  textTransform: "uppercase",
                }}
              >
                🎯 Mes séances
              </p>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: ACTION_BLUE,
                  letterSpacing: "-0.01em",
                }}
              >
                Voir tout →
              </span>
            </div>

            <div className="flex items-center gap-4 px-4 pb-4 pt-2">
              <div className="relative shrink-0" style={{ width: 86, height: 86 }}>
                <svg width="86" height="86" viewBox="0 0 86 86" aria-hidden>
                  <defs>
                    <linearGradient id={`reliabilityGrad-${reliabilityGradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#5AC8FA" />
                      <stop offset="100%" stopColor={ACTION_BLUE} />
                    </linearGradient>
                  </defs>
                  <circle cx="43" cy="43" r={ringR} fill="none" stroke="#F2F2F7" strokeWidth="8" />
                  <circle
                    cx="43"
                    cy="43"
                    r={ringR}
                    fill="none"
                    stroke={`url(#reliabilityGrad-${reliabilityGradId})`}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${ringC}`}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 43 43)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-baseline justify-center" style={{ paddingTop: 28 }}>
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: "#0A0F1F",
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {rateRounded}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#8E8E93",
                      letterSpacing: "-0.01em",
                      marginLeft: 1,
                    }}
                  >
                    %
                  </span>
                </div>
              </div>

              <div className="min-w-0 flex-1 text-left">
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: "#0A0F1F",
                    letterSpacing: "-0.02em",
                    margin: 0,
                  }}
                >
                  {reliabilityTitle}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "#8E8E93",
                    margin: 0,
                    marginTop: 3,
                    fontWeight: 500,
                  }}
                >
                  {totalSessionsCompleted} confirmée · {totalSessionsAbsent} manquée
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {nextSession ? (
                    <div
                      className="flex items-center gap-1"
                      style={{
                        padding: "3px 8px",
                        background: "#34C75922",
                        color: "#1E8E3E",
                        fontSize: 11,
                        fontWeight: 800,
                        borderRadius: 9999,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                      Séance à venir
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-1"
                      style={{
                        padding: "3px 8px",
                        background: "#E5E5EA",
                        color: "#636366",
                        fontSize: 11,
                        fontWeight: 800,
                        borderRadius: 9999,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Aucune séance planifiée
                    </div>
                  )}
                </div>
              </div>

              <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
            </div>
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
