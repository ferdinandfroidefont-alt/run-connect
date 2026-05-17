import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import {
  Activity,
  AlertCircle,
  AtSign,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle,
  Clock,
  CloudRain,
  Crown,
  Edit,
  Eye,
  Flame,
  Gift,
  Heart,
  MapPin,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Play,
  RefreshCw,
  Send,
  Smartphone,
  Target,
  TrendingUp,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  XCircle,
} from "lucide-react";

export type NotificationProfileColumn =
  | "notif_follow_request"
  | "notif_message"
  | "notif_comment"
  | "notif_mention"
  | "notif_like"
  | "notif_story_view"
  | "notif_friend_first_post"
  | "notif_session_request"
  | "notif_friend_session"
  | "notif_session_accepted"
  | "notif_presence_confirmed"
  | "notif_session_edited"
  | "notif_session_cancelled"
  | "notif_reminder_d1"
  | "notif_reminder_h1"
  | "notif_bad_weather"
  | "notif_boost_nearby"
  | "notif_recurring_approaching"
  | "notif_coach_sends"
  | "notif_athlete_validates"
  | "notif_coach_review"
  | "notif_new_plan"
  | "notif_missed_session"
  | "notif_athlete_absent"
  | "notif_club_invitation"
  | "notif_club_announcement"
  | "notif_club_new_session"
  | "notif_club_new_member"
  | "notif_weekly_goal"
  | "notif_streak"
  | "notif_weekly_report"
  | "notif_anniversary"
  | "notif_views_peak"
  | "notif_personal_record"
  | "notif_premium_expiring"
  | "notif_strava_to_associate";

export type IconComp = ComponentType<LucideProps>;

export type NotificationPreferenceItem = {
  key: NotificationProfileColumn;
  icon: IconComp;
  iconColor: string;
  label: string;
  desc: string;
  premium?: boolean;
};

export type NotificationPreferenceSection = {
  id: string;
  label: string;
  items: NotificationPreferenceItem[];
};

