export type SubscriptionStatus = "active" | "inactive" | "expired" | "trial";
export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface Database {
  public: {
    Tables: {
      subscription: {
        Row: {
          id: string;
          status: SubscriptionStatus;
          mercado_pago_id: string | null;
          trial_started_at: string | null;
          expires_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          status?: SubscriptionStatus;
          mercado_pago_id?: string | null;
          trial_started_at?: string | null;
          expires_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          status?: SubscriptionStatus;
          mercado_pago_id?: string | null;
          trial_started_at?: string | null;
          expires_at?: string | null;
          updated_at?: string;
        };
      };
      admin_user: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          created_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          name: string;
          price: number;
          duration: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          duration: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          duration?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      time_slots: {
        Row: {
          id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          available: boolean;
        };
        Insert: {
          id?: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          available?: boolean;
        };
        Update: {
          id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          available?: boolean;
        };
      };
      bookings: {
        Row: {
          id: string;
          service_id: string;
          client_name: string;
          client_whatsapp: string;
          date_time: string;
          status: BookingStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          client_name: string;
          client_whatsapp: string;
          date_time: string;
          status?: BookingStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          service_id?: string;
          client_name?: string;
          client_whatsapp?: string;
          date_time?: string;
          status?: BookingStatus;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier usage
export type Subscription = Database["public"]["Tables"]["subscription"]["Row"];
export type AdminUser = Database["public"]["Tables"]["admin_user"]["Row"];
export type Service = Database["public"]["Tables"]["services"]["Row"];
export type TimeSlot = Database["public"]["Tables"]["time_slots"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export type InsertSubscription = Database["public"]["Tables"]["subscription"]["Insert"];
export type InsertAdminUser = Database["public"]["Tables"]["admin_user"]["Insert"];
export type InsertService = Database["public"]["Tables"]["services"]["Insert"];
export type InsertTimeSlot = Database["public"]["Tables"]["time_slots"]["Insert"];
export type InsertBooking = Database["public"]["Tables"]["bookings"]["Insert"];

export type UpdateSubscription = Database["public"]["Tables"]["subscription"]["Update"];
export type UpdateAdminUser = Database["public"]["Tables"]["admin_user"]["Update"];
export type UpdateService = Database["public"]["Tables"]["services"]["Update"];
export type UpdateTimeSlot = Database["public"]["Tables"]["time_slots"]["Update"];
export type UpdateBooking = Database["public"]["Tables"]["bookings"]["Update"];
