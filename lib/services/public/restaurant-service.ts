import { createServiceRoleClient } from "@/lib/supabase"
import { defaultMedia } from "@/lib/fallback-data"

export async function fetchRestaurantByName(name: string) {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .ilike("name", name)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn("fetchRestaurantByName query error:", error.message)
      return null
    }

    return data
  } catch (err) {
    console.warn("fetchRestaurantByName failed:", String(err))
    return null
  }
}

export async function fetchActiveReservationAreas(restaurantId: string) {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("reservation_areas")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) {
      console.warn("fetchActiveReservationAreas error:", error.message)
      return []
    }

    return data || []
  } catch (err) {
    console.warn("fetchActiveReservationAreas failed:", String(err))
    return []
  }
}

export async function fetchRestaurantMedia(restaurantId: string) {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("restaurant_media")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("media_order")

    if (error) {
      console.error("Error fetching restaurant media:", error)
      return defaultMedia
    }

    return data?.length ? data : defaultMedia
  } catch (err) {
    const msg = String((err as { message?: unknown })?.message || err || "")
    if (msg.includes("Unexpected token") || msg.toLowerCase().includes("invalid")) {
      console.warn("Using fallback media due to Supabase misconfiguration.")
      return defaultMedia
    }
    console.error("Error in fetchRestaurantMedia:", msg)
    return defaultMedia
  }
}
