import { Fragment } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck, Check, ChevronRight, Lock, MapPin, MessageCircle } from "lucide-react";
import { OnlineStatus } from "@/components/OnlineStatus";
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

export type ProfileOtherMaquettePeriod = "total" | "30d" | "7d";

type ProfileLike = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  bio: string | null;
  is_premium: boolean;
  is_admin?: boolean;
  favorite_sport: string | null;
  country: string | null;
};

function mutualFriendDisplayLabel(p: { display_name: string | null; username: string | null }) {
  return (p.display_name?.trim() || p.username?.trim() || "Membre").trim();
}

function primarySportMeta(favoriteSport: string | null | undefined): {
  emoji: string;
  label: string;
} | null {
  const keys = parseProfileSports(favoriteSport);
  const first = keys[0] as ProfileSportKey | undefined;
  if (!first || !(first in PROFILE_SPORT_LABELS)) return null;
  return PROFILE_SPORT_LABELS[first];
}

export function ProfileOtherMaquetteLayout(props: {
  profile: ProfileLike;
  getInitials: (fullName: string | null | undefined, username: string | null | undefined) => string;
  /** Pastille en ligne (amis) */
  showOnlineOnAvatar: boolean;

  followerCount: number;
  followingCount: number;
  /** Première colonne « Séances » (ex. créées + rejointes) */
  seancesDisplay: string;
  onOpenSeances: () => void;
  openFollowDialog: (type: "followers" | "following") => void;

  isOwnProfile: boolean;
  isFollowing: boolean;
  followRequestSent: boolean;
  actionLoading: boolean;
  onFollowToggle: () => void;
  onMessage: () => void;

  onAvatarClick: () => void;

  storyHighlights: Array<{ id: string; story_id: string; title: string }>;
  highlightPreviewByStoryId: Record<string, string>;
  onOpenHighlight: (storyId: string) => void;

  canViewContent: boolean;

  period: ProfileOtherMaquettePeriod;
  onPeriodChange: (p: ProfileOtherMaquettePeriod) => void;
  statsLoading: boolean;
  stats: { sessionsCreated: number; routesCreated: number; sessionsJoined: number };

  onOpenRecords: () => void;
  onOpenRecentSessions: () => void;

  /** Amis en commun (suivi mutuel avec toi et avec ce profil) — le bloc n’est affiché que si non vide */
  mutualFriends: Array<{ user_id?: string; display_name: string | null; username: string | null }>;
  onMutualFriendsPress?: () => void;
}) {
  const {
    profile,
    getInitials,
    showOnlineOnAvatar,
    followerCount,
    followingCount,
    seancesDisplay,
    onOpenSeances,
    openFollowDialog,
    isOwnProfile,
    isFollowing,
    followRequestSent,
    actionLoading,
    onFollowToggle,
    onMessage,
    onAvatarClick,
    storyHighlights,
    highlightPreviewByStoryId,
    onOpenHighlight,
    canViewContent,
    period,
    onPeriodChange,
    statsLoading,
    stats,
    onOpenRecords,
    onOpenRecentSessions,
    mutualFriends,
    onMutualFriendsPress,
  } = props;

  const avatarSrc = (profile.avatar_url || "").trim();
  const showPhoto = /^https?:\/\//i.test(avatarSrc);
  const badgeColor = ACTION_BLUE;
  const avatarGradient = "linear-gradient(135deg, #5856D6 0%, #AF52DE 100%)";

  const countryParts = splitCountryLabel(profile.country);
  const locationLabel = countryParts?.name?.trim() || undefined;
  const sportMeta = primarySportMeta(profile.favorite_sport);

  const periodTabs: { id: ProfileOtherMaquettePeriod; label: string }[] = [
    { id: "total", label: "Totaux" },
    { id: "30d", label: "30 jours" },
    { id: "7d", label: "7 jours" },
  ];

  const sportStatsRow = [
    { emoji: "🏃", label: "Séances créées", value: stats.sessionsCreated, color: "#007AFF" },
    { emoji: "🗺️", label: "Itinéraires créés", value: stats.routesCreated, color: "#34C759" },
    { emoji: "🤝", label: "Séances rejointes", value: stats.sessionsJoined, color: "#FF9500" },
  ] as const;

  const cardShadow = "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)";
  const insetDivider = <div style={{ height: 0.5, background: "#E5E5EA", marginLeft: 68 }} />;

  const mutualTitlePrimary = (() => {
    const n = mutualFriends.length;
    if (n === 0) return null;
    if (n === 1) {
      return (
        <>
          Suivi(e) par{" "}
          <span style={{ fontWeight: 800 }}>{mutualFriendDisplayLabel(mutualFriends[0])}</span>
        </>
      );
    }
    if (n === 2) {
      return (
        <>
          Suivi(e) par{" "}
          <span style={{ fontWeight: 800 }}>{mutualFriendDisplayLabel(mutualFriends[0])}</span>
          {" "}et{" "}
          <span style={{ fontWeight: 800 }}>{mutualFriendDisplayLabel(mutualFriends[1])}</span>
        </>
      );
    }
    const others = n - 1;
    return (
      <>
        Suivi(e) par{" "}
        <span style={{ fontWeight: 800 }}>{mutualFriendDisplayLabel(mutualFriends[0])}</span>
        {" "}et{" "}
        <span style={{ fontWeight: 800 }}>
          {others} autre{others > 1 ? "s" : ""}
        </span>
      </>
    );
  })();

  return (
    <div
      className="ios-scroll-region relative min-h-0 flex-1 overflow-y-auto"
      style={{
        background: BG_MAQUETTE,
        overscrollBehaviorY: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
        {/* Hero — même structure que maquette JSX (ProfileHero) */}
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
              <button
                type="button"
                className="relative shrink-0 text-left transition-opacity active:opacity-85"
                onClick={onAvatarClick}
                aria-label="Voir la photo de profil"
              >
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
                {showOnlineOnAvatar ? <OnlineStatus userId={profile.user_id} /> : null}
              </button>

              <div className="min-w-0 flex-1 pt-1">
                <div className="flex min-w-0 flex-wrap items-center gap-1">
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
                  {profile.is_admin ? (
                    <BadgeCheck className="h-5 w-5 shrink-0 fill-amber-500 text-white" aria-hidden />
                  ) : profile.is_premium ? (
                    <BadgeCheck className="h-5 w-5 shrink-0 fill-blue-500 text-white" aria-hidden />
                  ) : null}
                </div>
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
                        {profile.age != null && profile.age > 0 ? (
                          <span style={{ color: "#C7C7CC", fontSize: 12 }}>·</span>
                        ) : null}
                      </>
                    ) : null}
                    {profile.age != null && profile.age > 0 ? (
                      <span style={{ fontSize: 12.5, color: "#8E8E93", fontWeight: 600 }}>
                        {profile.age} ans
                      </span>
                    ) : null}
                    {(locationLabel || (profile.age != null && profile.age > 0)) && sportMeta ? (
                      <span style={{ color: "#C7C7CC", fontSize: 12 }}>·</span>
                    ) : null}
                    {sportMeta ? (
                      <div className="flex items-center gap-1">
                        <span style={{ fontSize: 13 }}>{sportMeta.emoji}</span>
                        <span style={{ fontSize: 12.5, color: "#8E8E93", fontWeight: 600 }}>
                          {sportMeta.label}
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-stretch">
              {[
                { v: seancesDisplay, l: "Séances", action: onOpenSeances },
                {
                  v: String(followerCount),
                  l: "Abonnés",
                  action: () => openFollowDialog("followers"),
                },
                {
                  v: String(followingCount),
                  l: "Abonnements",
                  action: () => openFollowDialog("following"),
                },
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

          {!isOwnProfile ? (
            <div
              style={{
                padding: "12px 14px 14px 14px",
                borderTop: "1px solid #F2F2F7",
                background: "white",
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onFollowToggle}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-1.5 rounded-full py-2.5 transition-transform active:scale-[0.98] disabled:opacity-60"
                  style={{
                    background: isFollowing || followRequestSent ? "#F2F2F7" : ACTION_BLUE,
                    color: isFollowing || followRequestSent ? "#0A0F1F" : "white",
                    fontSize: 15,
                    fontWeight: 800,
                    letterSpacing: "-0.01em",
                    boxShadow:
                      isFollowing || followRequestSent ? "none" : "0 3px 10px rgba(0,122,255,0.28)",
                  }}
                >
                  {actionLoading ? (
                    <span className="text-[13px] font-semibold">…</span>
                  ) : (
                    <>
                      {isFollowing && <Check className="h-4 w-4" strokeWidth={3} />}
                      {followRequestSent ? "En attente" : isFollowing ? "Abonné" : "S'abonner"}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onMessage}
                  className="flex items-center justify-center gap-1.5 rounded-full py-2.5 transition-transform active:scale-[0.98]"
                  style={{
                    background: "#F2F2F7",
                    color: "#0A0F1F",
                    fontSize: 15,
                    fontWeight: 800,
                    letterSpacing: "-0.01em",
                  }}
                >
                  <MessageCircle className="h-4 w-4" color="#0A0F1F" strokeWidth={2.4} />
                  Message
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {profile.bio?.trim() ? (
          <div
            className="mt-3 rounded-2xl bg-white px-4 py-3"
            style={{
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
            }}
          >
            <p className="whitespace-pre-wrap break-words text-[14px] font-medium leading-relaxed text-[#0A0F1F]">
              {profile.bio.trim()}
            </p>
          </div>
        ) : null}

        {/* Amis en commun — uniquement s’il y en a */}
        {mutualFriends.length > 0 ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={onMutualFriendsPress}
              className={`flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left ${
                onMutualFriendsPress ? "cursor-pointer active:bg-[#F8F8F8]" : ""
              }`}
              style={{
                boxShadow: cardShadow,
              }}
              disabled={!onMutualFriendsPress}
            >
              <div className="flex shrink-0">
                {mutualFriends.slice(0, 3).map((m, i) => (
                  <div
                    key={m.user_id ?? `mutual-${i}`}
                    className="flex items-center justify-center font-extrabold text-white"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: HIGHLIGHT_RING_GRADIENTS[i % HIGHLIGHT_RING_GRADIENTS.length],
                      fontSize: 12,
                      letterSpacing: "-0.02em",
                      border: "2.5px solid white",
                      marginLeft: i === 0 ? 0 : -10,
                      zIndex: 3 - i,
                    }}
                  >
                    {mutualFriendDisplayLabel(m).slice(0, 1).toUpperCase()}
                  </div>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate"
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0A0F1F",
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  {mutualTitlePrimary}
                </p>
                <p
                  style={{
                    fontSize: 12.5,
                    color: "#8E8E93",
                    margin: 0,
                    marginTop: 1,
                    fontWeight: 500,
                  }}
                >
                  {mutualFriends.length} ami{mutualFriends.length > 1 ? "s" : ""} en commun
                </p>
              </div>
              {onMutualFriendsPress ? (
                <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
              ) : null}
            </button>
          </div>
        ) : null}

        {/* Stories à la une — masqué entièrement s’il n’y en a pas */}
        {storyHighlights.length > 0 ? (
          <div className="mt-4">
            <div className="mb-3 flex items-center justify-between px-1">
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#0A0F1F",
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                Stories à la une
              </h2>
            </div>
            <div
              className="-mx-1 flex gap-3.5 overflow-x-auto px-1 pb-1"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {storyHighlights.map((story, idx) => {
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
        ) : null}

        {!canViewContent && !isOwnProfile ? (
          <div
            className="mt-5 flex flex-col items-center rounded-2xl bg-white px-6 py-8"
            style={{
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2F2F7]">
              <Lock className="h-5 w-5 text-[#8E8E93]" strokeWidth={2.2} aria-hidden />
            </div>
            <p className="mt-3 text-[15px] font-extrabold text-[#0A0F1F]">Profil privé</p>
            <p className="mt-1 text-center text-[13px] font-medium text-[#8E8E93]">
              Suivez cette personne pour voir ses activités
            </p>
          </div>
        ) : null}

        {canViewContent ? (
          <>
            <div className="mt-5 px-0">
              <div className="flex rounded-xl p-1" style={{ background: "#E5E5EA" }}>
                {periodTabs.map((p) => {
                  const active = period === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onPeriodChange(p.id)}
                      className="flex-1 rounded-lg py-2 text-[14px] font-semibold transition-all"
                      style={{
                        background: active ? "white" : "transparent",
                        color: active ? "#0A0F1F" : "#8E8E93",
                        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stats activité + Records + Séances — une seule carte */}
            <div className="mt-4 px-0">
              <div className="overflow-hidden rounded-2xl bg-white" style={{ boxShadow: cardShadow }}>
                {sportStatsRow.map((st, i) => (
                  <Fragment key={st.label}>
                    {i > 0 ? insetDivider : null}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div
                        className="flex shrink-0 items-center justify-center rounded-xl"
                        style={{
                          width: 40,
                          height: 40,
                          background: st.color,
                          fontSize: 20,
                          boxShadow: `0 2px 6px ${st.color}40`,
                        }}
                      >
                        {st.emoji}
                      </div>
                      <span
                        className="min-w-0 flex-1 truncate"
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#0A0F1F",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {st.label}
                      </span>
                      <span
                        style={{
                          fontSize: 20,
                          fontWeight: 900,
                          color: "#0A0F1F",
                          letterSpacing: "-0.02em",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {statsLoading ? "…" : st.value}
                      </span>
                    </div>
                  </Fragment>
                ))}
                {insetDivider}
                <button
                  type="button"
                  onClick={onOpenRecords}
                  className="flex w-full items-center gap-3 px-4 py-3 active:bg-[#F8F8F8]"
                >
                  <div
                    className="flex shrink-0 items-center justify-center rounded-xl"
                    style={{
                      width: 40,
                      height: 40,
                      background: "#FFCC00",
                      fontSize: 20,
                      boxShadow: "0 2px 6px #FFCC0040",
                    }}
                  >
                    🏅
                  </div>
                  <span
                    className="min-w-0 flex-1 truncate text-left"
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#0A0F1F",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Records sport
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
                </button>
                {insetDivider}
                <button
                  type="button"
                  onClick={onOpenRecentSessions}
                  className="flex w-full items-center gap-3 px-4 py-3 active:bg-[#F8F8F8]"
                >
                  <div
                    className="flex shrink-0 items-center justify-center rounded-xl"
                    style={{
                      width: 40,
                      height: 40,
                      background: "#0A84FF",
                      fontSize: 20,
                      boxShadow: "0 2px 6px #0A84FF40",
                    }}
                  >
                    📅
                  </div>
                  <span
                    className="min-w-0 flex-1 truncate text-left"
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#0A0F1F",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Séances récentes
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
