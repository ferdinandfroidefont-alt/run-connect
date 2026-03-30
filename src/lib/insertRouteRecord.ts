import { supabase } from '@/integrations/supabase/client';
import { buildCoordinatesWithElevation, computeRouteStats } from '@/lib/routePersistence';
import type { MapCoord } from '@/lib/geoUtils';

export type InsertRouteResult = { ok: true } | { ok: false; message: string };

export async function insertRouteRecord(params: {
  userId: string;
  name: string;
  description: string;
  pathCoords: MapCoord[];
  elevations: number[];
  waypoints: Array<{ lat: number; lng: number; mode: 'manual' | 'guided' }>;
  isPublic?: boolean;
  /** Si les altitudes sont absentes mais D+/D- connus (ex. import localStorage legacy). */
  statsOverride?: {
    totalDistance: number;
    elevationGain: number;
    elevationLoss: number;
    minElevation: number;
    maxElevation: number;
  };
}): Promise<InsertRouteResult> {
  const { userId, name, description, pathCoords, elevations, waypoints, isPublic, statsOverride } = params;
  if (pathCoords.length < 2) {
    return { ok: false, message: 'Parcours invalide : pas assez de points' };
  }
  const stats = statsOverride ?? computeRouteStats(pathCoords, elevations);
  if (!stats) {
    return { ok: false, message: 'Impossible de calculer les statistiques du parcours' };
  }
  try {
    const coordinates = buildCoordinatesWithElevation(pathCoords, elevations);
    const { error } = await supabase.from('routes').insert({
      name,
      description: description?.trim() ? description.trim() : null,
      coordinates,
      waypoints,
      total_distance: stats.totalDistance,
      total_elevation_gain: stats.elevationGain,
      total_elevation_loss: stats.elevationLoss,
      min_elevation: stats.minElevation,
      max_elevation: stats.maxElevation,
      created_by: userId,
      is_public: isPublic ?? false,
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error('[insertRouteRecord]', e);
    return { ok: false, message: "Erreur lors de l'enregistrement de l'itinéraire" };
  }
}
