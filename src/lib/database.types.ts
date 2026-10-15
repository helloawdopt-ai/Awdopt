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
      adopters: {
        Row: {
          activity_level: Database["public"]["Enums"]["energy_level"]
          adopt_reason: string | null
          age: number
          city: string
          consent_at: string
          created_at: string
          daily_time: Database["public"]["Enums"]["daily_time"]
          email: string | null
          experience: Database["public"]["Enums"]["experience_level"]
          has_cats: boolean
          has_children_under_12: boolean
          has_dogs: boolean
          home_type: Database["public"]["Enums"]["home_type"]
          hours_alone: number
          household: Database["public"]["Enums"]["household"]
          id: string
          name: string
          open_to_senior: boolean
          open_to_special_needs: boolean
          phone: string
          pref_ages: Database["public"]["Enums"]["age_band"][]
          pref_breed: Database["public"]["Enums"]["breed_preference"]
          pref_energy: Database["public"]["Enums"]["energy_level"][]
          pref_sizes: Database["public"]["Enums"]["dog_size"][]
          results_token_hash: string
          timeline: Database["public"]["Enums"]["adoption_timeline"]
          token_expires_at: string
        }
        Insert: {
          activity_level: Database["public"]["Enums"]["energy_level"]
          adopt_reason?: string | null
          age: number
          city: string
          consent_at: string
          created_at?: string
          daily_time: Database["public"]["Enums"]["daily_time"]
          email?: string | null
          experience: Database["public"]["Enums"]["experience_level"]
          has_cats: boolean
          has_children_under_12: boolean
          has_dogs: boolean
          home_type: Database["public"]["Enums"]["home_type"]
          hours_alone: number
          household: Database["public"]["Enums"]["household"]
          id?: string
          name: string
          open_to_senior: boolean
          open_to_special_needs: boolean
          phone: string
          pref_ages?: Database["public"]["Enums"]["age_band"][]
          pref_breed?: Database["public"]["Enums"]["breed_preference"]
          pref_energy?: Database["public"]["Enums"]["energy_level"][]
          pref_sizes?: Database["public"]["Enums"]["dog_size"][]
          results_token_hash: string
          timeline: Database["public"]["Enums"]["adoption_timeline"]
          token_expires_at: string
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["energy_level"]
          adopt_reason?: string | null
          age?: number
          city?: string
          consent_at?: string
          created_at?: string
          daily_time?: Database["public"]["Enums"]["daily_time"]
          email?: string | null
          experience?: Database["public"]["Enums"]["experience_level"]
          has_cats?: boolean
          has_children_under_12?: boolean
          has_dogs?: boolean
          home_type?: Database["public"]["Enums"]["home_type"]
          hours_alone?: number
          household?: Database["public"]["Enums"]["household"]
          id?: string
          name?: string
          open_to_senior?: boolean
          open_to_special_needs?: boolean
          phone?: string
          pref_ages?: Database["public"]["Enums"]["age_band"][]
          pref_breed?: Database["public"]["Enums"]["breed_preference"]
          pref_energy?: Database["public"]["Enums"]["energy_level"][]
          pref_sizes?: Database["public"]["Enums"]["dog_size"][]
          results_token_hash?: string
          timeline?: Database["public"]["Enums"]["adoption_timeline"]
          token_expires_at?: string
        }
        Relationships: []
      }
      dog_photos: {
        Row: {
          created_at: string
          dog_id: string
          height: number
          id: string
          path_1600: string
          path_480: string
          path_960: string
          position: number
          width: number
        }
        Insert: {
          created_at?: string
          dog_id: string
          height: number
          id?: string
          path_1600: string
          path_480: string
          path_960: string
          position: number
          width: number
        }
        Update: {
          created_at?: string
          dog_id?: string
          height?: number
          id?: string
          path_1600?: string
          path_480?: string
          path_960?: string
          position?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "dog_photos_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dogs: {
        Row: {
          admin_notes: string | null
          age_months: number | null
          alone_max_hours: number | null
          approved_at: string | null
          breed: string | null
          city: string
          created_at: string
          energy: Database["public"]["Enums"]["energy_level"] | null
          good_with_cats: boolean | null
          good_with_children: boolean | null
          good_with_dogs: boolean | null
          handling: Database["public"]["Enums"]["handling_level"] | null
          id: string
          lister_id: string
          locality: string
          medical_needs: boolean | null
          medical_notes: string | null
          name: string
          needs_large_space: boolean | null
          other_info: string | null
          rehoming_reason: string | null
          sex: Database["public"]["Enums"]["dog_sex"] | null
          size: Database["public"]["Enums"]["dog_size"] | null
          slug: string
          status: Database["public"]["Enums"]["dog_status"]
          sterilised: boolean | null
          story: string | null
          temperament: string | null
          updated_at: string
          urgent: boolean
          vaccination: Database["public"]["Enums"]["vaccination_status"] | null
          video_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          age_months?: number | null
          alone_max_hours?: number | null
          approved_at?: string | null
          breed?: string | null
          city?: string
          created_at?: string
          energy?: Database["public"]["Enums"]["energy_level"] | null
          good_with_cats?: boolean | null
          good_with_children?: boolean | null
          good_with_dogs?: boolean | null
          handling?: Database["public"]["Enums"]["handling_level"] | null
          id?: string
          lister_id: string
          locality: string
          medical_needs?: boolean | null
          medical_notes?: string | null
          name: string
          needs_large_space?: boolean | null
          other_info?: string | null
          rehoming_reason?: string | null
          sex?: Database["public"]["Enums"]["dog_sex"] | null
          size?: Database["public"]["Enums"]["dog_size"] | null
          slug: string
          status?: Database["public"]["Enums"]["dog_status"]
          sterilised?: boolean | null
          story?: string | null
          temperament?: string | null
          updated_at?: string
          urgent?: boolean
          vaccination?: Database["public"]["Enums"]["vaccination_status"] | null
          video_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          age_months?: number | null
          alone_max_hours?: number | null
          approved_at?: string | null
          breed?: string | null
          city?: string
          created_at?: string
          energy?: Database["public"]["Enums"]["energy_level"] | null
          good_with_cats?: boolean | null
          good_with_children?: boolean | null
          good_with_dogs?: boolean | null
          handling?: Database["public"]["Enums"]["handling_level"] | null
          id?: string
          lister_id?: string
          locality?: string
          medical_needs?: boolean | null
          medical_notes?: string | null
          name?: string
          needs_large_space?: boolean | null
          other_info?: string | null
          rehoming_reason?: string | null
          sex?: Database["public"]["Enums"]["dog_sex"] | null
          size?: Database["public"]["Enums"]["dog_size"] | null
          slug?: string
          status?: Database["public"]["Enums"]["dog_status"]
          sterilised?: boolean | null
          story?: string | null
          temperament?: string | null
          updated_at?: string
          urgent?: boolean
          vaccination?: Database["public"]["Enums"]["vaccination_status"] | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dogs_lister_id_fkey"
            columns: ["lister_id"]
            isOneToOne: false
            referencedRelation: "listers"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiries: {
        Row: {
          adopter_id: string
          category_scores: Json
          confidence: number
          consent_at: string
          created_at: string
          dog_id: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string
          reason: string | null
          score: number
          status: Database["public"]["Enums"]["enquiry_status"]
          updated_at: string
          weights: Json
        }
        Insert: {
          adopter_id: string
          category_scores: Json
          confidence: number
          consent_at: string
          created_at?: string
          dog_id: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone: string
          reason?: string | null
          score: number
          status?: Database["public"]["Enums"]["enquiry_status"]
          updated_at?: string
          weights: Json
        }
        Update: {
          adopter_id?: string
          category_scores?: Json
          confidence?: number
          consent_at?: string
          created_at?: string
          dog_id?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string
          reason?: string | null
          score?: number
          status?: Database["public"]["Enums"]["enquiry_status"]
          updated_at?: string
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_adopter_id_fkey"
            columns: ["adopter_id"]
            isOneToOne: false
            referencedRelation: "adopters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      hard_constraints: {
        Row: {
          description: string
          enabled: boolean
          key: string
        }
        Insert: {
          description: string
          enabled?: boolean
          key: string
        }
        Update: {
          description?: string
          enabled?: boolean
          key?: string
        }
        Relationships: []
      }
      listers: {
        Row: {
          consent_at: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          relationship: Database["public"]["Enums"]["lister_relationship"]
        }
        Insert: {
          consent_at: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          relationship: Database["public"]["Enums"]["lister_relationship"]
        }
        Update: {
          consent_at?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          relationship?: Database["public"]["Enums"]["lister_relationship"]
        }
        Relationships: []
      }
      match_weights: {
        Row: {
          category: Database["public"]["Enums"]["match_category"]
          updated_at: string
          weight: number
        }
        Insert: {
          category: Database["public"]["Enums"]["match_category"]
          updated_at?: string
          weight: number
        }
        Update: {
          category?: Database["public"]["Enums"]["match_category"]
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: Database["public"]["Enums"]["rate_limit_action"]
          created_at: string
          id: number
          ip_hash: string
        }
        Insert: {
          action: Database["public"]["Enums"]["rate_limit_action"]
          created_at?: string
          id?: never
          ip_hash: string
        }
        Update: {
          action?: Database["public"]["Enums"]["rate_limit_action"]
          created_at?: string
          id?: never
          ip_hash?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      hit_rate_limit: {
        Args: {
          p_action: Database["public"]["Enums"]["rate_limit_action"]
          p_ip_hash: string
          p_max: number
          p_window: string
        }
        Returns: boolean
      }
      public_dogs: {
        Args: never
        Returns: {
          age_months: number
          alone_max_hours: number
          breed: string
          city: string
          created_at: string
          energy: Database["public"]["Enums"]["energy_level"]
          good_with_cats: boolean
          good_with_children: boolean
          good_with_dogs: boolean
          handling: Database["public"]["Enums"]["handling_level"]
          id: string
          locality: string
          medical_needs: boolean
          medical_notes: string
          name: string
          needs_large_space: boolean
          other_info: string
          photos: Json
          rehoming_reason: string
          sex: Database["public"]["Enums"]["dog_sex"]
          size: Database["public"]["Enums"]["dog_size"]
          slug: string
          sterilised: boolean
          story: string
          temperament: string
          urgent: boolean
          vaccination: Database["public"]["Enums"]["vaccination_status"]
          video_url: string
        }[]
      }
      results_for_token: {
        Args: { p_slug?: string; p_token_hash: string }
        Returns: Json
      }
      score_dogs_for_adopter: {
        Args: { p_adopter_id: string }
        Returns: {
          categories: Json
          confidence: number
          consider: string[]
          dog_id: string
          excluded_by: string[]
          rank: number
          score: number
          why: string[]
        }[]
      }
      submit_enquiry: { Args: { p: Json; p_token_hash: string }; Returns: string }
      submit_listing: { Args: { p: Json }; Returns: Json }
      submit_questionnaire: {
        Args: { p: Json; p_token_hash: string }
        Returns: string
      }
    }
    Enums: {
      adoption_timeline:
        | "asap"
        | "within_month"
        | "within_3_months"
        | "exploring"
      age_band: "puppy" | "young" | "adult" | "senior"
      breed_preference: "indie" | "pedigree" | "any"
      daily_time: "under_1h" | "1_to_2h" | "2_to_4h" | "over_4h"
      dog_sex: "male" | "female"
      dog_size: "small" | "medium" | "large"
      dog_status: "pending" | "approved" | "adopted" | "removed"
      energy_level: "low" | "medium" | "high"
      enquiry_status:
        | "interested"
        | "contacted"
        | "meeting"
        | "rejected"
        | "adoption_in_progress"
        | "adopted"
        | "adoption_unsuccessful"
        | "follow_up_required"
      experience_level: "first_time" | "some" | "experienced"
      handling_level: "easy" | "moderate" | "experienced_only"
      home_type:
        | "apartment_no_balcony"
        | "apartment_balcony"
        | "independent_house"
        | "house_with_garden"
      household: "alone" | "partner" | "family" | "flatmates"
      lister_relationship:
        | "owner"
        | "rescuer"
        | "foster"
        | "shelter_ngo"
        | "helper"
      match_category:
        | "lifestyle"
        | "living"
        | "time"
        | "household"
        | "experience"
        | "size"
        | "age"
        | "special_needs"
      rate_limit_action: "enquiry" | "listing" | "questionnaire"
      vaccination_status: "full" | "partial" | "none"
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
    Enums: {
      adoption_timeline: [
        "asap",
        "within_month",
        "within_3_months",
        "exploring",
      ],
      age_band: ["puppy", "young", "adult", "senior"],
      breed_preference: ["indie", "pedigree", "any"],
      daily_time: ["under_1h", "1_to_2h", "2_to_4h", "over_4h"],
      dog_sex: ["male", "female"],
      dog_size: ["small", "medium", "large"],
      dog_status: ["pending", "approved", "adopted", "removed"],
      energy_level: ["low", "medium", "high"],
      enquiry_status: [
        "interested",
        "contacted",
        "meeting",
        "rejected",
        "adoption_in_progress",
        "adopted",
        "adoption_unsuccessful",
        "follow_up_required",
      ],
      experience_level: ["first_time", "some", "experienced"],
      handling_level: ["easy", "moderate", "experienced_only"],
      home_type: [
        "apartment_no_balcony",
        "apartment_balcony",
        "independent_house",
        "house_with_garden",
      ],
      household: ["alone", "partner", "family", "flatmates"],
      lister_relationship: [
        "owner",
        "rescuer",
        "foster",
        "shelter_ngo",
        "helper",
      ],
      match_category: [
        "lifestyle",
        "living",
        "time",
        "household",
        "experience",
        "size",
        "age",
        "special_needs",
      ],
      rate_limit_action: ["enquiry", "listing", "questionnaire"],
      vaccination_status: ["full", "partial", "none"],
    },
  },
} as const
