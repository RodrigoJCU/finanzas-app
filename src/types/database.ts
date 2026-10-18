// Tipos de la base de datos. Reflejan exactamente supabase/schema.sql.
// Si cambias el esquema, actualiza este archivo.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TransactionType = "expense" | "income";
export type TransactionStatus = "pending" | "categorized" | "ignored";
export type TransactionSource = "email" | "whatsapp" | "manual";
export type CategorizedBy = "ai" | "user";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";
export type InboundEmailStatus = "processing" | "parsed" | "ignored" | "unmatched_user" | "error";
export type MessageDirection = "inbound" | "outbound";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          whatsapp_phone: string | null;
          whatsapp_linked_at: string | null;
          whatsapp_link_code: string | null;
          whatsapp_link_code_expires_at: string | null;
          whatsapp_last_inbound_at: string | null;
          inbound_token: string;
          currency: string;
          timezone: string;
          trial_ends_at: string;
          stripe_customer_id: string | null;
          onboarding_completed: boolean;
          last_email_received_at: string | null;
          gmail_forwarding_code: string | null;
          gmail_forwarding_code_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          whatsapp_phone?: string | null;
          whatsapp_linked_at?: string | null;
          whatsapp_link_code?: string | null;
          whatsapp_link_code_expires_at?: string | null;
          whatsapp_last_inbound_at?: string | null;
          inbound_token?: string;
          currency?: string;
          timezone?: string;
          trial_ends_at?: string;
          stripe_customer_id?: string | null;
          onboarding_completed?: boolean;
          last_email_received_at?: string | null;
          gmail_forwarding_code?: string | null;
          gmail_forwarding_code_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          emoji: string | null;
          color: string;
          kind: TransactionType;
          is_archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          emoji?: string | null;
          color?: string;
          kind?: TransactionType;
          is_archived?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          type: TransactionType;
          amount: number;
          currency: string;
          merchant: string | null;
          description: string | null;
          occurred_at: string;
          status: TransactionStatus;
          source: TransactionSource;
          bank_name: string | null;
          card_last4: string | null;
          email_message_id: string | null;
          categorized_by: CategorizedBy | null;
          ai_confidence: number | null;
          user_note: string | null;
          notified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          type?: TransactionType;
          amount: number;
          currency?: string;
          merchant?: string | null;
          description?: string | null;
          occurred_at?: string;
          status?: TransactionStatus;
          source?: TransactionSource;
          bank_name?: string | null;
          card_last4?: string | null;
          email_message_id?: string | null;
          categorized_by?: CategorizedBy | null;
          ai_confidence?: number | null;
          user_note?: string | null;
          notified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "transactions_category_fk";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          amount: number;
          alert_threshold: number;
          last_alert_month: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          amount: number;
          alert_threshold?: number;
          last_alert_month?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "budgets_category_fk";
            columns: ["category_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          status: SubscriptionStatus;
          price_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          status: SubscriptionStatus;
          price_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [];
      };
      stripe_events: {
        Row: { id: string; type: string; processed_at: string };
        Insert: { id: string; type: string; processed_at?: string };
        Update: Partial<Database["public"]["Tables"]["stripe_events"]["Insert"]>;
        Relationships: [];
      };
      inbound_emails: {
        Row: {
          id: string;
          message_id: string;
          user_id: string | null;
          from_address: string | null;
          subject: string | null;
          received_at: string | null;
          status: InboundEmailStatus;
          transaction_id: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id?: string | null;
          from_address?: string | null;
          subject?: string | null;
          received_at?: string | null;
          status: InboundEmailStatus;
          transaction_id?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["inbound_emails"]["Insert"]>;
        Relationships: [];
      };
      whatsapp_messages: {
        Row: {
          id: string;
          user_id: string | null;
          transaction_id: string | null;
          wa_message_id: string | null;
          direction: MessageDirection;
          phone: string;
          message_type: string;
          body: string | null;
          status: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          transaction_id?: string | null;
          wa_message_id?: string | null;
          direction: MessageDirection;
          phone: string;
          message_type: string;
          body?: string | null;
          status?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["whatsapp_messages"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      budget_progress: {
        Row: {
          budget_id: string;
          user_id: string;
          category_id: string | null;
          category_name: string | null;
          category_emoji: string | null;
          category_color: string | null;
          budget_amount: number;
          currency: string;
          alert_threshold: number;
          last_alert_month: string | null;
          spent: number;
          remaining: number;
          ratio: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_my_access: {
        Args: Record<string, never>;
        Returns: {
          has_access: boolean;
          trial_active: boolean;
          trial_ends_at: string;
          subscription_status: SubscriptionStatus | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
