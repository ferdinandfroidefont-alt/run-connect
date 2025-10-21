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
      audit_log: {
        Row: {
          action: string
          details: Json | null
          id: string
          ip_address: unknown | null
          table_name: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          table_name: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          table_name?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
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
          is_private: boolean | null
          location: string | null
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
          is_private?: boolean | null
          location?: string | null
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
          is_private?: boolean | null
          location?: string | null
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
          deleted_at: string | null
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
          deleted_at?: string | null
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
          deleted_at?: string | null
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
      notification_logs: {
        Row: {
          created_at: string | null
          fcm_error: string | null
          fcm_response: Json | null
          fcm_success: boolean | null
          id: string
          notification_id: string | null
          push_token: string | null
          sent_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          fcm_error?: string | null
          fcm_response?: Json | null
          fcm_success?: boolean | null
          id?: string
          notification_id?: string | null
          push_token?: string | null
          sent_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          fcm_error?: string | null
          fcm_response?: Json | null
          fcm_success?: boolean | null
          id?: string
          notification_id?: string | null
          push_token?: string | null
          sent_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
          avatar_model_id: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          cycling_records: Json | null
          display_name: string | null
          id: string
          instagram_access_token: string | null
          instagram_connected: boolean | null
          instagram_user_id: string | null
          instagram_username: string | null
          instagram_verified_at: string | null
          is_admin: boolean | null
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
          push_token_platform: string | null
          referral_code: string | null
          rgpd_accepted: boolean | null
          rpm_avatar_url: string | null
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
          welcome_video_seen: boolean | null
        }
        Insert: {
          age?: number | null
          allow_friend_suggestions?: boolean | null
          avatar_model_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          cycling_records?: Json | null
          display_name?: string | null
          id?: string
          instagram_access_token?: string | null
          instagram_connected?: boolean | null
          instagram_user_id?: string | null
          instagram_username?: string | null
          instagram_verified_at?: string | null
          is_admin?: boolean | null
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
          push_token_platform?: string | null
          referral_code?: string | null
          rgpd_accepted?: boolean | null
          rpm_avatar_url?: string | null
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
          welcome_video_seen?: boolean | null
        }
        Update: {
          age?: number | null
          allow_friend_suggestions?: boolean | null
          avatar_model_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          cycling_records?: Json | null
          display_name?: string | null
          id?: string
          instagram_access_token?: string | null
          instagram_connected?: boolean | null
          instagram_user_id?: string | null
          instagram_username?: string | null
          instagram_verified_at?: string | null
          is_admin?: boolean | null
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
          push_token_platform?: string | null
          referral_code?: string | null
          rgpd_accepted?: boolean | null
          rpm_avatar_url?: string | null
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
          welcome_video_seen?: boolean | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_given: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_given?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_given?: boolean | null
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
          interval_pace_unit: string | null
          is_private: boolean | null
          location_lat: number
          location_lng: number
          location_name: string
          max_participants: number | null
          organizer_id: string
          pace_general: string | null
          pace_unit: string | null
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
          interval_pace_unit?: string | null
          is_private?: boolean | null
          location_lat: number
          location_lng: number
          location_name: string
          max_participants?: number | null
          organizer_id: string
          pace_general?: string | null
          pace_unit?: string | null
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
          interval_pace_unit?: string | null
          is_private?: boolean | null
          location_lat?: number
          location_lng?: number
          location_name?: string
          max_participants?: number | null
          organizer_id?: string
          pace_general?: string | null
          pace_unit?: string | null
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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
      user_wardrobe: {
        Row: {
          id: string
          is_equipped: boolean | null
          item_id: string
          item_type: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_equipped?: boolean | null
          item_id: string
          item_type: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_equipped?: boolean | null
          item_id?: string
          item_type?: string
          unlocked_at?: string
          user_id?: string
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
      anonymize_user_data: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      are_users_friends: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      block_user: {
        Args: { user_to_block_id: string }
        Returns: boolean
      }
      can_user_send_message: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      check_account_lockout: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          action_type: string
          max_attempts: number
          time_window_minutes: number
          user_id_param: string
        }
        Returns: boolean
      }
      cleanup_audit_logs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      decline_club_invitation: {
        Args: { invitation_id: string }
        Returns: boolean
      }
      delete_user_data: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      encrypt_critical_data: {
        Args: { data_text: string }
        Returns: string
      }
      force_user_logout: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      generate_club_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_security_report: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      get_complete_leaderboard: {
        Args: {
          limit_count?: number
          offset_count?: number
          order_by_column?: string
        }
        Returns: {
          avatar_url: string
          display_name: string
          is_premium: boolean
          seasonal_points: number
          total_points: number
          user_id: string
          username: string
          weekly_points: number
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
      get_friend_suggestions_prioritized: {
        Args: { current_user_id: string; suggestion_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          mutual_friend_names: string[]
          mutual_friends_count: number
          priority_order: number
          source: string
          user_id: string
          username: string
        }[]
      }
      get_leaderboard_total_count: {
        Args: Record<PropertyKey, never>
        Returns: number
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
      get_referral_stats: {
        Args: { user_id_param: string }
        Returns: {
          referral_code: string
          total_referrals: number
          total_rewards: number
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
      get_security_alerts: {
        Args: Record<PropertyKey, never>
        Returns: {
          alert_type: string
          count: number
          last_occurrence: string
          message: string
          severity: string
        }[]
      }
      get_security_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          access_count: number
          action: string
          date: string
          table_name: string
          unique_users: number
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
      is_user_blocked: {
        Args: { blocked_user_id: string; blocker_user_id: string }
        Returns: boolean
      }
      process_referral: {
        Args: { new_user_id: string; referral_code_param: string }
        Returns: boolean
      }
      remove_user_points: {
        Args: { points_to_remove: number; user_id_param: string }
        Returns: undefined
      }
      sanitize_input: {
        Args: { input_text: string }
        Returns: string
      }
      security_maintenance: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      trigger_season_reset: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_push_token: {
        Args: { push_token_param: string; user_id_param: string }
        Returns: undefined
      }
      validate_sensitive_data_access: {
        Args: { table_name_param: string; user_id_param: string }
        Returns: boolean
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
