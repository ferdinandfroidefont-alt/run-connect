import type { Json } from "@/integrations/supabase/types";

/** Profil affiché / édité sur la page Profil (aligné sur la table `profiles`). */
export interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_image_url?: string | null;
  age: number | null;
  bio: string | null;
  phone: string | null;
  favorite_sport?: string | null;
  country?: string | null;
  is_premium: boolean;
  is_admin?: boolean;
  notifications_enabled?: boolean;
  rgpd_accepted?: boolean;
  security_rules_accepted?: boolean;
  running_records?: Json | null;
  cycling_records?: Json | null;
  swimming_records?: Json | null;
  triathlon_records?: Json | null;
  walking_records?: Json | null;
  strava_connected?: boolean;
  strava_verified_at?: string;
  strava_user_id?: string;
  instagram_connected?: boolean;
  instagram_verified_at?: string;
  instagram_username?: string;
}

export interface UserRoute {
  id: string;
  name: string;
  description: string | null;
  total_distance: number | null;
  total_elevation_gain: number | null;
  created_at: string;
}

export interface CommonClubRow {
  club_id: string;
  club_name: string;
  club_description: string | null;
  club_avatar_url: string | null;
  club_code: string;
  created_by: string;
}

export interface AuditConnectionRow {
  timestamp: string;
  details: Json | null;
  action: string;
}
