import { createServiceRoleClient } from "@/lib/supabase"

export async function fetchManagedRestaurants(allowedRestaurantIds: string[] | null) {
  const supabase = createServiceRoleClient()

  let query = supabase
    .from("restaurants")
    .select(`
      *,
      media:restaurant_media(*)
    `)
    .order("name", { ascending: true })

  if (Array.isArray(allowedRestaurantIds) && allowedRestaurantIds.length === 1) {
    query = query.eq("id", allowedRestaurantIds[0])
  }

  return query
}

export async function fetchPublicRestaurants() {
  const supabase = createServiceRoleClient()
  return supabase
    .from("restaurants")
    .select(`
      *,
      media:restaurant_media(*)
    `)
    .eq("reservation_enabled", true)
    .order("name", { ascending: true })
}
