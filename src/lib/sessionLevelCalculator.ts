import type { SessionFormData, SessionBlock } from '@/components/session-creation/types';

export type SessionLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface LevelConfig {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
}

export const LEVEL_CONFIG: Record<SessionLevel, LevelConfig> = {
  1: { label: 'Débutant', color: '#22c55e', bgClass: 'bg-green-500', textClass: 'text-green-500' },
  2: { label: 'Loisir', color: '#16a34a', bgClass: 'bg-green-600', textClass: 'text-green-600' },
  3: { label: 'Intermédiaire', color: '#eab308', bgClass: 'bg-yellow-500', textClass: 'text-yellow-500' },
  4: { label: 'Avancé', color: '#f97316', bgClass: 'bg-orange-500', textClass: 'text-orange-500' },
  5: { label: 'Performance', color: '#ef4444', bgClass: 'bg-red-500', textClass: 'text-red-500' },
  6: { label: 'Élite', color: '#8b5cf6', bgClass: 'bg-violet-500', textClass: 'text-violet-500' },
};

// Sports où le calcul automatique s'applique (endurance)
export const ENDURANCE_SPORTS = ['course', 'trail', 'velo', 'vtt', 'gravel', 'natation', 'marche', 'randonnee'];

// Sports collectifs/autres où le niveau n'est PAS calculé
export const NON_LEVEL_SPORTS = [
  'football', 'basket', 'volley', 'badminton', 'pingpong', 'tennis', 
  'escalade', 'petanque', 'rugby', 'handball', 'fitness', 'yoga', 
  'musculation', 'crossfit', 'boxe', 'arts_martiaux', 'golf', 
  'ski', 'snowboard', 'kayak', 'surf', 'bmx'
];

// High intensity zones (TEMPO, SEUIL, VMA)
const HIGH_INTENSITY_ZONES = ['z3', 'z4', 'z5'];

/**
 * Vérifie si un sport est de type endurance (nécessite un niveau)
 */
export function isEnduranceSport(activityType: string): boolean {
  return ENDURANCE_SPORTS.includes(activityType);
}

/**
 * Convertit une allure string "5:30" en minutes décimales par km
 * Retourne null si format invalide
 */
