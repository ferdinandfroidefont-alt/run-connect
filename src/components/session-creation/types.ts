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
  { value: 'footing', label: 'Footing' },
  { value: 'sortie_longue', label: 'Sortie longue' },
  { value: 'fractionne', label: 'Fractionné' },
  { value: 'competition', label: 'Compétition' },
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
  club_id: null
};
