export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string
          name: string
          description: string | null
          cuisine: string | null
          hours: string | null
          atmosphere: string | null
          phone: string | null
          location: string | null
          media_type: string | null
          reservation_enabled: boolean | null
          allowed_days_of_week: number[] | null
          opening_time: string | null
          closing_time: string | null
          time_slot_duration: number | null
          advance_booking_days: number | null
          min_advance_hours: number | null
          max_party_size: number | null
          min_party_size: number | null
          blocked_dates: string[] | null
          special_hours: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          cuisine?: string | null
          hours?: string | null
          atmosphere?: string | null
          phone?: string | null
          location?: string | null
          media_type?: string | null
          reservation_enabled?: boolean | null
          allowed_days_of_week?: number[] | null
          opening_time?: string | null
          closing_time?: string | null
          time_slot_duration?: number | null
          advance_booking_days?: number | null
          min_advance_hours?: number | null
          max_party_size?: number | null
          min_party_size?: number | null
          blocked_dates?: string[] | null
          special_hours?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          cuisine?: string | null
          hours?: string | null
          atmosphere?: string | null
          phone?: string | null
          location?: string | null
          media_type?: string | null
          reservation_enabled?: boolean | null
          allowed_days_of_week?: number[] | null
          opening_time?: string | null
          closing_time?: string | null
          time_slot_duration?: number | null
          advance_booking_days?: number | null
          min_advance_hours?: number | null
          max_party_size?: number | null
          min_party_size?: number | null
          blocked_dates?: string[] | null
          special_hours?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      restaurant_media: {
        Row: {
          id: string
          restaurant_id: string
          media_url: string
          media_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          media_url: string
          media_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          media_url?: string
          media_order?: number | null
          created_at?: string
        }
      }
      reservations: {
        Row: {
          id: string
          restaurant_id: string
          party_size: number
          reservation_date: string
          reservation_time: string
          customer_name: string
          customer_phone: string
          customer_email: string | null
          special_requests: string | null
          status: string | null
          notes: string | null
          table_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          party_size: number
          reservation_date: string
          reservation_time: string
          customer_name: string
          customer_phone: string
          customer_email?: string | null
          special_requests?: string | null
          status?: string | null
          notes?: string | null
          table_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          party_size?: number
          reservation_date?: string
          reservation_time?: string
          customer_name?: string
          customer_phone?: string
          customer_email?: string | null
          special_requests?: string | null
          status?: string | null
          notes?: string | null
          table_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      admin_profiles: {
        Row: {
          id: string
          full_name: string | null
          role: string | null
          restaurant_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: string | null
          restaurant_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: string | null
          restaurant_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notification_settings: {
        Row: {
          id: string
          restaurant_id: string
          email_notifications: boolean | null
          sms_notifications: boolean | null
          notification_emails: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          email_notifications?: boolean | null
          sms_notifications?: boolean | null
          notification_emails?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          email_notifications?: boolean | null
          sms_notifications?: boolean | null
          notification_emails?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Restaurant = Database["public"]["Tables"]["restaurants"]["Row"]
export type RestaurantMedia = Database["public"]["Tables"]["restaurant_media"]["Row"]
export type Reservation = Database["public"]["Tables"]["reservations"]["Row"]
export type AdminProfile = Database["public"]["Tables"]["admin_profiles"]["Row"]
export type NotificationSettings = Database["public"]["Tables"]["notification_settings"]["Row"]