/** Sections et lignes alignées sur la maquette RunConnect (22).jsx */
export const NOTIFICATION_PREFERENCE_SECTIONS: NotificationPreferenceSection[] = [
  {
    id: "social",
    label: "ACTIVITÉ SOCIALE",
    items: [
      { key: "notif_follow_request", icon: Users, iconColor: "#007AFF", label: "Demandes de suivi", desc: "Quand quelqu'un vous suit" },
      { key: "notif_message", icon: MessageCircle, iconColor: "#34C759", label: "Messages", desc: "Nouveaux messages reçus" },
      { key: "notif_comment", icon: MessageSquare, iconColor: "#34C759", label: "Commentaires", desc: "Commentaire sur ta séance ou ta story" },
      { key: "notif_mention", icon: AtSign, iconColor: "#007AFF", label: "Mentions", desc: "Quelqu'un te mentionne" },
      { key: "notif_like", icon: Heart, iconColor: "#FF2D55", label: "J'aime", desc: "Likes sur tes séances et stories" },
      { key: "notif_story_view", icon: Eye, iconColor: "#5856D6", label: "Vues de tes stories", desc: "Qui a regardé ta story" },
      {
        key: "notif_friend_first_post",
        icon: UserPlus,
        iconColor: "#007AFF",
        label: "Première séance d'un ami",
        desc: "Un ami publie sa toute première séance",
      },
    ],
  },
  {
    id: "sessions",
    label: "SÉANCES & RAPPELS",
    items: [
      { key: "notif_session_request", icon: Play, iconColor: "#FF9500", label: "Demandes de session", desc: "Demandes de participation" },
      {
        key: "notif_friend_session",
        icon: Users,
        iconColor: "#5856D6",
        label: "Sessions d'amis",
        desc: "Vos amis créent une session",
        premium: true,
      },
      { key: "notif_session_accepted", icon: Check, iconColor: "#34C759", label: "Participants acceptés", desc: "Quelqu'un rejoint votre session" },
      {
        key: "notif_presence_confirmed",
        icon: UserCheck,
        iconColor: "#007AFF",
        label: "Confirmation de présence",
        desc: "L'organisateur confirme votre présence",
      },
      {
        key: "notif_session_edited",
        icon: Edit,
        iconColor: "#FF9500",
        label: "Modification de séance",
        desc: "Le créateur a modifié une séance que tu rejoins",
      },
      {
        key: "notif_session_cancelled",
        icon: XCircle,
        iconColor: "#FF3B30",
        label: "Séance annulée",
        desc: "Une séance à laquelle tu participes est annulée",
      },
      { key: "notif_reminder_d1", icon: Bell, iconColor: "#5AC8FA", label: "Rappel J-1", desc: "La veille de ta séance" },
      { key: "notif_reminder_h1", icon: Clock, iconColor: "#007AFF", label: "Rappel H-1", desc: "1 heure avant ta séance" },
      {
        key: "notif_bad_weather",
        icon: CloudRain,
        iconColor: "#5AC8FA",
        label: "Météo défavorable",
        desc: "La météo s'annonce mauvaise pour ta séance",
      },
      {
        key: "notif_boost_nearby",
        icon: MapPin,
        iconColor: "#34C759",
        label: "Séance compatible à proximité",
        desc: "Une séance qui te correspond est publiée près de toi",
      },
      {
        key: "notif_recurring_approaching",
        icon: RefreshCw,
        iconColor: "#34C759",
        label: "Séance récurrente",
        desc: "Ta séance récurrente approche",
      },
    ],
  },
  {
    id: "coaching",
    label: "COACH & ATHLÈTE",
    items: [
      {
        key: "notif_coach_sends",
        icon: Send,
        iconColor: "#5856D6",
        label: "Coach t'envoie une séance",
        desc: "Ton coach t'a planifié une nouvelle séance",
      },
      {
        key: "notif_athlete_validates",
        icon: CheckCircle,
        iconColor: "#34C759",
        label: "Athlète a validé sa séance",
        desc: "Un de tes athlètes a confirmé sa séance",
      },
      {
        key: "notif_coach_review",
        icon: Edit,
        iconColor: "#FF9500",
        label: "Compte-rendu corrigé",
        desc: "Ton coach a annoté ton compte-rendu",
      },
      {
        key: "notif_new_plan",
        icon: CalendarDays,
        iconColor: "#5856D6",
        label: "Nouveau plan disponible",
        desc: "Ton plan de la semaine est prêt",
      },
      {
        key: "notif_missed_session",
        icon: AlertCircle,
        iconColor: "#FF9500",
        label: "Séance manquée",
        desc: "Une séance de ton plan n'a pas été faite",
      },
      {
        key: "notif_athlete_absent",
        icon: UserX,
        iconColor: "#FF3B30",
        label: "Athlète absent",
        desc: "Un de tes athlètes n'est pas venu à une séance",
      },
    ],
  },
  {
    id: "club",
    label: "CLUB",
    items: [
      {
        key: "notif_club_invitation",
        icon: Users,
        iconColor: "#FF3B30",
        label: "Invitations de club",
        desc: "Invitations à rejoindre un club",
      },
      {
        key: "notif_club_announcement",
        icon: Megaphone,
        iconColor: "#FF3B30",
        label: "Annonces de ton club",
        desc: "Nouveau message du club",
      },
      {
        key: "notif_club_new_session",
        icon: CalendarDays,
        iconColor: "#FF3B30",
        label: "Nouvelle séance du club",
        desc: "Ton club publie une séance",
      },
      {
        key: "notif_club_new_member",
        icon: UserPlus,
        iconColor: "#FF3B30",
        label: "Nouveau membre",
        desc: "Quelqu'un rejoint ton club (admins)",
      },
    ],
  },
  {
    id: "motivation",
    label: "MOTIVATION",
    items: [
      {
        key: "notif_weekly_goal",
        icon: Target,
        iconColor: "#34C759",
        label: "Objectif hebdo atteint",
        desc: "Tu as atteint ton objectif de la semaine",
      },
      { key: "notif_streak", icon: Flame, iconColor: "#FF9500", label: "Streak en jeu", desc: "Ta série de séances risque de s'arrêter" },
      {
        key: "notif_weekly_report",
        icon: BarChart3,
        iconColor: "#5856D6",
        label: "Bilan de la semaine",
        desc: "Ton résumé hebdo est prêt (dimanche soir)",
      },
      {
        key: "notif_anniversary",
        icon: Gift,
        iconColor: "#FF2D55",
        label: "Anniversaire d'inscription",
        desc: "Tes paliers de séances cumulées",
      },
    ],
  },
  {
    id: "premium",
    label: "INSIGHTS PREMIUM",
    items: [
      {
        key: "notif_views_peak",
        icon: TrendingUp,
        iconColor: "#5856D6",
        label: "Pic de vues",
        desc: "Ta publication dépasse ta moyenne habituelle",
        premium: true,
      },
      {
        key: "notif_personal_record",
        icon: Trophy,
        iconColor: "#FFCC00",
        label: "Nouveau record perso",
        desc: "Tu bats ton record de vues, likes ou participants",
        premium: true,
      },
      {
        key: "notif_premium_expiring",
        icon: Crown,
        iconColor: "#FFCC00",
        label: "Premium expire",
        desc: "Ton abonnement Premium expire bientôt",
      },
    ],
  },
  {
    id: "strava",
    label: "STRAVA",
    items: [
      {
        key: "notif_strava_to_associate",
        icon: Activity,
        iconColor: "#FC4C02",
        label: "Activité à associer",
        desc: "Une activité Strava peut être liée à une séance",
      },
    ],
  },
];

