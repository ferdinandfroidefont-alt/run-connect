import { Fragment, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ChevronRight,
  Clock,
  ContactRound,
  Search,
  User,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfilesTab } from "@/components/search/ProfilesTab";
import { ClubsTab } from "@/components/search/ClubsTab";
import { StravaTab } from "@/components/search/StravaTab";
import { ContactsTab } from "@/components/search/ContactsTab";
import {
  loadMessageSearchRecents,
  pushMessageSearchRecent,
  removeMessageSearchRecent,
  type MessageSearchRecent,
} from "@/lib/messageSearchRecents";

const ACTION_BLUE = "#007AFF";
const BG = "#F2F2F7";

export type MessageSearchMaquetteTab = "profiles" | "clubs" | "strava" | "contacts";

type SuggestionProfile = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  subtitle: string;
};

type MessageSearchSheetProps = {
  onClose: () => void;
};

const SEARCH_TABS: {
  id: MessageSearchMaquetteTab;
  label: string;
  Icon: typeof User;
}[] = [
  { id: "profiles", label: "Profils", Icon: User },
  { id: "clubs", label: "Clubs", Icon: Users },
  { id: "strava", label: "Strava", Icon: Activity },
  { id: "contacts", label: "Contacts", Icon: ContactRound },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <p
      className="px-4 pb-2 pt-4"
      style={{
        fontSize: 13,
        fontWeight: 800,
        color: "#8E8E93",
        letterSpacing: "0.05em",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function SuggestionRow({
  profile,
  onPick,
}: {
  profile: SuggestionProfile;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-3 px-4 py-3 transition-colors active:bg-[#F8F8F8]"
    >
      <Avatar className="h-11 w-11 shrink-0 border-[1.5px] border-[#007AFF33]">
        <AvatarImage src={profile.avatar_url || undefined} />
        <AvatarFallback className="bg-[#F2F2F7] text-lg font-black text-[#0A0F1F]">
          {(profile.display_name || profile.username)[0]?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 text-left">
        <p className="m-0 truncate text-[16px] font-bold text-[#0A0F1F]">{profile.display_name}</p>
        <p className="m-0 mt-0.5 truncate text-[13px] text-[#8E8E93]">
          @{profile.username} · {profile.subtitle}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
    </button>
  );
}

export function MessageSearchSheet({ onClose }: MessageSearchSheetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<MessageSearchMaquetteTab>("profiles");
  const [recents, setRecents] = useState<MessageSearchRecent[]>(() => loadMessageSearchRecents());
  const [suggestions, setSuggestions] = useState<SuggestionProfile[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  useEffect(() => {
    if (!user) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setSuggestionsLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_friend_suggestions_prioritized", {
          current_user_id: user.id,
          suggestion_limit: 8,
        });

        if (cancelled) return;

        if (error || !data?.length) {
          const { data: popular } = await supabase
            .from("profiles")
            .select("user_id, username, display_name, avatar_url")
            .neq("user_id", user.id)
            .not("username", "is", null)
            .order("last_seen", { ascending: false })
            .limit(4);

          if (cancelled) return;

          setSuggestions(
            (popular || []).map((p) => ({
              user_id: p.user_id!,
              username: p.username || "utilisateur",
              display_name: p.display_name || p.username || "Utilisateur",
              avatar_url: p.avatar_url,
              subtitle: "Athlète",
            })),
          );
          return;
        }

        setSuggestions(
          (data as { user_id: string; username: string; display_name: string; avatar_url: string | null; source?: string }[])
            .slice(0, 4)
            .map((s) => ({
              user_id: s.user_id,
              username: s.username,
              display_name: s.display_name,
              avatar_url: s.avatar_url,
              subtitle:
                s.source === "mutual_friends"
                  ? "Ami suggéré"
                  : s.source === "common_clubs"
                    ? "Même club"
                    : "Athlète",
            })),
        );
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const openProfile = useCallback(
    (userId: string, name: string, username: string) => {
      setRecents(
        pushMessageSearchRecent({
          type: "user",
          userId,
          name,
          handle: `@${username}`,
        }),
      );
      onClose();
      navigate(`/profile/${userId}`);
    },
    [navigate, onClose],
  );

  const openRecent = useCallback(
    (recent: MessageSearchRecent) => {
      if (recent.type === "user") {
        openProfile(recent.userId, recent.name, recent.handle.replace(/^@/, ""));
        return;
      }
      onClose();
      navigate(`/messages?conversation=${recent.clubId}`);
    },
    [navigate, onClose, openProfile],
  );

  const removeRecent = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecents(removeMessageSearchRecent(id));
  }, []);

  const goStravaSettings = () => {
    onClose();
    navigate("/profile?tab=settings&focus=strava");
  };

  let body: React.ReactNode;

  if (!hasQuery) {
    body = (
      <>
        {recents.length > 0 ? (
          <>
            <SectionLabel>RÉCENTS</SectionLabel>
            <div className="bg-white">
              {recents.map((r, i) => (
                <Fragment key={r.id}>
                  {i > 0 ? <div className="h-px bg-[#E5E5EA]" /> : null}
                  <button
                    type="button"
                    onClick={() => openRecent(r)}
                    className="flex w-full items-center gap-3 px-4 py-3 transition-colors active:bg-[#F8F8F8]"
                  >
                    <Clock className="h-[18px] w-[18px] shrink-0 text-[#8E8E93]" strokeWidth={2.2} />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="m-0 truncate text-[16px] font-bold text-[#0A0F1F]">{r.name}</p>
                      {r.type === "user" ? (
                        <p className="m-0 mt-0.5 text-[13px] text-[#8E8E93]">{r.handle}</p>
                      ) : (
                        <p className="m-0 mt-0.5 text-[13px] text-[#8E8E93]">
                          {r.members != null ? `${r.members} membres` : "Club"}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => removeRecent(r.id, e)}
                      className="shrink-0 p-1"
                      aria-label="Retirer des récents"
                    >
                      <X className="h-[18px] w-[18px] text-[#C7C7CC]" strokeWidth={2.2} />
                    </button>
                  </button>
                </Fragment>
              ))}
            </div>
          </>
        ) : null}

        <SectionLabel>SUGGESTIONS</SectionLabel>
        <div className="bg-white">
          {suggestionsLoading ? (
            <div className="px-4 py-6 text-center text-[15px] text-[#8E8E93]">Chargement…</div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-6 text-center text-[15px] text-[#8E8E93]">
              Aucune suggestion pour le moment
            </div>
          ) : (
            suggestions.map((u, i) => (
              <Fragment key={u.user_id}>
                {i > 0 ? <div className="h-px bg-[#E5E5EA]" /> : null}
                <SuggestionRow
                  profile={u}
                  onPick={() => openProfile(u.user_id, u.display_name, u.username)}
                />
              </Fragment>
            ))
          )}
        </div>
      </>
    );
  } else if (tab === "strava") {
    body = (
      <div className="mt-1">
        <StravaTab searchQuery={trimmed} onOpenSettings={() => goStravaSettings()} />
      </div>
    );
  } else if (tab === "contacts") {
    body = (
      <div className="mt-1">
        <ContactsTab searchQuery={trimmed} />
      </div>
    );
  } else if (tab === "profiles") {
    body = (
      <div className="mt-1 min-w-0 overflow-hidden">
        <ProfilesTab searchQuery={trimmed} />
      </div>
    );
  } else {
    body = (
      <div className="mt-1 min-w-0 overflow-hidden">
        <ClubsTab searchQuery={trimmed} />
      </div>
    );
  }

  const sheet = (
    <div
      className="fixed inset-0 flex min-h-0 flex-col overflow-hidden"
      style={{
        zIndex: 200,
        background: BG,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
      data-no-tab-swipe="true"
    >
      <div
        className="flex shrink-0 items-center gap-2 px-4 pb-3"
        style={{
          background: "white",
          borderBottom: "1px solid #E5E5EA",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        }}
      >
        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          style={{ background: "#F2F2F7", borderRadius: 10, padding: "8px 12px" }}
        >
          <Search className="h-[18px] w-[18px] shrink-0" color="#8E8E93" strokeWidth={2.4} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher amis · clubs · groupes"
            className="min-w-0 flex-1 bg-transparent outline-none"
            style={{ fontSize: 16, color: "#0A0F1F", fontWeight: 500 }}
            enterKeyHint="search"
            autoCorrect="off"
            autoCapitalize="none"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="shrink-0">
              <div
                className="flex items-center justify-center"
                style={{ width: 18, height: 18, borderRadius: "50%", background: "#C7C7CC" }}
              >
                <X className="h-3 w-3 text-white" strokeWidth={3.2} />
              </div>
            </button>
          ) : null}
        </div>
        <button type="button" onClick={onClose} className="shrink-0 transition-opacity active:opacity-70">
          <span style={{ fontSize: 16, fontWeight: 500, color: ACTION_BLUE, letterSpacing: "-0.01em" }}>
            Annuler
          </span>
        </button>
      </div>

      <div
        className="flex shrink-0 gap-1.5 overflow-x-auto px-4 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ background: "white", borderBottom: "1px solid #E5E5EA" }}
      >
        {SEARCH_TABS.map((t) => {
          const Icon = t.Icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="flex shrink-0 items-center gap-1.5 transition-opacity active:opacity-80"
              style={{
                background: active ? ACTION_BLUE : "#F2F2F7",
                borderRadius: 9999,
                padding: "6px 14px",
              }}
            >
              <Icon className="h-4 w-4" color={active ? "white" : "#0A0F1F"} strokeWidth={2.2} />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: active ? "white" : "#0A0F1F",
                  letterSpacing: "-0.01em",
                }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {body}
      </div>
    </div>
  );

  if (typeof document === "undefined") return sheet;
  return createPortal(sheet, document.body);
}
