export type FallbackRestaurant = {
  id: string
  name: string
  description?: string | null
  location?: string | null
  cuisine_type?: string | null
}

export type FallbackMedia = {
  id: string
  restaurant_id: string
  url: string
  media_type: "image" | "video"
  media_order: number
}

export const defaultRestaurant: FallbackRestaurant = {
  id: "fallback-restaurant",
  name: "Felix Restaurant",
  description:
    "Sample restaurant used when Supabase is not configured. Update your Supabase environment to see live data.",
  location: "Selimiye, Turkey",
  cuisine_type: "Mediterranean",
}

export const defaultMedia: FallbackMedia[] = [
  {
    id: "m1",
    restaurant_id: "fallback-restaurant",
    url: "/placeholder.svg?height=720&width=1080",
    media_type: "image",
    media_order: 1,
  },
  {
    id: "m2",
    restaurant_id: "fallback-restaurant",
    url: "/placeholder.svg?height=720&width=1080",
    media_type: "image",
    media_order: 2,
  },
]
