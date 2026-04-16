import { supabase } from '@/integrations/supabase/client';
import { buildProfileSharePayloadFromData } from '@/lib/profileSharePayload';
import { getProfilePublicUrl } from '@/lib/appLinks';
import type { ProfileSharePayload } from '@/lib/profileSharePayload';

async function fetchPrimaryClubName(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('group_members')
    .select('conversations(group_name, club_code)')
    .eq('user_id', userId);

  if (error || !data?.length) return null;

  for (const row of data as { conversations: { group_name: string | null; club_code: string | null } | null }[]) {
    const c = row.conversations;
    if (c?.club_code && c.group_name?.trim()) return c.group_name.trim();
  }
  return null;
}

export async function fetchProfileSharePayload(userId: string, referralCode?: string | null): Promise<ProfileSharePayload | null> {
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, favorite_sport, country, is_premium, user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (pErr || !profile?.username) return null;

  const username = profile.username;

  const [
    sessionsRes,
    joinedRes,
    tmplRes,
    weekTmplRes,
    statsRes,
    coachSessionsRes,
    followersRes,
    followingRes,
    clubName,
  ] = await Promise.all([
    supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('organizer_id', userId),
    supabase.from('session_participants').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('coaching_templates').select('id', { count: 'exact', head: true }).eq('coach_id', userId),
    supabase.from('coaching_week_templates').select('id', { count: 'exact', head: true }).eq('coach_id', userId),
    supabase.from('user_stats').select('reliability_rate').eq('user_id', userId).maybeSingle(),
    supabase.from('coaching_sessions').select('id').eq('coach_id', userId),
    supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
    fetchPrimaryClubName(userId),
  ]);

  const sessionsCreated = sessionsRes.count ?? 0;
  const sessionsJoined = joinedRes.count ?? 0;
  const modelsCount = (tmplRes.count ?? 0) + (weekTmplRes.count ?? 0);
  const coachSessionCount = coachSessionsRes.data?.length ?? 0;
  const isCoach = modelsCount > 0 || coachSessionCount > 0;

  const presenceRate =
    statsRes.data?.reliability_rate != null ? Math.round(Number(statsRes.data.reliability_rate)) : null;

  const followersCount = followersRes.count ?? 0;
  const followingCount = followingRes.count ?? 0;

  const publicUrl = getProfilePublicUrl(username, referralCode ?? undefined);

  let qrDataUrl: string | null = null;
  try {
    const { default: QRCode } = await import('qrcode');
    qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  } catch {
    qrDataUrl = null;
  }

  return buildProfileSharePayloadFromData({
    display_name: profile.display_name,
    username,
    avatar_url: profile.avatar_url,
    favorite_sport: profile.favorite_sport,
    country: profile.country,
    is_premium: profile.is_premium,
    clubName,
    isCoach,
    sessionsCreated,
    sessionsJoined,
    followersCount,
    followingCount,
    presenceRate,
    publicUrl,
    qrDataUrl,
  });
}
