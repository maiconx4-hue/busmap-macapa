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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          description: string
          icon: string
          metric: string
          name: string
          sort: number
          threshold: number
        }
        Insert: {
          code: string
          description: string
          icon?: string
          metric: string
          name: string
          sort?: number
          threshold: number
        }
        Update: {
          code?: string
          description?: string
          icon?: string
          metric?: string
          name?: string
          sort?: number
          threshold?: number
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      anon_devices: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          id: string
          secret_hash: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          secret_hash: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          secret_hash?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      contributions: {
        Row: {
          avg_accuracy: number | null
          created_at: string
          device_id: string | null
          duration_seconds: number
          ended_at: string
          id: string
          n_points: number
          reason: string | null
          route_id: string | null
          session_id: string
          started_at: string
          status: string
          user_id: string | null
          xp_awarded: number
        }
        Insert: {
          avg_accuracy?: number | null
          created_at?: string
          device_id?: string | null
          duration_seconds: number
          ended_at: string
          id?: string
          n_points: number
          reason?: string | null
          route_id?: string | null
          session_id: string
          started_at: string
          status: string
          user_id?: string | null
          xp_awarded?: number
        }
        Update: {
          avg_accuracy?: number | null
          created_at?: string
          device_id?: string | null
          duration_seconds?: number
          ended_at?: string
          id?: string
          n_points?: number
          reason?: string | null
          route_id?: string | null
          session_id?: string
          started_at?: string
          status?: string
          user_id?: string | null
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "contributions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      live_positions: {
        Row: {
          accuracy: number | null
          contributor_kind: string
          heading: number | null
          lat: number
          lng: number
          nickname: string | null
          public_id: string
          route_id: string | null
          started_at: string
          tier: string
          updated_at: string
          valid_sessions: number | null
          validation: string
          xp: number | null
        }
        Insert: {
          accuracy?: number | null
          contributor_kind: string
          heading?: number | null
          lat: number
          lng: number
          nickname?: string | null
          public_id: string
          route_id?: string | null
          started_at?: string
          tier?: string
          updated_at?: string
          valid_sessions?: number | null
          validation?: string
          xp?: number | null
        }
        Update: {
          accuracy?: number | null
          contributor_kind?: string
          heading?: number | null
          lat?: number
          lng?: number
          nickname?: string | null
          public_id?: string
          route_id?: string | null
          started_at?: string
          tier?: string
          updated_at?: string
          valid_sessions?: number | null
          validation?: string
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_positions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      location_sessions: {
        Row: {
          device_id: string
          ended_at: string | null
          id: string
          last_lat: number | null
          last_lng: number | null
          last_update_at: string | null
          live_public_id: string
          n_points: number
          n_rejected: number
          route_id: string | null
          started_at: string
          status: string
          sum_accuracy: number
          token_hash: string
          user_id: string | null
        }
        Insert: {
          device_id: string
          ended_at?: string | null
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_update_at?: string | null
          live_public_id?: string
          n_points?: number
          n_rejected?: number
          route_id?: string | null
          started_at?: string
          status?: string
          sum_accuracy?: number
          token_hash: string
          user_id?: string | null
        }
        Update: {
          device_id?: string
          ended_at?: string | null
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_update_at?: string | null
          live_public_id?: string
          n_points?: number
          n_rejected?: number
          route_id?: string | null
          started_at?: string
          status?: string
          sum_accuracy?: number
          token_hash?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "anon_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_sessions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      location_updates: {
        Row: {
          accepted: boolean
          accuracy: number | null
          id: number
          lat: number
          lng: number
          reason: string | null
          recorded_at: string
          session_id: string
          speed: number | null
        }
        Insert: {
          accepted: boolean
          accuracy?: number | null
          id?: number
          lat: number
          lng: number
          reason?: string | null
          recorded_at?: string
          session_id: string
          speed?: number | null
        }
        Update: {
          accepted?: boolean
          accuracy?: number | null
          id?: number
          lat?: number
          lng?: number
          reason?: string | null
          recorded_at?: string
          session_id?: string
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "location_updates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "location_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nickname: string | null
          show_on_map: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          nickname?: string | null
          show_on_map?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nickname?: string | null
          show_on_map?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      routes: {
        Row: {
          active: boolean
          code: string
          color: string
          created_at: string
          created_by: string | null
          creation_method: string
          description: string | null
          destination_lat: number | null
          destination_lng: number | null
          destination_name: string | null
          direction: string
          distance_m: number | null
          geometry: Json
          id: string
          name: string
          origin_lat: number | null
          origin_lng: number | null
          origin_name: string | null
          published: boolean
          updated_at: string
          waypoints: Json
        }
        Insert: {
          active?: boolean
          code: string
          color?: string
          created_at?: string
          created_by?: string | null
          creation_method: string
          description?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          direction?: string
          distance_m?: number | null
          geometry?: Json
          id?: string
          name: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_name?: string | null
          published?: boolean
          updated_at?: string
          waypoints?: Json
        }
        Update: {
          active?: boolean
          code?: string
          color?: string
          created_at?: string
          created_by?: string | null
          creation_method?: string
          description?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          direction?: string
          distance_m?: number | null
          geometry?: Json
          id?: string
          name?: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_name?: string | null
          published?: boolean
          updated_at?: string
          waypoints?: Json
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_code: string
          earned_at: string
          user_id: string
        }
        Insert: {
          achievement_code: string
          earned_at?: string
          user_id: string
        }
        Update: {
          achievement_code?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_code_fkey"
            columns: ["achievement_code"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["code"]
          },
        ]
      }
      user_progress: {
        Row: {
          active_days: number
          first_contribution_at: string | null
          tier: string
          total_seconds: number
          updated_at: string
          user_id: string
          valid_sessions: number
          xp: number
        }
        Insert: {
          active_days?: number
          first_contribution_at?: string | null
          tier?: string
          total_seconds?: number
          updated_at?: string
          user_id: string
          valid_sessions?: number
          xp?: number
        }
        Update: {
          active_days?: number
          first_contribution_at?: string | null
          tier?: string
          total_seconds?: number
          updated_at?: string
          user_id?: string
          valid_sessions?: number
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_email_eligible: {
        Args: { _confirmed_at: string; _email: string }
        Returns: boolean
      }
      admin_stats: { Args: never; Returns: Json }
      claim_device: { Args: { _device_secret: string }; Returns: Json }
      cleanup_stale: { Args: never; Returns: undefined }
      compute_tier: {
        Args: { _days: number; _sessions: number; _xp: number }
        Returns: string
      }
      device_summary: { Args: { _device_secret: string }; Returns: Json }
      end_session: {
        Args: { _session_id: string; _token: string }
        Returns: Json
      }
      ensure_device: { Args: { _secret: string }; Returns: string }
      finalize_session: {
        Args: { _final_status: string; _sid: string }
        Returns: undefined
      }
      hash_secret: { Args: { _s: string }; Returns: string }
      haversine_m: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      prepare_account_deletion: { Args: never; Returns: undefined }
      push_location: {
        Args: {
          _accuracy: number
          _heading: number
          _lat: number
          _lng: number
          _session_id: string
          _token: string
        }
        Returns: Json
      }
      recompute_progress: { Args: { _user: string }; Returns: undefined }
      setting_num: { Args: { _key: string }; Returns: number }
      start_session: {
        Args: { _device_secret: string; _route_id: string }
        Returns: Json
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
