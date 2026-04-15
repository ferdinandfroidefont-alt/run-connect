import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { normalizeRouteCoordinates, type MapboxStaticPoint } from '@/lib/mapboxStaticImage';

export const SESSION_ACTIVITY_HEADER: Record<string, string> = {
  running: 'SÉANCE RUNNING',
  trail: 'SÉANCE TRAIL',
  cycling: 'SÉANCE VÉLO',
  velo: 'SÉANCE VÉLO',
  mtb: 'SÉANCE VTT',
  walking: 'SÉANCE MARCHE',
  swimming: 'SÉANCE NATATION',
  football: 'SÉANCE FOOTBALL',
  basketball: 'SÉANCE BASKET',
  tennis: 'SÉANCE TENNIS',
  petanque: 'SÉANCE PÉTANQUE',
};

export type SessionShareTemplateId =
  | 'light_pin'
  | 'light_route'
  | 'dark_premium'
  | 'minimal'
  | 'instagram_story';

export interface SessionSharePayload {
  sessionId: string;
  title: string;
  activityType: string;
  activityHeader: string;
  /** Badge court ex. "6 × 1 km" */
  structureBadge: string | null;
  /** Allure / info clé */
  pacePrimary: string | null;
  paceSecondary: string | null;
  dateLabel: string;
  timeLabel: string;
  locationTitle: string;
  locationSubtitle: string | null;
  audienceLine: string | null;
  mapPin: MapboxStaticPoint;
  routePath: MapboxStaticPoint[];
  hasRoute: boolean;
  publicUrl: string;
  sharerAvatarUrl: string | null;
  sharerInitials: string;
}

interface SessionLike {
  id: string;
  title: string;
  activity_type: string;
  scheduled_at: string;
  location_name: string;
  location_lat: number;
  location_lng: number;
  max_participants?: number;
  interval_count?: number | null;
  interval_distance?: number | null;
  interval_pace?: string | null;
  interval_pace_unit?: string | null;
  pace_general?: string | null;
  pace_unit?: string | null;
  session_type?: string | null;
  session_blocks?: unknown;
  routes?: { coordinates?: unknown[] } | null;
}

function buildStructureBadge(s: SessionLike): string | null {
  const blocks = s.session_blocks as Array<{ type?: string; repetitions?: number; effortType?: string; effortDuration?: string }> | undefined;
  if (blocks?.length) {
    const interval = blocks.find((b) => b.type === 'interval');
    if (interval?.repetitions && interval.effortDuration) {
      return `${interval.repetitions} × ${interval.effortDuration}`;
    }
  }
  if (s.interval_count && s.interval_distance) {
    const d = s.interval_distance;
    const dist =
      d < 1 ? `${Math.round(d * 1000)} m` : `${String(d).replace('.', ',')} km`;
    return `${s.interval_count} × ${dist}`;
  }
  return null;
}

function buildPace(s: SessionLike, _formatKm: (n: number) => string): { primary: string | null; secondary: string | null } {
  if (s.interval_pace) {
    const u = s.interval_pace_unit === 'power' ? ' W' : '/km';
    return {
      primary: s.interval_pace_unit === 'power' ? `${s.interval_pace}${u}` : `${s.interval_pace}${u}`,
      secondary: 'allure cible',
    };
  }
  if (s.pace_general && (s.session_type === 'footing' || s.session_type === 'sortie_longue')) {
    const u = s.pace_unit === 'power' ? ' W' : '/km';
    return { primary: `${s.pace_general}${u}`, secondary: 'allure' };
  }
  return { primary: null, secondary: null };
}

function splitLocation(name: string): { title: string; subtitle: string | null } {
  const parts = name.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { title: parts[0], subtitle: parts.slice(1).join(', ') };
  }
  return { title: name, subtitle: null };
}

export function buildSessionSharePayload(
  session: SessionLike,
  options: {
    publicUrl: string;
    sharerDisplayName: string | null;
    sharerAvatarUrl: string | null;
    formatKm: (n: number) => string;
  }
): SessionSharePayload {
  const scheduled = new Date(session.scheduled_at);
  const dateLabel = format(scheduled, 'EEEE d MMMM', { locale: fr });
  const timeLabel = format(scheduled, 'HH:mm');
  const routePath = normalizeRouteCoordinates(session.routes?.coordinates ?? []);
  const hasRoute = routePath.length >= 2;
  const mapPin = hasRoute
    ? routePath[Math.floor(routePath.length / 2)]
    : { lat: session.location_lat, lng: session.location_lng };

  const activityHeader =
    SESSION_ACTIVITY_HEADER[session.activity_type] || `SÉANCE ${session.activity_type.toUpperCase()}`;

  const { primary: pacePrimary, secondary: paceSecondary } = buildPace(session, options.formatKm);
  const loc = splitLocation(session.location_name || '');

  const initials = (options.sharerDisplayName || 'RC')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'RC';

  const audienceLine =
    typeof session.max_participants === 'number' && session.max_participants >= 20
      ? 'Ouvert à tous'
      : typeof session.max_participants === 'number'
        ? `Jusqu'à ${session.max_participants} participant${session.max_participants > 1 ? 's' : ''}`
        : 'Ouvert à tous';

  return {
    sessionId: session.id,
    title: session.title,
    activityType: session.activity_type,
    activityHeader,
    structureBadge: buildStructureBadge(session),
    pacePrimary,
    paceSecondary,
    dateLabel,
    timeLabel,
    locationTitle: loc.title,
    locationSubtitle: loc.subtitle,
    audienceLine,
    mapPin,
    routePath,
    hasRoute,
    publicUrl: options.publicUrl,
    sharerAvatarUrl: options.sharerAvatarUrl,
    sharerInitials: initials,
  };
}

export function templateDimensions(id: SessionShareTemplateId): { w: number; h: number } {
  if (id === 'instagram_story') return { w: 1080, h: 1920 };
  return { w: 1080, h: 1080 };
}
