import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { normalizeRouteCoordinates, type MapboxStaticPoint } from '@/lib/mapboxStaticImage';

const PARIS_FALLBACK: MapboxStaticPoint = { lat: 48.8566, lng: 2.3522 };

function safeMapPoint(p: MapboxStaticPoint): MapboxStaticPoint {
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return PARIS_FALLBACK;
}

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
  distance_km?: number | null;
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
  if (s.distance_km && (s.session_type === 'footing' || s.session_type === 'sortie_longue')) {
    const km = s.distance_km;
    return km < 1 ? `${Math.round(km * 1000)} m` : `${String(km).replace('.', ',')} km`;
  }
  return null;
}

/**
 * Nettoie une valeur d'allure saisie par l'utilisateur :
 * supprime toute unité déjà présente (« min/km », « /km », « km », « min »…)
 * pour qu'on puisse rajouter l'unité voulue une seule fois proprement.
 * Ex : "4:00 min/km" → "4:00", "4:00 /km" → "4:00", "4:00" → "4:00".
 */
function stripPaceUnitSuffix(raw: string): string {
  if (!raw) return raw;
  return raw
    .trim()
    .replace(/\s*min\s*\/\s*km\s*$/i, '')
    .replace(/\s*\/\s*km\s*$/i, '')
    .replace(/\s*km\/h\s*$/i, '')
    .replace(/\s*km\s*$/i, '')
    .replace(/\s*min\s*$/i, '')
    .trim();
}

function buildPace(s: SessionLike, _formatKm: (n: number) => string): { primary: string | null; secondary: string | null } {
  // Cherche aussi dans les session_blocks (fractionné stocké en JSON)
  const blocks = s.session_blocks as Array<{ type?: string; effortPace?: string; effortPaceUnit?: string }> | undefined;
  const intervalBlock = blocks?.find((b) => b.type === 'interval');
  const blockPace = intervalBlock?.effortPace;
  const blockPaceUnit = intervalBlock?.effortPaceUnit;

  if (s.interval_pace || blockPace) {
    const pace = stripPaceUnitSuffix(s.interval_pace || blockPace!);
    const unit = s.interval_pace_unit || blockPaceUnit;
    const u = unit === 'power' ? ' W' : ' /km';
    return {
      primary: `${pace}${u}`,
      secondary: 'allure cible',
    };
  }
  if (s.pace_general) {
    const u = s.pace_unit === 'power' ? ' W' : ' /km';
    return { primary: `${stripPaceUnitSuffix(s.pace_general)}${u}`, secondary: 'allure' };
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
  const mapPin = safeMapPoint(
    hasRoute
      ? routePath[Math.floor(routePath.length / 2)]!
      : { lat: session.location_lat, lng: session.location_lng }
  );

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