export function parsePaceToMinPerKm(pace: string): number | null {
  if (!pace) return null;
  
  // Handle formats like "5:30" or "5'30" or just "5.5"
  const cleanPace = pace.replace(/'/g, ':').trim();
  
  if (cleanPace.includes(':')) {
    const parts = cleanPace.split(':');
    if (parts.length !== 2) return null;
    
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    
    if (isNaN(minutes) || isNaN(seconds)) return null;
    
    return minutes + seconds / 60;
  }
  
  // Try parsing as decimal
  const decimal = parseFloat(cleanPace);
  return isNaN(decimal) ? null : decimal;
}

/**
 * Convertit une allure en pacePoints selon la table de référence
 * Plus l'allure est rapide, plus les points sont élevés
 */
function getPacePoints(paceMinPerKm: number | null): number {
  if (paceMinPerKm === null) return 8;
  
  if (paceMinPerKm <= 2.75) return 60;      // <= 2'45/km (élite)
  if (paceMinPerKm <= 3.00) return 55;      // <= 3'00/km
  if (paceMinPerKm <= 3.25) return 50;      // <= 3'15/km
  if (paceMinPerKm <= 3.50) return 44;      // <= 3'30/km
  if (paceMinPerKm <= 3.75) return 38;      // <= 3'45/km
  if (paceMinPerKm <= 4.08) return 30;      // <= 4'05/km
  if (paceMinPerKm <= 4.50) return 22;      // <= 4'30/km
  if (paceMinPerKm <= 5.00) return 14;      // <= 5'00/km
  return 8;                                  // > 5'00/km
}

/**
 * Calcule les structurePts basés sur hardMinutes
 */
function getStructurePoints(hardMinutes: number): number {
  if (hardMinutes >= 50) return 35;
  if (hardMinutes >= 40) return 30;
  if (hardMinutes >= 30) return 24;
  if (hardMinutes >= 20) return 16;
  if (hardMinutes >= 10) return 8;
  return 0;
}

/**
 * Clamp une valeur entre min et max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Extrait la meilleure allure des blocs structurés (fractions)
 */
function getBestPaceFromBlocks(blocks: SessionBlock[]): number | null {
  let bestPace: number | null = null;
  
  for (const block of blocks) {
    // Only check interval blocks for fastest pace
    if (block.type === 'interval' && block.effortPace) {
      const pace = parsePaceToMinPerKm(block.effortPace);
      if (pace !== null && (bestPace === null || pace < bestPace)) {
        bestPace = pace;
      }
    }
    // Also check steady/warmup/cooldown blocks
    if (block.pace) {
      const pace = parsePaceToMinPerKm(block.pace);
      if (pace !== null && (bestPace === null || pace < bestPace)) {
        bestPace = pace;
      }
    }
  }
  
  return bestPace;
}

/**
 * Calcule les hardMinutes (minutes à haute intensité) depuis les blocs
 */
function getHardMinutesFromBlocks(blocks: SessionBlock[]): number {
  let hardMinutes = 0;
  
  for (const block of blocks) {
    const intensity = block.effortIntensity || block.intensity || '';
    const isHighIntensity = HIGH_INTENSITY_ZONES.includes(intensity.toLowerCase());
    
    if (isHighIntensity) {
      if (block.type === 'interval') {
        // For intervals: repetitions * effort duration
        const reps = block.repetitions || 1;
        const effortDuration = parseFloat(block.effortDuration || '0');
        const effortType = block.effortType || 'distance';
        
        if (effortType === 'time') {
          // Duration is in seconds
          hardMinutes += (reps * effortDuration) / 60;
        } else {
          // Distance-based: estimate time at ~4min/km for high intensity
          // effortDuration is in meters
          const estimatedTimeMinutes = (effortDuration / 1000) * 4;
          hardMinutes += reps * estimatedTimeMinutes;
        }
      } else {
        // Warmup/cooldown/steady: use duration directly
        const duration = parseFloat(block.duration || '0');
        const durationType = block.durationType || 'time';
        
        if (durationType === 'time') {
          hardMinutes += duration;
        } else {
          // Distance in meters, estimate at ~5min/km
          hardMinutes += (duration / 1000) * 5;
        }
      }
    }
  }
  
  return hardMinutes;
}

/**
 * Estime le totalMinutes depuis les données du formulaire
 */
function estimateTotalMinutes(formData: Partial<SessionFormData>): number {
  const { distance_km, pace_general, blocks, session_mode } = formData;
  
  // If structured mode, sum all block durations
  if (session_mode === 'structured' && blocks && blocks.length > 0) {
    let total = 0;
    for (const block of blocks) {
      if (block.type === 'interval') {
        const reps = block.repetitions || 1;
        const effortDuration = parseFloat(block.effortDuration || '0');
        const recoveryDuration = parseFloat(block.recoveryDuration || '0');
        
        if (block.effortType === 'time') {
          total += (reps * effortDuration) / 60;
        } else {
          // Distance at estimated pace
          total += reps * ((effortDuration / 1000) * 4);
        }
        total += (reps * recoveryDuration) / 60; // Recovery in seconds
      } else {
        const duration = parseFloat(block.duration || '0');
        if (block.durationType === 'time') {
          total += duration;
        } else {
          total += (duration / 1000) * 5;
        }
      }
    }
    return total;
  }
  
  // Simple mode: estimate from distance and pace
  const distance = parseFloat(distance_km || '0');
  const paceMinPerKm = parsePaceToMinPerKm(pace_general || '');
  
  if (distance > 0 && paceMinPerKm) {
    return distance * paceMinPerKm;
  }
  
  // Default estimate based on distance only (assume 5min/km)
  if (distance > 0) {
    return distance * 5;
  }
  
  return 30; // Default 30 minutes if no data
}

/**
 * Calcule automatiquement le niveau d'une séance (1-6)
 * Algorithme dominé par l'allure (70%) avec volume secondaire (30%)
 * Retourne null pour les sports non-endurance (collectifs, etc.)
 */
export function calculateSessionLevel(formData: Partial<SessionFormData>): SessionLevel | null {
  const { 
    activity_type, 
    pace_general, 
    intensity, 
    elevation_gain,
    session_mode,
    blocks = []
  } = formData;
  
  // Pour les sports non-endurance, retourner null (pas de niveau)
  if (!activity_type || !isEnduranceSport(activity_type)) {
    return null;
  }
  
  const isStructured = session_mode === 'structured' && blocks.length > 0;
  
  // ============ STEP 1: Determine paces ============
  
  // avgPaceMinPerKm: allure générale
  const avgPaceMinPerKm = parsePaceToMinPerKm(pace_general || '');
  
  // bestPaceMinPerKm: meilleure allure (from blocks if structured, else avgPace)
  let bestPaceMinPerKm: number | null;
  if (isStructured) {
    bestPaceMinPerKm = getBestPaceFromBlocks(blocks);
    // Fallback to avgPace if no pace found in blocks
    if (bestPaceMinPerKm === null) {
      bestPaceMinPerKm = avgPaceMinPerKm;
    }
  } else {
    bestPaceMinPerKm = avgPaceMinPerKm;
  }
  
  // ============ STEP 2: Calculate hardMinutes ============
  
  const totalMinutes = estimateTotalMinutes(formData);
  let hardMinutes: number;
  
  if (isStructured) {
    hardMinutes = getHardMinutesFromBlocks(blocks);
  } else {
    // Simple mode: check intensity
    const isHighIntensity = intensity && HIGH_INTENSITY_ZONES.includes(intensity.toLowerCase());
    hardMinutes = isHighIntensity ? totalMinutes : totalMinutes * 0.4;
  }
  
  // ============ STEP 3: Calculate speedScore (70%) ============
  
  const pacePoints = getPacePoints(bestPaceMinPerKm);
  const hardFactor = clamp(hardMinutes / 20, 0.3, 1.6);
  const speedScore = pacePoints * hardFactor;
  
  // ============ STEP 4: Calculate loadScore (30%) ============
  
  // volumePts: max 24
  const volumePts = Math.min(totalMinutes, 120) * 0.2;
  
  // elevationPts: max 10
  const dPlus = parseFloat(elevation_gain || '0');
  const elevationPts = Math.min(dPlus, 800) / 80;
  
  // structurePts: max 35
  const structurePts = getStructurePoints(hardMinutes);
  
  const loadScore = volumePts + elevationPts + structurePts;
  
  // ============ STEP 5: Calculate totalScore ============
  
  const totalScore = 0.7 * speedScore + 0.3 * loadScore;
  
  // ============ STEP 6: Convert score to level ============
  
  let level: SessionLevel;
  if (totalScore < 20) {
    level = 1;
  } else if (totalScore < 35) {
    level = 2;
  } else if (totalScore < 50) {
    level = 3;
  } else if (totalScore < 65) {
    level = 4;
  } else if (totalScore < 80) {
    level = 5;
  } else {
    level = 6;
  }
  
  // ============ STEP 7: Level 6 guard (very rare) ============
  
  if (level === 6) {
    const paceCondition = (bestPaceMinPerKm !== null && bestPaceMinPerKm <= 3.25) ||
                          (avgPaceMinPerKm !== null && avgPaceMinPerKm <= 3.33);
    const hardCondition = hardMinutes >= 18;
    
    if (!(paceCondition && hardCondition)) {
      level = 5; // Cap at 5 if conditions not met
    }
  }
  
  return level;
}

/**
 * Obtient la configuration d'un niveau
 */
export function getLevelConfig(level: SessionLevel): LevelConfig {
  return LEVEL_CONFIG[level];
}

/**
 * Obtient le label d'un niveau
 */
export function getLevelLabel(level: SessionLevel): string {
  return LEVEL_CONFIG[level]?.label || 'Intermédiaire';
}

/**
 * Obtient la couleur d'un niveau
 */
export function getLevelColor(level: SessionLevel): string {
  return LEVEL_CONFIG[level]?.color || '#eab308';
}

// Legacy exports for backward compatibility
export function parsePaceToSeconds(pace: string): number | null {
  const minPerKm = parsePaceToMinPerKm(pace);
  return minPerKm !== null ? minPerKm * 60 : null;
}
