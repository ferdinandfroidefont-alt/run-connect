export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      club_invitations: {
        Row: {
          club_id: string
          created_at: string
          id: string
          invited_user_id: string
          inviter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          invited_user_id: string
          inviter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          invited_user_id?: string
          inviter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_invitations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          club_code: string | null
          created_at: string
          created_by: string | null
          group_avatar_url: string | null
          group_description: string | null
          group_name: string | null
          id: string
          is_group: boolean | null
          participant_1: string
          participant_2: string
          updated_at: string
        }
        Insert: {
          club_code?: string | null
          created_at?: string
          created_by?: string | null
          group_avatar_url?: string | null
          group_description?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean | null
          participant_1: string
          participant_2: string
          updated_at?: string
        }
        Update: {
          club_code?: string | null
          created_at?: string
          created_by?: string | null
          group_avatar_url?: string | null
          group_description?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean | null
          participant_1?: string
          participant_2?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_message_limits: {
        Row: {
          created_at: string
          date: string
          id: string
          message_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          message_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          message_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          conversation_id: string
          id: string
          is_admin: boolean | null
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          message_type: string | null
          read_at: string | null
          sender_id: string
          session_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message_type?: string | null
          read_at?: string | null
          sender_id: string
          session_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message_type?: string | null
          read_at?: string | null
          sender_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          allow_friend_suggestions: boolean | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          cycling_records: Json | null
          display_name: string | null
          id: string
          is_online: boolean | null
          is_premium: boolean | null
          is_private: boolean | null
          last_seen: string | null
          notif_follow_request: boolean | null
          notif_friend_session: boolean | null
          notif_message: boolean | null
          notif_session_request: boolean | null
          notifications_enabled: boolean | null
          onboarding_completed: boolean | null
          phone: string | null
          push_token: string | null
          rgpd_accepted: boolean | null
          running_records: Json | null
          security_rules_accepted: boolean | null
          show_online_status: boolean | null
          strava_access_token: string | null
          strava_connected: boolean | null
          strava_refresh_token: string | null
          strava_user_id: string | null
          strava_verified_at: string | null
          swimming_records: Json | null
          triathlon_records: Json | null
          updated_at: string
          user_id: string | null
          username: string | null
          walking_records: Json | null
        }
        Insert: {
          age?: number | null
          allow_friend_suggestions?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          cycling_records?: Json | null
          display_name?: string | null
          id?: string
          is_online?: boolean | null
          is_premium?: boolean | null
          is_private?: boolean | null
          last_seen?: string | null
          notif_follow_request?: boolean | null
          notif_friend_session?: boolean | null
          notif_message?: boolean | null
          notif_session_request?: boolean | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          push_token?: string | null
          rgpd_accepted?: boolean | null
          running_records?: Json | null
          security_rules_accepted?: boolean | null
          show_online_status?: boolean | null
          strava_access_token?: string | null
          strava_connected?: boolean | null
          strava_refresh_token?: string | null
          strava_user_id?: string | null
          strava_verified_at?: string | null
          swimming_records?: Json | null
          triathlon_records?: Json | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
          walking_records?: Json | null
        }
        Update: {
          age?: number | null
          allow_friend_suggestions?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          cycling_records?: Json | null
          display_name?: string | null
          id?: string
          is_online?: boolean | null
          is_premium?: boolean | null
          is_private?: boolean | null
          last_seen?: string | null
          notif_follow_request?: boolean | null
          notif_friend_session?: boolean | null
          notif_message?: boolean | null
          notif_session_request?: boolean | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          push_token?: string | null
          rgpd_accepted?: boolean | null
          running_records?: Json | null
          security_rules_accepted?: boolean | null
          show_online_status?: boolean | null
          strava_access_token?: string | null
          strava_connected?: boolean | null
          strava_refresh_token?: string | null
          strava_user_id?: string | null
          strava_verified_at?: string | null
          swimming_records?: Json | null
          triathlon_records?: Json | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
          walking_records?: Json | null
        }
        Relationships: []
      }
      routes: {
        Row: {
          coordinates: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          max_elevation: number | null
          min_elevation: number | null
          name: string
          session_id: string | null
          total_distance: number | null
          total_elevation_gain: number | null
          total_elevation_loss: number | null
          updated_at: string
        }
        Insert: {
          coordinates: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          max_elevation?: number | null
          min_elevation?: number | null
          name: string
          session_id?: string | null
          total_distance?: number | null
          total_elevation_gain?: number | null
          total_elevation_loss?: number | null
          updated_at?: string
        }
        Update: {
          coordinates?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          max_elevation?: number | null
          min_elevation?: number | null
          name?: string
          session_id?: string | null
          total_distance?: number | null
          total_elevation_gain?: number | null
          total_elevation_loss?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          id: string
          joined_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_requests: {
        Row: {
          created_at: string
          id: string
          requester_avatar: string | null
          requester_name: string
          session_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_avatar?: string | null
          requester_name: string
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_avatar?: string | null
          requester_name?: string
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          activity_type: string
          club_id: string | null
          created_at: string
          current_participants: number | null
          description: string | null
          distance_km: number | null
          friends_only: boolean | null
          id: string
          image_url: string | null
          intensity: string | null
          interval_count: number | null
          interval_distance: number | null
          interval_pace: string | null
          is_private: boolean | null
          location_lat: number
          location_lng: number
          location_name: string
          max_participants: number | null
          organizer_id: string
          pace_general: string | null
          route_id: string | null
          scheduled_at: string
          session_type: string
          title: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          club_id?: string | null
          created_at?: string
          current_participants?: number | null
          description?: string | null
          distance_km?: number | null
          friends_only?: boolean | null
          id?: string
          image_url?: string | null
          intensity?: string | null
          interval_count?: number | null
          interval_distance?: number | null
          interval_pace?: string | null
          is_private?: boolean | null
          location_lat: number
          location_lng: number
          location_name: string
          max_participants?: number | null
          organizer_id: string
          pace_general?: string | null
          route_id?: string | null
          scheduled_at: string
          session_type: string
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          club_id?: string | null
          created_at?: string
          current_participants?: number | null
          description?: string | null
          distance_km?: number | null
          friends_only?: boolean | null
          id?: string
          image_url?: string | null
          intensity?: string | null
          interval_count?: number | null
          interval_distance?: number | null
          interval_pace?: string | null
          is_private?: boolean | null
          location_lat?: number
          location_lng?: number
          location_name?: string
          max_participants?: number | null
          organizer_id?: string
          pace_general?: string | null
          route_id?: string | null
          scheduled_at?: string
          session_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          status?: string | null
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      user_scores: {
        Row: {
          created_at: string
          id: string
          last_seasonal_reset: string | null
          last_weekly_reset: string | null
          seasonal_points: number | null
          total_points: number | null
          updated_at: string
          user_id: string
          weekly_points: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_seasonal_reset?: string | null
          last_weekly_reset?: string | null
          seasonal_points?: number | null
          total_points?: number | null
          updated_at?: string
          user_id: string
          weekly_points?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          last_seasonal_reset?: string | null
          last_weekly_reset?: string | null
          seasonal_points?: number | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
          weekly_points?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_club_invitation: {
        Args: { invitation_id: string }
        Returns: boolean
      }
      accept_follow_request: {
        Args: { follow_id: string }
        Returns: boolean
      }
      add_user_points: {
        Args: { points_to_add: number; user_id_param: string }
        Returns: undefined
      }
      are_users_friends: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      can_user_send_message: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      decline_club_invitation: {
        Args: { invitation_id: string }
        Returns: boolean
      }
      generate_club_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_common_clubs: {
        Args: { user_1_id: string; user_2_id: string }
        Returns: {
          club_avatar_url: string
          club_code: string
          club_description: string
          club_id: string
          club_name: string
          created_by: string
        }[]
      }
      get_daily_message_count: {
        Args: { user_id_param: string }
        Returns: number
      }
      get_email_from_username: {
        Args: { username_param: string }
        Returns: string
      }
      get_follower_count: {
        Args: { profile_user_id: string }
        Returns: number
      }
      get_following_count: {
        Args: { profile_user_id: string }
        Returns: number
      }
      get_friend_suggestions: {
        Args: { current_user_id: string; suggestion_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          mutual_friend_names: string[]
          mutual_friends_count: number
          source: string
          user_id: string
          username: string
        }[]
      }
      get_public_profile: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          id: string
          user_id: string
          username: string
        }[]
      }
      get_public_profile_safe: {
        Args: { profile_user_id: string }
        Returns: {
          age: number
          avatar_url: string
          bio: string
          created_at: string
          cycling_records: Json
          display_name: string
          id: string
          is_online: boolean
          is_premium: boolean
          last_seen: string
          running_records: Json
          swimming_records: Json
          triathlon_records: Json
          user_id: string
          username: string
          walking_records: Json
        }[]
      }
      get_safe_public_profile: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          is_online: boolean
          is_premium: boolean
          show_online_status: boolean
          user_id: string
          username: string
        }[]
      }
      get_safe_public_profiles: {
        Args: { profile_user_ids: string[] }
        Returns: {
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          is_online: boolean
          is_premium: boolean
          show_online_status: boolean
          user_id: string
          username: string
        }[]
      }
      get_user_group_conversations: {
        Args: { user_id_param: string }
        Returns: {
          conversation_id: string
        }[]
      }
      get_user_rank: {
        Args: { points: number }
        Returns: string
      }
      increment_daily_message_count: {
        Args: { user_id_param: string }
        Returns: number
      }
      remove_user_points: {
        Args: { points_to_remove: number; user_id_param: string }
        Returns: undefined
      }
      trigger_season_reset: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_push_token: {
        Args: { push_token_param: string; user_id_param: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
