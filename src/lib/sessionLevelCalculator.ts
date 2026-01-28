import type { SessionFormData } from '@/components/session-creation/types';

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

// Sports où le calcul automatique s'applique
const ENDURANCE_SPORTS = ['course', 'trail', 'velo', 'vtt', 'gravel', 'natation', 'marche', 'randonnee'];

// Base levels par type de séance
const SESSION_TYPE_BASE_LEVEL: Record<string, number> = {
  'recuperation': 1,
  'footing': 2,
  'sortie_longue': 3,
  'seuil': 4,
  'fractionne': 5,
  'fartlek': 4,
  'cotes': 4,
  'competition': 5,
};

// Modificateur par intensité
const INTENSITY_MODIFIER: Record<string, number> = {
  'z1': -1,
  'z2': 0,
  'z3': 1,
  'z4': 1,
  'z5': 2,
};

/**
 * Convertit une allure string "5:30" en secondes par km
 */
export function parsePaceToSeconds(pace: string): number | null {
  if (!pace) return null;
  
  const parts = pace.split(':');
  if (parts.length !== 2) return null;
  
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  
  if (isNaN(minutes) || isNaN(seconds)) return null;
  
  return minutes * 60 + seconds;
}

/**
 * Calcule le modificateur de niveau basé sur l'allure
 * Plus l'allure est rapide, plus le niveau augmente
 */
function getPaceModifier(paceSeconds: number | null): number {
  if (paceSeconds === null) return 0;
  
  // Allures en secondes par km
  if (paceSeconds > 360) return -1;  // > 6:00/km → niveau plus bas
  if (paceSeconds > 330) return 0;   // 5:30-6:00/km → neutre
  if (paceSeconds > 300) return 0;   // 5:00-5:30/km → neutre
  if (paceSeconds > 270) return 1;   // 4:30-5:00/km → +1
  if (paceSeconds > 240) return 2;   // 4:00-4:30/km → +2
  return 3;                          // < 4:00/km → +3 (élite)
}

/**
 * Calcule automatiquement le niveau d'une séance (1-6)
 * basé sur le type de séance, l'allure et l'intensité
 */
export function calculateSessionLevel(formData: Partial<SessionFormData>): SessionLevel {
  const { activity_type, session_type, pace_general, intensity } = formData;
  
  // Pour les sports non-endurance, retourner niveau par défaut (Intermédiaire)
  if (!activity_type || !ENDURANCE_SPORTS.includes(activity_type)) {
    return 3;
  }
  
  // Niveau de base selon le type de séance
  let level = SESSION_TYPE_BASE_LEVEL[session_type || ''] ?? 3;
  
  // Modificateur d'allure
  const paceSeconds = parsePaceToSeconds(pace_general || '');
  level += getPaceModifier(paceSeconds);
  
  // Modificateur d'intensité
  if (intensity) {
    level += INTENSITY_MODIFIER[intensity.toLowerCase()] ?? 0;
  }
  
  // Clamp entre 1 et 6
  return Math.max(1, Math.min(6, level)) as SessionLevel;
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
