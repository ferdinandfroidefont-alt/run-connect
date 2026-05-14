import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";

/** Données filtres démo maquette — état UI local (pas d’API). */
export const MAQUETTE_TYPES_SEANCE = [
  { id: "all", emoji: "✨", color: "#8E8E93", label: "Tous types" },
  { id: "footing", emoji: "🏃", color: ACTION_BLUE, label: "Footing" },
  { id: "longue", emoji: "🛣️", color: "#34C759", label: "Longue" },
  { id: "fractionne", emoji: "⚡", color: "#FF9500", label: "Fractionné" },
  { id: "competition", emoji: "🏆", color: "#AF52DE", label: "Compétition" },
] as const;

export const MAQUETTE_NIVEAUX = [
  { id: "all", emoji: "✨", color: "#8E8E93", label: "Tous niveaux", sub: "Pas de filtre de difficulté" },
  { id: "1", emoji: "1️⃣", color: "#34C759", label: "Niveau 1" },
  { id: "2", emoji: "2️⃣", color: "#34C759", label: "Niveau 2" },
  { id: "3", emoji: "3️⃣", color: "#FFCC00", label: "Niveau 3" },
  { id: "4", emoji: "4️⃣", color: "#FF9500", label: "Niveau 4" },
  { id: "5", emoji: "5️⃣", color: "#FF3B30", label: "Niveau 5" },
  { id: "6", emoji: "6️⃣", color: "#AF52DE", label: "Niveau 6" },
] as const;

export const MAQUETTE_HORAIRES = [
  { id: "all", emoji: "✨", color: "#8E8E93", label: "Toute la journée", sub: "Aucun filtre horaire" },
  { id: "matin", emoji: "🌅", color: "#FF9500", label: "6h-12h", sub: "6h – 12h" },
  { id: "aprem", emoji: "☀️", color: "#FFCC00", label: "12h-18h", sub: "12h – 18h" },
  { id: "soir", emoji: "🌆", color: "#5856D6", label: "18h-23h", sub: "18h – 23h" },
  { id: "nuit", emoji: "🌙", color: "#1D1D60", label: "23h-6h", sub: "23h – 6h" },
] as const;

export const MAQUETTE_VISIBILITES = [
  {
    id: "toutes",
    emoji: "🌐",
    color: ACTION_BLUE,
    label: "Toutes les séances",
    sub: "Affichage selon les règles de visibilité",
  },
  { id: "amis", emoji: "👥", color: "#34C759", label: "Amis uniquement", sub: "Séances de tes amis et les tiennes" },
] as const;

export const MAQUETTE_CLUBS = [
  { id: "all", emoji: "✨", color: "#8E8E93", label: "Tous les clubs", sub: "Aucun filtre par équipe" },
  { id: "ferdi", emoji: "🏟️", color: "#5AC8FA", label: "Ferdi", badge: 3 },
  { id: "tttt", emoji: "🏟️", color: ACTION_BLUE, label: "tttt", badge: 3 },
] as const;

export type MaquetteUiClubId = (typeof MAQUETTE_CLUBS)[number]["id"];