export const NOTIFICATION_PROFILE_COLUMNS: NotificationProfileColumn[] = NOTIFICATION_PREFERENCE_SECTIONS.flatMap(
  (s) => s.items.map((i) => i.key),
);

/** Colonne profiles pour un type de notification (notifications.type ou send-push type). */
export const NOTIFICATION_TYPE_TO_PROFILE_COLUMN: Record<string, NotificationProfileColumn> = {
  message: "notif_message",
  follow_request: "notif_follow_request",
  follow_accepted: "notif_follow_request",
  follow_back: "notif_follow_request",
  comment: "notif_comment",
  mention: "notif_mention",
  like: "notif_like",
  story_view: "notif_story_view",
  friend_first_post: "notif_friend_first_post",
  session_request: "notif_session_request",
  friend_session: "notif_friend_session",
  session_accepted: "notif_session_accepted",
  presence_confirmed: "notif_presence_confirmed",
  session_edited: "notif_session_edited",
  session_cancelled: "notif_session_cancelled",
  reminder_d1: "notif_reminder_d1",
  reminder_h1: "notif_reminder_h1",
  bad_weather: "notif_bad_weather",
  boost_nearby: "notif_boost_nearby",
  nearby_session: "notif_boost_nearby",
  recurring_approaching: "notif_recurring_approaching",
  coaching_session: "notif_coach_sends",
  coach_sends: "notif_coach_sends",
  coaching_plan: "notif_new_plan",
  new_plan: "notif_new_plan",
  coaching_completed: "notif_athlete_validates",
  athlete_validates: "notif_athlete_validates",
  coaching_scheduled: "notif_athlete_validates",
  coaching_feedback: "notif_coach_review",
  coach_review: "notif_coach_review",
  coaching_reminder: "notif_missed_session",
  missed_session: "notif_missed_session",
  athlete_absent: "notif_athlete_absent",
  club_invitation: "notif_club_invitation",
  club_announcement: "notif_club_announcement",
  club_new_session: "notif_club_new_session",
  club_new_member: "notif_club_new_member",
  weekly_goal: "notif_weekly_goal",
  challenge_reminder: "notif_weekly_goal",
  streak: "notif_streak",
  coaching_weekly_recap: "notif_weekly_report",
  weekly_report: "notif_weekly_report",
  anniversary: "notif_anniversary",
  views_peak: "notif_views_peak",
  personal_record: "notif_personal_record",
  premium_expiring: "notif_premium_expiring",
  strava_to_associate: "notif_strava_to_associate",
};

export function profileColumnForNotificationType(type: string | null | undefined): NotificationProfileColumn | null {
  if (!type) return null;
  return NOTIFICATION_TYPE_TO_PROFILE_COLUMN[type] ?? null;
}

export const NOTIFICATION_PROFILE_SELECT = [
  "notifications_enabled",
  "is_premium",
  ...NOTIFICATION_PROFILE_COLUMNS,
].join(", ");

/** Ligne push maquette (hors sections types). */
export const NOTIFICATION_PUSH_ROW = {
  icon: Smartphone,
  iconColor: "#FF3B30",
  label: "Notifications push",
} as const;
