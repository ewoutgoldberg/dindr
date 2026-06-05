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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      creator_followers: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_social_connections: {
        Row: {
          access_token: string | null
          connected_at: string
          created_at: string
          creator_id: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          platform: string
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          scope: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string
          created_at?: string
          creator_id: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          platform: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          scope?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string
          created_at?: string
          creator_id?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          platform?: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          scope?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_social_connections_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "food_creators"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      food_creators: {
        Row: {
          avatar_url: string | null
          badge_new: boolean
          bio: string | null
          claim_token: string | null
          claimed_at: string | null
          cover_url: string | null
          created_at: string
          handle: string
          id: string
          instagram_url: string | null
          invited_at: string | null
          location: string | null
          name: string
          specialty: string | null
          status: string
          story: string | null
          tiktok_url: string | null
          updated_at: string
          user_id: string | null
          verified_at: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          badge_new?: boolean
          bio?: string | null
          claim_token?: string | null
          claimed_at?: string | null
          cover_url?: string | null
          created_at?: string
          handle: string
          id?: string
          instagram_url?: string | null
          invited_at?: string | null
          location?: string | null
          name: string
          specialty?: string | null
          status?: string
          story?: string | null
          tiktok_url?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          badge_new?: boolean
          bio?: string | null
          claim_token?: string | null
          claimed_at?: string | null
          cover_url?: string | null
          created_at?: string
          handle?: string
          id?: string
          instagram_url?: string | null
          invited_at?: string | null
          location?: string | null
          name?: string
          specialty?: string | null
          status?: string
          story?: string | null
          tiktok_url?: string | null
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          allergies: string[]
          categories: string[] | null
          created_at: string
          creator_id: string | null
          difficulty: string | null
          final_recipe_id: string | null
          id: string
          max_time_minutes: number | null
          meal_type: string | null
          plan_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string[]
          categories?: string[] | null
          created_at?: string
          creator_id?: string | null
          difficulty?: string | null
          final_recipe_id?: string | null
          id?: string
          max_time_minutes?: number | null
          meal_type?: string | null
          plan_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string[]
          categories?: string[] | null
          created_at?: string
          creator_id?: string | null
          difficulty?: string | null
          final_recipe_id?: string | null
          id?: string
          max_time_minutes?: number | null
          meal_type?: string | null
          plan_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "food_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_final_recipe_id_fkey"
            columns: ["final_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          plan_date: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          plan_date?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          plan_date?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      partnerships: {
        Row: {
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          invite_code: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          invite_code?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          invite_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recipe_shares: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          recipe_id: string
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          recipe_id: string
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      recipe_views: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      recipes: {
        Row: {
          archived: boolean
          card_assets_generated_at: string | null
          category: string
          content_source: string
          cooking_time_minutes: number
          created_at: string
          creator: string | null
          creator_approved: boolean
          creator_id: string | null
          cuisine: string | null
          description: string | null
          difficulty: string
          id: string
          image_url: string | null
          ingredients: Json
          instructions: Json
          meal_type: string | null
          nutrition: Json | null
          published: boolean
          servings: number
          step_images: Json
          subtitle: string | null
          title: string
        }
        Insert: {
          archived?: boolean
          card_assets_generated_at?: string | null
          category: string
          content_source?: string
          cooking_time_minutes: number
          created_at?: string
          creator?: string | null
          creator_approved?: boolean
          creator_id?: string | null
          cuisine?: string | null
          description?: string | null
          difficulty: string
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          meal_type?: string | null
          nutrition?: Json | null
          published?: boolean
          servings?: number
          step_images?: Json
          subtitle?: string | null
          title: string
        }
        Update: {
          archived?: boolean
          card_assets_generated_at?: string | null
          category?: string
          content_source?: string
          cooking_time_minutes?: number
          created_at?: string
          creator?: string | null
          creator_approved?: boolean
          creator_id?: string | null
          cuisine?: string | null
          description?: string | null
          difficulty?: string
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          meal_type?: string | null
          nutrition?: Json | null
          published?: boolean
          servings?: number
          step_images?: Json
          subtitle?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "food_creators"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          recipe_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          recipe_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          recipe_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          checked: boolean
          created_at: string
          id: string
          name: string
          quantity: string | null
          recipe_id: string | null
          user_id: string
        }
        Insert: {
          checked?: boolean
          created_at?: string
          id?: string
          name: string
          quantity?: string | null
          recipe_id?: string | null
          user_id: string
        }
        Update: {
          checked?: boolean
          created_at?: string
          id?: string
          name?: string
          quantity?: string | null
          recipe_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          caption: string | null
          created_at: string
          creator_id: string
          external_id: string
          id: string
          media_type: string
          media_url: string | null
          platform: string
          post_url: string | null
          posted_at: string | null
          thumbnail_url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          creator_id: string
          external_id: string
          id?: string
          media_type: string
          media_url?: string | null
          platform: string
          post_url?: string | null
          posted_at?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          creator_id?: string
          external_id?: string
          id?: string
          media_type?: string
          media_url?: string | null
          platform?: string
          post_url?: string | null
          posted_at?: string | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "food_creators"
            referencedColumns: ["id"]
          },
        ]
      }
      social_sync_logs: {
        Row: {
          connection_id: string | null
          created_at: string
          creator_id: string | null
          error_message: string | null
          id: string
          platform: string | null
          posts_added: number
          status: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          creator_id?: string | null
          error_message?: string | null
          id?: string
          platform?: string | null
          posts_added?: number
          status: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          creator_id?: string | null
          error_message?: string | null
          id?: string
          platform?: string | null
          posts_added?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "creator_social_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_sync_logs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "food_creators"
            referencedColumns: ["id"]
          },
        ]
      }
      swipes: {
        Row: {
          created_at: string
          id: string
          liked: boolean
          plan_date: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          liked: boolean
          plan_date: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          liked?: boolean
          plan_date?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_creator: {
        Args: { _token: string }
        Returns: {
          avatar_url: string | null
          badge_new: boolean
          bio: string | null
          claim_token: string | null
          claimed_at: string | null
          cover_url: string | null
          created_at: string
          handle: string
          id: string
          instagram_url: string | null
          invited_at: string | null
          location: string | null
          name: string
          specialty: string | null
          status: string
          story: string | null
          tiktok_url: string | null
          updated_at: string
          user_id: string | null
          verified_at: string | null
          website_url: string | null
          youtube_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "food_creators"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      connect_partner_by_code: {
        Args: { _invite_code: string }
        Returns: {
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        SetofOptions: {
          from: "*"
          to: "partnerships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_invite_code: { Args: never; Returns: string }
      get_creator_by_claim_token: {
        Args: { _token: string }
        Returns: {
          avatar_url: string | null
          badge_new: boolean
          bio: string | null
          claim_token: string | null
          claimed_at: string | null
          cover_url: string | null
          created_at: string
          handle: string
          id: string
          instagram_url: string | null
          invited_at: string | null
          location: string | null
          name: string
          specialty: string | null
          status: string
          story: string | null
          tiktok_url: string | null
          updated_at: string
          user_id: string | null
          verified_at: string | null
          website_url: string | null
          youtube_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "food_creators"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_creator_claim_token: {
        Args: { _creator_id: string }
        Returns: string
      }
      get_partner: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
