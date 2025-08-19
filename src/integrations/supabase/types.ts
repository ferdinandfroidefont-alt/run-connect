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
      conversations: {
        Row: {
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
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_premium: boolean | null
          is_private: boolean | null
          notifications_enabled: boolean | null
          onboarding_completed: boolean | null
          phone: string | null
          rgpd_accepted: boolean | null
          security_rules_accepted: boolean | null
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_premium?: boolean | null
          is_private?: boolean | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          rgpd_accepted?: boolean | null
          security_rules_accepted?: boolean | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_premium?: boolean | null
          is_private?: boolean | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          rgpd_accepted?: boolean | null
          security_rules_accepted?: boolean | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
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
          created_at: string
          current_participants: number | null
          description: string | null
          friends_only: boolean | null
          id: string
          intensity: string | null
          is_private: boolean | null
          location_lat: number
          location_lng: number
          location_name: string
          max_participants: number | null
          organizer_id: string
          scheduled_at: string
          session_type: string
          title: string
          updated_at: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          current_participants?: number | null
          description?: string | null
          friends_only?: boolean | null
          id?: string
          intensity?: string | null
          is_private?: boolean | null
          location_lat: number
          location_lng: number
          location_name: string
          max_participants?: number | null
          organizer_id: string
          scheduled_at: string
          session_type: string
          title: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          current_participants?: number | null
          description?: string | null
          friends_only?: boolean | null
          id?: string
          intensity?: string | null
          is_private?: boolean | null
          location_lat?: number
          location_lng?: number
          location_name?: string
          max_participants?: number | null
          organizer_id?: string
          scheduled_at?: string
          session_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      get_user_rank: {
        Args: { points: number }
        Returns: string
      }
      remove_user_points: {
        Args: { points_to_remove: number; user_id_param: string }
        Returns: undefined
      }
      trigger_season_reset: {
        Args: Record<PropertyKey, never>
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
