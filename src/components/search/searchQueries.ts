import type { SupabaseClient } from "@supabase/supabase-js";
import { COUNTRY_LABELS } from "@/lib/countryLabels";

export type ProfileSearchHit = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_premium: boolean;
  follower_count: number;
  country_label: string | null;
};

export type ClubSearchHit = {
  id: string;
  group_name: string;
  group_description: string | null;
  group_avatar_url: string | null;
  club_code: string;
  created_by: string;
  location: string | null;
  member_count: number;
  is_member: boolean;
};

export type SessionSearchHit = {
  id: string;
  title: string;
  description: string | null;
  activity_type: string;
  session_type: string;
  location_name: string;
  scheduled_at: string;
  location_lat: number;
  location_lng: number;
  image_url: string | null;
  friends_only: boolean | null;
};

export function formatCompactFollowerCount(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(".", ",")}M`;
  }
  if (n >= 1000) {
    const v = n / 1000;
    const s = v >= 10 ? String(Math.round(v)) : v.toFixed(1).replace(".", ",");
    return `${s}K`;
  }
  return String(Math.round(n));
}

export async function searchProfilesForQuery(
  supabase: SupabaseClient,
  currentUserId: string | undefined,
  searchQuery: string
): Promise<ProfileSearchHit[]> {
  const q = searchQuery.trim();
  if (!q) return [];

  let profileQuery = supabase
    .from("profiles")
    .select("user_id")
    .eq("is_private", false)
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(24);

  if (currentUserId) {
    profileQuery = profileQuery.neq("user_id", currentUserId);
  }

  const { data: searchData, error: searchError } = await profileQuery;
  if (searchError) throw searchError;

  const userIds = searchData?.map((item) => item.user_id) || [];
  if (!userIds.length) return [];

  const { data: profilesData, error: profilesError } = await supabase.rpc("get_safe_public_profiles", {
    profile_user_ids: userIds,
  });
  if (profilesError) throw profilesError;

  const { data: countryRows } = await supabase.from("profiles").select("user_id, country").in("user_id", userIds);

  const countryByUser = new Map<string, string | null>();
  for (const row of countryRows || []) {
    countryByUser.set(row.user_id, row.country ?? null);
  }

  const base = profilesData || [];
  const withStats = await Promise.all(
    base.map(async (profile) => {
      const { data: followerData } = await supabase.rpc("get_follower_count", { profile_user_id: profile.user_id });
      const code = countryByUser.get(profile.user_id);
      const country_label = code ? COUNTRY_LABELS[code] ?? code : null;
      return {
        user_id: profile.user_id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        is_premium: !!profile.is_premium,
        follower_count: followerData || 0,
        country_label,
      };
    })
  );

  return withStats;
}

async function excludedClubIds(supabase: SupabaseClient, userId: string | undefined): Promise<string[]> {
  if (!userId) return [];
  const { data: memberClubIds } = await supabase.from("group_members").select("conversation_id").eq("user_id", userId);
  return memberClubIds?.map((item) => item.conversation_id) || [];
}

export async function searchClubsByText(
  supabase: SupabaseClient,
  currentUserId: string | undefined,
  searchQuery: string
): Promise<ClubSearchHit[]> {
  const q = searchQuery.trim();
  if (!q) return [];

  const excluded = await excludedClubIds(supabase, currentUserId);

  let query = supabase
    .from("conversations")
    .select("id, group_name, group_description, group_avatar_url, club_code, created_by, location")
    .eq("is_group", true)
    .not("club_code", "is", null)
    .neq("club_code", "")
    .eq("is_private", false)
    .ilike("group_name", `%${q}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (excluded.length > 0) {
    query = query.not("id", "in", `(${excluded.join(",")})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return [];

  return Promise.all(
    data.map(async (club) => {
      const { count: memberCount } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", club.id);

      let isMember = false;
      if (currentUserId) {
        const { data: memberData } = await supabase
          .from("group_members")
          .select("id")
          .eq("conversation_id", club.id)
          .eq("user_id", currentUserId)
          .maybeSingle();
        isMember = !!memberData;
      }

      return {
        ...club,
        member_count: memberCount || 0,
        is_member: isMember,
      };
    })
  );
}

export async function searchSessionsForQuery(
  supabase: SupabaseClient,
  currentUserId: string | undefined,
  searchQuery: string
): Promise<SessionSearchHit[]> {
  const q = searchQuery.trim();
  if (!q) return [];

  const nowIso = new Date().toISOString();
  let query = supabase
    .from("sessions")
    .select(
      "id, title, description, activity_type, session_type, location_name, scheduled_at, location_lat, location_lng, image_url, friends_only, organizer_id"
    )
    .gte("scheduled_at", nowIso)
    .eq("is_private", false)
    .or(`title.ilike.%${q}%,location_name.ilike.%${q}%,description.ilike.%${q}%`)
    .order("scheduled_at", { ascending: true })
    .limit(20);

  if (currentUserId) {
    query = query.neq("organizer_id", currentUserId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).filter((s) => !s.friends_only) as SessionSearchHit[];
}

/** Libellé court type de séance (liste recherche). */
export function sessionTypeLabelFr(sessionType: string): string {
  const k = sessionType?.toLowerCase?.() ?? "";
  const labels: Record<string, string> = {
    footing: "Footing",
    sortie_longue: "Sortie longue",
    sortie_collective: "Sortie collective",
    collective: "Sortie collective",
    intervalles: "Intervalles",
    entrainement: "Entraînement",
    renforcement: "Renforcement",
    cross_training: "Cross training",
    autre: "Séance",
  };
  if (labels[k]) return labels[k];
  if (!k) return "Séance";
  return k.replace(/_/g, " ");
}
