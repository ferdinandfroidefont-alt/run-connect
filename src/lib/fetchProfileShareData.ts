import { supabase } from '@/integrations/supabase/client';
import { buildProfileSharePayloadFromData } from '@/lib/profileSharePayload';
import { getProfilePublicUrl } from '@/lib/appLinks';
import type { ProfileSharePayload } from '@/lib/profileSharePayload';

export async function fetchProfileSharePayload(userId: string, referralCode?: string | null): Promise<ProfileSharePayload | null> {
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select(
      'username, display_name, avatar_url, favorite_sport, country, is_premium, is_admin, user_id'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (pErr || !profile?.username) return null;

  const username = profile.username;

  const [
    sessionsRes,
    routesRes,
    joinedRes,
    tmplRes,
    weekTmplRes,
    statsRes,
    coachSessionsRes,
  ] = await Promise.all([
    supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('organizer_id', userId),
    supabase
      .from('routes')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq('is_public', true),
    supabase.from('session_participants').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('coaching_templates').select('id', { count: 'exact', head: true }).eq('coach_id', userId),
    supabase.from('coaching_week_templates').select('id', { count: 'exact', head: true }).eq('coach_id', userId),
    supabase.from('user_stats').select('reliability_rate').eq('user_id', userId).maybeSingle(),
    supabase.from('coaching_sessions').select('id').eq('coach_id', userId),
  ]);

  const sessionsCreated = sessionsRes.count ?? 0;
  const routesPublished = routesRes.count ?? 0;
  const sessionsJoined = joinedRes.count ?? 0;
  const modelsCount = (tmplRes.count ?? 0) + (weekTmplRes.count ?? 0);
  const presenceRate =
    statsRes.data?.reliability_rate != null ? Math.round(Number(statsRes.data.reliability_rate)) : null;

  const sessionIds = (coachSessionsRes.data ?? []).map((r) => r.id);
  let participationsReceived = 0;
  if (sessionIds.length > 0) {
    const { count } = await supabase
      .from('coaching_participations')
      .select('id', { count: 'exact', head: true })
      .in('coaching_session_id', sessionIds);
    participationsReceived = count ?? 0;
  }

  const publicUrl = getProfilePublicUrl(username, referralCode ?? undefined);

  let qrDataUrl: string | null = null;
  try {
    const { default: QRCode } = await import('qrcode');
    qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 200,
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
    is_admin: profile.is_admin,
    clubName: null,
    sessionsCreated,
    sessionsJoined,
    modelsCount,
    routesPublished,
    participationsReceived,
    presenceRate,
    publicUrl,
    qrDataUrl,
  });
}
