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
          ip_address: unknown
          table_name: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          table_name: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
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
      challenge_history: {
        Row: {
          challenge_id: string
          completed_at: string | null
          id: string
          reward_points: number
          user_id: string
          week_start: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          id?: string
          reward_points: number
          user_id: string
          week_start: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          id?: string
          reward_points?: number
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_history_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          icon: string
          id: string
          reward_points: number
          target_value: number
          title: string
          validation_type: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          reward_points: number
          target_value: number
          title: string
          validation_type: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          reward_points?: number
          target_value?: number
          title?: string
          validation_type?: string
        }
        Relationships: []
      }
      club_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "club_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      club_groups: {
        Row: {
          avatar_url: string | null
          club_id: string
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          avatar_url?: string | null
          club_id: string
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          avatar_url?: string | null
          club_id?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_groups_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
      coaching_drafts: {
        Row: {
          club_id: string
          coach_id: string
          created_at: string
          group_id: string
          id: string
          sent_at: string | null
          sessions: Json
          target_athletes: string[]
          updated_at: string
          week_start: string
        }
        Insert: {
          club_id: string
          coach_id: string
          created_at?: string
          group_id?: string
          id?: string
          sent_at?: string | null
          sessions?: Json
          target_athletes?: string[]
          updated_at?: string
          week_start: string
        }
        Update: {
          club_id?: string
          coach_id?: string
          created_at?: string
          group_id?: string
          id?: string
          sent_at?: string | null
          sessions?: Json
          target_athletes?: string[]
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_drafts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_participations: {
        Row: {
          athlete_note: string | null
          athlete_overrides: Json | null
          coaching_session_id: string
          completed_at: string | null
          created_at: string
          custom_notes: string | null
          custom_pace: string | null
          feedback: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          map_session_id: string | null
          scheduled_at: string | null
          status: string
          suggested_date: string | null
          user_id: string
        }
        Insert: {
          athlete_note?: string | null
          athlete_overrides?: Json | null
          coaching_session_id: string
          completed_at?: string | null
          created_at?: string
          custom_notes?: string | null
          custom_pace?: string | null
          feedback?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          map_session_id?: string | null
          scheduled_at?: string | null
          status?: string
          suggested_date?: string | null
          user_id: string
        }
        Update: {
          athlete_note?: string | null
          athlete_overrides?: Json | null
          coaching_session_id?: string
          completed_at?: string | null
          created_at?: string
          custom_notes?: string | null
          custom_pace?: string | null
          feedback?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          map_session_id?: string | null
          scheduled_at?: string | null
          status?: string
          suggested_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_participations_coaching_session_id_fkey"
            columns: ["coaching_session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_sessions: {
        Row: {
          activity_type: string
          club_id: string
          coach_id: string
          coach_notes: string | null
          created_at: string
          default_location_lat: number | null
          default_location_lng: number | null
          default_location_name: string | null
          description: string | null
          distance_km: number | null
          id: string
          objective: string | null
          pace_target: string | null
          rcc_code: string | null
          rpe: number | null
          scheduled_at: string
          send_mode: string | null
          session_blocks: Json | null
          status: string
          target_athletes: string[] | null
          target_group_id: string | null
          title: string
        }
        Insert: {
          activity_type?: string
          club_id: string
          coach_id: string
          coach_notes?: string | null
          created_at?: string
          default_location_lat?: number | null
          default_location_lng?: number | null
          default_location_name?: string | null
          description?: string | null
          distance_km?: number | null
          id?: string
          objective?: string | null
          pace_target?: string | null
          rcc_code?: string | null
          rpe?: number | null
          scheduled_at: string
          send_mode?: string | null
          session_blocks?: Json | null
          status?: string
          target_athletes?: string[] | null
          target_group_id?: string | null
          title: string
        }
        Update: {
          activity_type?: string
          club_id?: string
          coach_id?: string
          coach_notes?: string | null
          created_at?: string
          default_location_lat?: number | null
          default_location_lng?: number | null
          default_location_name?: string | null
          description?: string | null
          distance_km?: number | null
          id?: string
          objective?: string | null
          pace_target?: string | null
          rcc_code?: string | null
          rpe?: number | null
          scheduled_at?: string
          send_mode?: string | null
          session_blocks?: Json | null
          status?: string
          target_athletes?: string[] | null
          target_group_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_sessions_target_group_id_fkey"
            columns: ["target_group_id"]
            isOneToOne: false
            referencedRelation: "club_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      coaching_templates: {
        Row: {
          activity_type: string | null
          coach_id: string
          created_at: string | null
          id: string
          name: string
          objective: string | null
          rcc_code: string
        }
        Insert: {
          activity_type?: string | null
          coach_id: string
          created_at?: string | null
          id?: string
          name: string
          objective?: string | null
          rcc_code: string
        }
        Update: {
          activity_type?: string | null
          coach_id?: string
          created_at?: string | null
          id?: string
          name?: string
          objective?: string | null
          rcc_code?: string
        }
        Relationships: []
      }
      coaching_week_templates: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          name: string
          sessions: Json
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          name: string
          sessions?: Json
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          name?: string
          sessions?: Json
        }
        Relationships: []
      }
      conversations: {
        Row: {
          club_code: string | null
          coaching_mode: string
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
          coaching_mode?: string
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
          coaching_mode?: string
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
      dismissed_suggestions: {
        Row: {
          created_at: string
          dismissed_user_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_user_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_user_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          conversation_id: string
          id: string
          is_admin: boolean | null
          is_coach: boolean | null
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_admin?: boolean | null
          is_coach?: boolean | null
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_admin?: boolean | null
          is_coach?: boolean | null
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
      live_tracking_points: {
        Row: {
          accuracy: number | null
          id: string
          lat: number
          lng: number
          recorded_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          id?: string
          lat: number
          lng: number
          recorded_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_tracking_points_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
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
          reply_to_id: string | null
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
          reply_to_id?: string | null
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
          reply_to_id?: string | null
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
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
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
      polls: {
        Row: {
          conversation_id: string
          created_at: string
          creator_id: string
          expires_at: string | null
          id: string
          options: Json
          question: string
          session_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          creator_id: string
          expires_at?: string | null
          id?: string
          options?: Json
          question: string
          session_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          creator_id?: string
          expires_at?: string | null
          id?: string
          options?: Json
          question?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_sport_records: {
        Row: {
          created_at: string
          event_label: string
          id: string
          record_value: string
          sort_order: number
          sport_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_label: string
          id?: string
          record_value: string
          sort_order?: number
          sport_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_label?: string
          id?: string
          record_value?: string
          sort_order?: number
          sport_key?: string
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
          country: string | null
          cover_image_url: string | null
          created_at: string
          cycling_records: Json | null
          display_name: string | null
          favorite_sport: string | null
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
          notif_club_invitation: boolean | null
          notif_follow_request: boolean | null
          notif_friend_session: boolean | null
          notif_message: boolean | null
          notif_presence_confirmed: boolean | null
          notif_session_accepted: boolean | null
          notif_session_request: boolean | null
          notifications_enabled: boolean | null
          onboarding_completed: boolean | null
          organizer_avg_rating: number | null
          phone: string | null
          preferred_language: string | null
          push_token: string | null
          push_token_platform: string | null
          push_token_updated_at: string | null
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
          tutorial_completed: boolean | null
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
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          cycling_records?: Json | null
          display_name?: string | null
          favorite_sport?: string | null
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
          notif_club_invitation?: boolean | null
          notif_follow_request?: boolean | null
          notif_friend_session?: boolean | null
          notif_message?: boolean | null
          notif_presence_confirmed?: boolean | null
          notif_session_accepted?: boolean | null
          notif_session_request?: boolean | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          organizer_avg_rating?: number | null
          phone?: string | null
          preferred_language?: string | null
          push_token?: string | null
          push_token_platform?: string | null
          push_token_updated_at?: string | null
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
          tutorial_completed?: boolean | null
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
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          cycling_records?: Json | null
          display_name?: string | null
          favorite_sport?: string | null
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
          notif_club_invitation?: boolean | null
          notif_follow_request?: boolean | null
          notif_friend_session?: boolean | null
          notif_message?: boolean | null
          notif_presence_confirmed?: boolean | null
          notif_session_accepted?: boolean | null
          notif_session_request?: boolean | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          organizer_avg_rating?: number | null
          phone?: string | null
          preferred_language?: string | null
          push_token?: string | null
          push_token_platform?: string | null
          push_token_updated_at?: string | null
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
          tutorial_completed?: boolean | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
          walking_records?: Json | null
          welcome_video_seen?: boolean | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_links: {
        Row: {
          created_at: string | null
          id: string
          last_shared_at: string | null
          share_count: number | null
          unique_code: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_shared_at?: string | null
          share_count?: number | null
          unique_code: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_shared_at?: string | null
          share_count?: number | null
          unique_code?: string
          user_id?: string
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
      restricted_users: {
        Row: {
          created_at: string
          id: string
          restricted_id: string
          restricter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restricted_id: string
          restricter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restricted_id?: string
          restricter_id?: string
        }
        Relationships: []
      }
      route_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          lat: number | null
          lng: number | null
          photo_url: string
          route_id: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          photo_url: string
          route_id: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          photo_url?: string
          route_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_photos_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          route_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          route_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          route_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_ratings_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          activity_type: string | null
          coordinates: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          max_elevation: number | null
          min_elevation: number | null
          name: string
          session_id: string | null
          total_distance: number | null
          total_elevation_gain: number | null
          total_elevation_loss: number | null
          updated_at: string
          waypoints: Json | null
        }
        Insert: {
          activity_type?: string | null
          coordinates: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          max_elevation?: number | null
          min_elevation?: number | null
          name: string
          session_id?: string | null
          total_distance?: number | null
          total_elevation_gain?: number | null
          total_elevation_loss?: number | null
          updated_at?: string
          waypoints?: Json | null
        }
        Update: {
          activity_type?: string | null
          coordinates?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          max_elevation?: number | null
          min_elevation?: number | null
          name?: string
          session_id?: string | null
          total_distance?: number | null
          total_elevation_gain?: number | null
          total_elevation_loss?: number | null
          updated_at?: string
          waypoints?: Json | null
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
      saved_routes: {
        Row: {
          created_at: string
          id: string
          route_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          route_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          route_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_routes_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      score_history: {
        Row: {
          id: string
          rank: number | null
          recorded_at: string
          seasonal_points: number
          total_points: number
          user_id: string
          week_start: string
          weekly_points: number
        }
        Insert: {
          id?: string
          rank?: number | null
          recorded_at?: string
          seasonal_points?: number
          total_points?: number
          user_id: string
          week_start?: string
          weekly_points?: number
        }
        Update: {
          id?: string
          rank?: number | null
          recorded_at?: string
          seasonal_points?: number
          total_points?: number
          user_id?: string
          week_start?: string
          weekly_points?: number
        }
        Relationships: []
      }
      session_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_likes: {
        Row: {
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_likes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          confirmed_by_creator: boolean | null
          confirmed_by_gps: boolean | null
          device_id: string | null
          gps_lat: number | null
          gps_lng: number | null
          gps_validation_time: string | null
          id: string
          joined_at: string
          points_awarded: number | null
          session_id: string
          user_id: string
          validation_status: string | null
        }
        Insert: {
          confirmed_by_creator?: boolean | null
          confirmed_by_gps?: boolean | null
          device_id?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          gps_validation_time?: string | null
          id?: string
          joined_at?: string
          points_awarded?: number | null
          session_id: string
          user_id: string
          validation_status?: string | null
        }
        Update: {
          confirmed_by_creator?: boolean | null
          confirmed_by_gps?: boolean | null
          device_id?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          gps_validation_time?: string | null
          id?: string
          joined_at?: string
          points_awarded?: number | null
          session_id?: string
          user_id?: string
          validation_status?: string | null
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
      session_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          organizer_id: string
          rating: number
          reviewer_id: string
          session_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          organizer_id: string
          rating: number
          reviewer_id: string
          session_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          organizer_id?: string
          rating?: number
          reviewer_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_ratings_session_id_fkey"
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
          calculated_level: number | null
          club_id: string | null
          coaching_session_id: string | null
          created_at: string
          current_participants: number | null
          description: string | null
          distance_km: number | null
          friends_only: boolean | null
          hidden_from_users: string[] | null
          id: string
          image_url: string | null
          intensity: string | null
          interval_count: number | null
          interval_distance: number | null
          interval_pace: string | null
          interval_pace_unit: string | null
          is_private: boolean | null
          live_tracking_active: boolean | null
          live_tracking_enabled: boolean | null
          live_tracking_max_duration: number | null
          live_tracking_started_at: string | null
          location_lat: number
          location_lng: number
          location_name: string
          max_participants: number | null
          organizer_id: string
          pace_general: string | null
          pace_unit: string | null
          route_id: string | null
          scheduled_at: string
          session_blocks: Json | null
          session_mode: string | null
          session_type: string
          title: string
          updated_at: string
          visibility_type: string | null
        }
        Insert: {
          activity_type: string
          calculated_level?: number | null
          club_id?: string | null
          coaching_session_id?: string | null
          created_at?: string
          current_participants?: number | null
          description?: string | null
          distance_km?: number | null
          friends_only?: boolean | null
          hidden_from_users?: string[] | null
          id?: string
          image_url?: string | null
          intensity?: string | null
          interval_count?: number | null
          interval_distance?: number | null
          interval_pace?: string | null
          interval_pace_unit?: string | null
          is_private?: boolean | null
          live_tracking_active?: boolean | null
          live_tracking_enabled?: boolean | null
          live_tracking_max_duration?: number | null
          live_tracking_started_at?: string | null
          location_lat: number
          location_lng: number
          location_name: string
          max_participants?: number | null
          organizer_id: string
          pace_general?: string | null
          pace_unit?: string | null
          route_id?: string | null
          scheduled_at: string
          session_blocks?: Json | null
          session_mode?: string | null
          session_type: string
          title: string
          updated_at?: string
          visibility_type?: string | null
        }
        Update: {
          activity_type?: string
          calculated_level?: number | null
          club_id?: string | null
          coaching_session_id?: string | null
          created_at?: string
          current_participants?: number | null
          description?: string | null
          distance_km?: number | null
          friends_only?: boolean | null
          hidden_from_users?: string[] | null
          id?: string
          image_url?: string | null
          intensity?: string | null
          interval_count?: number | null
          interval_distance?: number | null
          interval_pace?: string | null
          interval_pace_unit?: string | null
          is_private?: boolean | null
          live_tracking_active?: boolean | null
          live_tracking_enabled?: boolean | null
          live_tracking_max_duration?: number | null
          live_tracking_started_at?: string | null
          location_lat?: number
          location_lng?: number
          location_name?: string
          max_participants?: number | null
          organizer_id?: string
          pace_general?: string | null
          pace_unit?: string | null
          route_id?: string | null
          scheduled_at?: string
          session_blocks?: Json | null
          session_mode?: string | null
          session_type?: string
          title?: string
          updated_at?: string
          visibility_type?: string | null
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
            foreignKeyName: "sessions_coaching_session_id_fkey"
            columns: ["coaching_session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
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
          cancel_at_period_end: boolean | null
          created_at: string
          email: string
          id: string
          last_synced_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_status: string | null
          subscription_tier: string | null
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          email: string
          id?: string
          last_synced_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          email?: string
          id?: string
          last_synced_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_description: string | null
          badge_icon: string | null
          badge_id: string
          badge_name: string
          id: string
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_id: string
          badge_name: string
          id?: string
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_id?: string
          badge_name?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_challenges: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          progress: number | null
          status: string | null
          target: number
          updated_at: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          progress?: number | null
          status?: string | null
          target: number
          updated_at?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          progress?: number | null
          status?: string | null
          target?: number
          updated_at?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
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
      user_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          current_value: number
          goal_type: string
          id: string
          period: string
          period_start: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_value?: number
          goal_type: string
          id?: string
          period?: string
          period_start?: string
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_value?: number
          goal_type?: string
          id?: string
          period?: string
          period_start?: string
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      user_stats: {
        Row: {
          created_at: string | null
          id: string
          last_streak_update: string | null
          reliability_rate: number | null
          streak_weeks: number | null
          total_sessions_absent: number | null
          total_sessions_completed: number | null
          total_sessions_joined: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_streak_update?: string | null
          reliability_rate?: number | null
          streak_weeks?: number | null
          total_sessions_absent?: number | null
          total_sessions_completed?: number | null
          total_sessions_joined?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_streak_update?: string | null
          reliability_rate?: number | null
          streak_weeks?: number | null
          total_sessions_absent?: number | null
          total_sessions_completed?: number | null
          total_sessions_joined?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
      accept_follow_request: { Args: { follow_id: string }; Returns: boolean }
      add_user_points:
        | {
            Args: { points_to_add: number; user_id_param: string }
            Returns: undefined
          }
        | {
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
      assign_random_challenge: {
        Args: { p_category: string; p_user_id: string }
        Returns: string
      }
      block_user: { Args: { user_to_block_id: string }; Returns: boolean }
      calculate_and_award_points: {
        Args: { participant_id: string }
        Returns: number
      }
      can_user_send_message: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      check_account_lockout: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      check_and_award_badges: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      check_point_rate_limit: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          action_type_param: string
          max_attempts: number
          time_window_minutes: number
          user_id_param: string
        }
        Returns: boolean
      }
      check_user_exists: { Args: { email_param: string }; Returns: Json }
      cleanup_audit_logs: { Args: never; Returns: number }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      complete_challenge: {
        Args: { p_user_challenge_id: string }
        Returns: undefined
      }
      decline_club_invitation: {
        Args: { invitation_id: string }
        Returns: boolean
      }
      delete_user_data: { Args: { target_user_id: string }; Returns: undefined }
      detect_suspicious_patterns: {
        Args: never
        Returns: {
          details: Json
          reason: string
          user_id: string
        }[]
      }
      encrypt_critical_data: { Args: { data_text: string }; Returns: string }
      force_user_logout: { Args: { target_user_id: string }; Returns: boolean }
      generate_club_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      generate_security_report: { Args: never; Returns: Json }
      get_club_coaching_mode: { Args: { _club_id: string }; Returns: string }
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
          limit_count: number
          offset_count: number
          order_by_column: string
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
      get_current_week_start: { Args: never; Returns: string }
      get_daily_message_count: {
        Args: { user_id_param: string }
        Returns: number
      }
      get_email_from_username: {
        Args: { username_param: string }
        Returns: string
      }
      get_follower_count: { Args: { profile_user_id: string }; Returns: number }
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
      get_leaderboard_total_count: { Args: never; Returns: number }
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
        Args: never
        Returns: {
          alert_type: string
          count: number
          last_occurrence: string
          message: string
          severity: string
        }[]
      }
      get_security_dashboard: {
        Args: never
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
      get_user_rank: { Args: { points: number }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_challenge_progress: {
        Args: {
          p_increment?: number
          p_user_id: string
          p_validation_type: string
        }
        Returns: undefined
      }
      increment_daily_message_count: {
        Args: { user_id_param: string }
        Returns: number
      }
      increment_user_sessions_joined: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      initialize_user_challenges: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_club_coach: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_club_coach_or_creator: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_club_member: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_creator: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_blocked: {
        Args: { blocked_user_id: string; blocker_user_id: string }
        Returns: boolean
      }
      mark_absent_participants: { Args: never; Returns: undefined }
      process_referral: {
        Args: { new_user_id: string; referral_code_param: string }
        Returns: boolean
      }
      record_weekly_score_snapshot: { Args: never; Returns: undefined }
      remove_user_points:
        | {
            Args: { points_to_remove: number; user_id_param: string }
            Returns: undefined
          }
        | {
            Args: { points_to_remove: number; user_id_param: string }
            Returns: undefined
          }
      sanitize_input: { Args: { input_text: string }; Returns: string }
      security_maintenance: { Args: never; Returns: Json }
      trigger_season_reset: { Args: never; Returns: undefined }
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
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
