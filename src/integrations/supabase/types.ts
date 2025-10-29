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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bets: {
        Row: {
          created_at: string
          id: string
          match_id: string
          odds: number
          potential_win: number
          result: string | null
          selection: string
          stake: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          odds: number
          potential_win: number
          result?: string | null
          selection: string
          stake: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          odds?: number
          potential_win?: number
          result?: string | null
          selection?: string
          stake?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      casino_bets: {
        Row: {
          amount: number
          bet_data: Json | null
          created_at: string
          game_round_id: string | null
          game_type: string
          id: string
          multiplier: number | null
          payout: number | null
          settled_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          bet_data?: Json | null
          created_at?: string
          game_round_id?: string | null
          game_type: string
          id?: string
          multiplier?: number | null
          payout?: number | null
          settled_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          bet_data?: Json | null
          created_at?: string
          game_round_id?: string | null
          game_type?: string
          id?: string
          multiplier?: number | null
          payout?: number | null
          settled_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "casino_bets_game_round_id_fkey"
            columns: ["game_round_id"]
            isOneToOne: false
            referencedRelation: "casino_game_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      casino_game_rounds: {
        Row: {
          created_at: string
          game_type: string
          id: string
          multiplier: number | null
          outcome_data: Json
          result: string | null
          seed: string
        }
        Insert: {
          created_at?: string
          game_type: string
          id?: string
          multiplier?: number | null
          outcome_data: Json
          result?: string | null
          seed: string
        }
        Update: {
          created_at?: string
          game_type?: string
          id?: string
          multiplier?: number | null
          outcome_data?: Json
          result?: string | null
          seed?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          competition: string
          created_at: string | null
          id: string
          match_date: string
          odds_draw: number
          odds_team1_win: number
          odds_team2_win: number
          result: string | null
          status: string
          team1: string
          team1_score: number | null
          team2: string
          team2_score: number | null
          updated_at: string | null
        }
        Insert: {
          competition: string
          created_at?: string | null
          id?: string
          match_date: string
          odds_draw: number
          odds_team1_win: number
          odds_team2_win: number
          result?: string | null
          status?: string
          team1: string
          team1_score?: number | null
          team2: string
          team2_score?: number | null
          updated_at?: string | null
        }
        Update: {
          competition?: string
          created_at?: string | null
          id?: string
          match_date?: string
          odds_draw?: number
          odds_team1_win?: number
          odds_team2_win?: number
          result?: string | null
          status?: string
          team1?: string
          team1_score?: number | null
          team2?: string
          team2_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mobile_wagers: {
        Row: {
          created_at: string
          expires_at: string
          game_type: string
          id: string
          match_details: Json | null
          player_a_id: string
          player_b_id: string | null
          stake_amount: number
          status: string
          wager_code: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          game_type: string
          id?: string
          match_details?: Json | null
          player_a_id: string
          player_b_id?: string | null
          stake_amount: number
          status?: string
          wager_code?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          game_type?: string
          id?: string
          match_details?: Json | null
          player_a_id?: string
          player_b_id?: string | null
          stake_amount?: number
          status?: string
          wager_code?: string | null
          winner_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
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
      wager_proofs: {
        Row: {
          admin_notes: string | null
          id: string
          screenshot_url: string
          status: string
          submitted_at: string
          user_id: string
          wager_id: string
        }
        Insert: {
          admin_notes?: string | null
          id?: string
          screenshot_url: string
          status?: string
          submitted_at?: string
          user_id: string
          wager_id: string
        }
        Update: {
          admin_notes?: string | null
          id?: string
          screenshot_url?: string
          status?: string
          submitted_at?: string
          user_id?: string
          wager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wager_proofs_wager_id_fkey"
            columns: ["wager_id"]
            isOneToOne: false
            referencedRelation: "mobile_wagers"
            referencedColumns: ["id"]
          },
        ]
      }
      wager_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          type: string
          user_id: string
          wager_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          type: string
          user_id: string
          wager_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          type?: string
          user_id?: string
          wager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wager_transactions_wager_id_fkey"
            columns: ["wager_id"]
            isOneToOne: false
            referencedRelation: "mobile_wagers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
