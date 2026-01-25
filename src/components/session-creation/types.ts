export interface SessionFormData {
  title: string;
  description: string;
  activity_type: string;
  session_type: string;
  scheduled_at: string;
  max_participants: string;
  distance_km: string;
  pace_general: string;
  pace_unit: string;
  interval_unit: string;
  interval_distance: string;
  interval_pace: string;
  interval_count: string;
  location_name: string;
  friends_only: boolean;
  image_url: string;
  club_id: string | null;
  // Nouveaux champs détaillés
  warmup_duration: string;
  warmup_pace: string;
  cooldown_duration: string;
  cooldown_pace: string;
  recovery_duration: string;
  recovery_type: string;
  intensity: string;
  terrain_type: string;
  elevation_gain: string;
}

export interface SelectedLocation {
  lat: number;
  lng: number;
  name: string;
}

export type WizardStep = 'location' | 'activity' | 'datetime' | 'details' | 'confirm';

export const WIZARD_STEPS: WizardStep[] = ['location', 'activity', 'datetime', 'details', 'confirm'];

export const ACTIVITY_TYPES = [
  { value: 'course', label: '🏃 Course à pied', icon: '🏃' },
  { value: 'trail', label: '⛰️ Trail', icon: '⛰️' },
  { value: 'velo', label: '🚴 Vélo', icon: '🚴' },
  { value: 'vtt', label: '🚵 VTT', icon: '🚵' },
  { value: 'bmx', label: '🚲 BMX', icon: '🚲' },
  { value: 'gravel', label: '🚴‍♂️ Gravel', icon: '🚴‍♂️' },
  { value: 'marche', label: '🚶 Marche', icon: '🚶' },
  { value: 'natation', label: '🏊 Natation', icon: '🏊' },
  { value: 'football', label: '⚽ Football', icon: '⚽' },
  { value: 'basket', label: '🏀 Basketball', icon: '🏀' },
  { value: 'volley', label: '🏐 Volleyball', icon: '🏐' },
  { value: 'badminton', label: '🏸 Badminton', icon: '🏸' },
  { value: 'pingpong', label: '🏓 Tennis de table', icon: '🏓' },
  { value: 'tennis', label: '🎾 Tennis', icon: '🎾' },
  { value: 'escalade', label: '🧗 Escalade', icon: '🧗' },
  { value: 'petanque', label: '⚪ Pétanque', icon: '⚪' },
  { value: 'rugby', label: '🏉 Rugby', icon: '🏉' },
  { value: 'handball', label: '🤾 Handball', icon: '🤾' },
  { value: 'fitness', label: '💪 Fitness', icon: '💪' },
  { value: 'yoga', label: '🧘 Yoga', icon: '🧘' },
  { value: 'musculation', label: '🏋️ Musculation', icon: '🏋️' },
  { value: 'crossfit', label: '🔥 CrossFit', icon: '🔥' },
  { value: 'boxe', label: '🥊 Boxe', icon: '🥊' },
  { value: 'arts_martiaux', label: '🥋 Arts martiaux', icon: '🥋' },
  { value: 'golf', label: '⛳ Golf', icon: '⛳' },
  { value: 'ski', label: '⛷️ Ski', icon: '⛷️' },
  { value: 'snowboard', label: '🏂 Snowboard', icon: '🏂' },
  { value: 'randonnee', label: '🥾 Randonnée', icon: '🥾' },
  { value: 'kayak', label: '🛶 Kayak', icon: '🛶' },
  { value: 'surf', label: '🏄 Surf', icon: '🏄' },
];

export const SESSION_TYPES = [
  { value: 'footing', label: 'Footing', description: 'Sortie tranquille à allure confortable' },
  { value: 'sortie_longue', label: 'Sortie longue', description: 'Endurance fondamentale sur longue distance' },
  { value: 'fractionne', label: 'Fractionné', description: 'Séance avec intervalles rapides' },
  { value: 'seuil', label: 'Seuil', description: 'Allure soutenue proche du seuil anaérobie' },
  { value: 'fartlek', label: 'Fartlek', description: 'Jeu de vitesse avec variations libres' },
  { value: 'cotes', label: 'Côtes', description: 'Répétitions en montée' },
  { value: 'competition', label: 'Compétition', description: 'Course officielle ou simulation' },
  { value: 'recuperation', label: 'Récupération', description: 'Sortie très lente pour récupérer' },
];

export const INTENSITY_LEVELS = [
  { value: 'z1', label: 'Z1 - Récupération', color: 'bg-blue-500' },
  { value: 'z2', label: 'Z2 - Endurance', color: 'bg-green-500' },
  { value: 'z3', label: 'Z3 - Tempo', color: 'bg-yellow-500' },
  { value: 'z4', label: 'Z4 - Seuil', color: 'bg-orange-500' },
  { value: 'z5', label: 'Z5 - VMA', color: 'bg-red-500' },
];

export const TERRAIN_TYPES = [
  { value: 'route', label: 'Route' },
  { value: 'piste', label: 'Piste' },
  { value: 'chemin', label: 'Chemin/Sentier' },
  { value: 'foret', label: 'Forêt' },
  { value: 'montagne', label: 'Montagne' },
  { value: 'plage', label: 'Plage' },
  { value: 'urbain', label: 'Urbain' },
  { value: 'mixte', label: 'Mixte' },
];

export const RECOVERY_TYPES = [
  { value: 'trot', label: 'Trot lent' },
  { value: 'marche', label: 'Marche' },
  { value: 'statique', label: 'Récup statique' },
];

export const DEFAULT_FORM_DATA: SessionFormData = {
  title: "",
  description: "",
  activity_type: "",
  session_type: "",
  scheduled_at: "",
  max_participants: "",
  distance_km: "",
  pace_general: "",
  pace_unit: "speed",
  interval_unit: "distance",
  interval_distance: "",
  interval_pace: "",
  interval_count: "",
  location_name: "",
  friends_only: true,
  image_url: "",
  club_id: null,
  // Nouveaux champs
  warmup_duration: "",
  warmup_pace: "",
  cooldown_duration: "",
  cooldown_pace: "",
  recovery_duration: "",
  recovery_type: "trot",
  intensity: "",
  terrain_type: "",
  elevation_gain: "",
};
