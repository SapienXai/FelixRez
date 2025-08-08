"use client"

import { useLanguage } from "@/context/language-context"
import { RestaurantCard } from "./restaurant-card"
import { useEffect, useState } from "react"
import { getRestaurants } from "@/app/manage/actions"

interface RestaurantWithMedia {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  location: string;
  phone: string;
  hours: string;
  atmosphere: string;
  mediaType: "slideshow" | "video";
  media: string[];
}

export function RestaurantGrid() {
  const { getTranslation, currentLang } = useLanguage()
  const [restaurants, setRestaurants] = useState<RestaurantWithMedia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const result = await getRestaurants()
        if (result.success && result.data) {
          // Transform the data to match the expected format
           const transformedRestaurants = result.data.map((restaurant: any) => ({
             id: restaurant.id,
             name: restaurant.name || '',
             description: restaurant.description || '',
             cuisine: restaurant.cuisine || '',
             location: restaurant.location || '',
             phone: restaurant.phone || '',
             hours: restaurant.hours || '',
             atmosphere: restaurant.atmosphere || '',
             mediaType: (restaurant.media?.[0]?.media_url?.endsWith('.mp4') || restaurant.media?.[0]?.media_url?.endsWith('.webm') || restaurant.media?.[0]?.media_url?.endsWith('.mov')) ? 'video' as const : 'slideshow' as const,
             media: restaurant.media?.map((m: any) => m.media_url) || []
           }))
          setRestaurants(transformedRestaurants)
        }
      } catch (error) {
        console.error('Error fetching restaurants:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurants()
  }, [])

  if (loading) {
    return (
      <main className="restaurant-grid">
        <div className="text-center py-8">
          <p>Loading restaurants...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="restaurant-grid">
      {restaurants.map((restaurant) => (
        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
      ))}
    </main>
  )
}
