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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_response_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          function_name: string
          hit_count: number
          id: string
          request_hash: string
          response: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at?: string
          function_name: string
          hit_count?: number
          id?: string
          request_hash: string
          response: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          function_name?: string
          hit_count?: number
          id?: string
          request_hash?: string
          response?: Json
        }
        Relationships: []
      }
      courses: {
        Row: {
          comprehensive_level: string | null
          course_length_preset: string | null
          course_level_order: number | null
          created_at: string
          current_step: string
          id: string
          max_modules: number | null
          outline: Json | null
          parent_course_id: string | null
          presenton_download_url: string | null
          presenton_edit_url: string | null
          presenton_generation_history: Json | null
          presenton_progress: number | null
          presenton_status: string | null
          presenton_task_id: string | null
          selected_title_id: string | null
          settings: Json
          slides_per_module: number | null
          tags: string[] | null
          title: string
          title_suggestions: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comprehensive_level?: string | null
          course_length_preset?: string | null
          course_level_order?: number | null
          created_at?: string
          current_step?: string
          id?: string
          max_modules?: number | null
          outline?: Json | null
          parent_course_id?: string | null
          presenton_download_url?: string | null
          presenton_edit_url?: string | null
          presenton_generation_history?: Json | null
          presenton_progress?: number | null
          presenton_status?: string | null
          presenton_task_id?: string | null
          selected_title_id?: string | null
          settings?: Json
          slides_per_module?: number | null
          tags?: string[] | null
          title: string
          title_suggestions?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comprehensive_level?: string | null
          course_length_preset?: string | null
          course_level_order?: number | null
          created_at?: string
          current_step?: string
          id?: string
          max_modules?: number | null
          outline?: Json | null
          parent_course_id?: string | null
          presenton_download_url?: string | null
          presenton_edit_url?: string | null
          presenton_generation_history?: Json | null
          presenton_progress?: number | null
          presenton_status?: string | null
          presenton_task_id?: string | null
          selected_title_id?: string | null
          settings?: Json
          slides_per_module?: number | null
          tags?: string[] | null
          title?: string
          title_suggestions?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_parent_course_id_fkey"
            columns: ["parent_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          created_at: string
          credentials: Json
          id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials?: Json
          id?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learndash_credentials: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          wp_app_password: string
          wp_url: string
          wp_username: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          wp_app_password: string
          wp_url: string
          wp_username: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          wp_app_password?: string
          wp_url?: string
          wp_username?: string
        }
        Relationships: []
      }
      module_exercises: {
        Row: {
          course_id: string
          created_at: string
          exercises: Json
          id: string
          module_id: string
          module_title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          exercises?: Json
          id?: string
          module_id: string
          module_title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          exercises?: Json
          id?: string
          module_id?: string
          module_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_exercises_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      module_quizzes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          module_id: string
          module_title: string
          questions: Json
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          module_id: string
          module_title: string
          questions?: Json
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          module_id?: string
          module_title?: string
          questions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      module_scripts: {
        Row: {
          audio_url: string | null
          content: Json
          course_id: string
          created_at: string
          id: string
          module_id: string
          module_title: string
          updated_at: string
          voice_id: string | null
        }
        Insert: {
          audio_url?: string | null
          content?: Json
          course_id: string
          created_at?: string
          id?: string
          module_id: string
          module_title: string
          updated_at?: string
          voice_id?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: Json
          course_id?: string
          created_at?: string
          id?: string
          module_id?: string
          module_title?: string
          updated_at?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_scripts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      slides: {
        Row: {
          background_color: string | null
          content: string | null
          course_id: string
          created_at: string
          id: string
          image_attribution: string | null
          image_source: string | null
          image_url: string | null
          layout: string
          module_id: string
          slide_number: number
          speaker_notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          content?: string | null
          course_id: string
          created_at?: string
          id?: string
          image_attribution?: string | null
          image_source?: string | null
          image_url?: string | null
          layout?: string
          module_id: string
          slide_number: number
          speaker_notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          content?: string | null
          course_id?: string
          created_at?: string
          id?: string
          image_attribution?: string | null
          image_source?: string | null
          image_url?: string | null
          layout?: string
          module_id?: string
          slide_number?: number
          speaker_notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slides_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_provider_settings: {
        Row: {
          api_key: string | null
          api_secret: string | null
          created_at: string
          id: string
          is_enabled: boolean
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string | null
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string | null
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_expired_ai_cache: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_owner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "admin" | "editor" | "viewer"
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
      app_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
