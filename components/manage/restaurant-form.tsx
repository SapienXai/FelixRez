"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { createRestaurant, updateRestaurant } from "@/app/manage/actions"
import { toast } from "@/hooks/use-toast"
import type { Database } from "@/types/supabase"

type Restaurant = Database['public']['Tables']['restaurants']['Row']

interface RestaurantWithMedia extends Restaurant {
  media?: {
    id: string
    url: string
    alt_text?: string
  }[]
}

interface RestaurantFormProps {
  isOpen: boolean
  mode: "create" | "edit"
  restaurant?: RestaurantWithMedia | null
  onClose: () => void
  onSuccess: () => void
}

export function RestaurantForm({ isOpen, mode, restaurant, onClose, onSuccess }: RestaurantFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cuisine: "",
    location: "",
    phone: "",
    hours: "",
    atmosphere: ""
  })

  useEffect(() => {
    if (mode === "edit" && restaurant) {
      setFormData({
        name: restaurant.name || "",
        description: restaurant.description || "",
        cuisine: restaurant.cuisine || "",
        location: restaurant.location || "",
        phone: restaurant.phone || "",
        hours: restaurant.hours || "",
        atmosphere: restaurant.atmosphere || ""
      })
    } else {
      setFormData({
        name: "",
        description: "",
        cuisine: "",
        location: "",
        phone: "",
        hours: "",
        atmosphere: ""
      })
    }
  }, [mode, restaurant, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const restaurantData = {
        name: formData.name,
        description: formData.description || undefined,
        cuisine: formData.cuisine || undefined,
        location: formData.location || undefined,
        phone: formData.phone || undefined,
        hours: formData.hours || undefined,
        atmosphere: formData.atmosphere || undefined
      }

      let result
      if (mode === "create") {
        result = await createRestaurant(restaurantData)
      } else {
        result = await updateRestaurant(restaurant!.id, restaurantData)
      }

      if (result.success) {
        toast({
          title: "Success",
          description: result.message
        })
        onSuccess()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error submitting restaurant form:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add New Restaurant" : "Edit Restaurant"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
                placeholder="Enter restaurant name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuisine">Cuisine Type</Label>
              <Input
                id="cuisine"
                value={formData.cuisine}
                onChange={(e) => handleInputChange("cuisine", e.target.value)}
                placeholder="e.g., Italian, Mediterranean"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Brief description of the restaurant"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              placeholder="Full address or location"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="e.g., +1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="atmosphere">Atmosphere</Label>
              <Input
                id="atmosphere"
                value={formData.atmosphere}
                onChange={(e) => handleInputChange("atmosphere", e.target.value)}
                placeholder="e.g., Casual, Fine Dining, Family-friendly"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Opening Hours</Label>
            <Input
              id="hours"
              value={formData.hours}
              onChange={(e) => handleInputChange("hours", e.target.value)}
              placeholder="e.g., Mon-Sun: 12PM - 10PM"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "create" ? "Creating..." : "Updating..."}
                </>
              ) : (
                mode === "create" ? "Create Restaurant" : "Update Restaurant"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}