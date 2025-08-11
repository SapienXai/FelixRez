"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
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
    atmosphere: "",
    // Reservation settings
    reservation_enabled: true,
    allowed_days_of_week: [1, 2, 3, 4, 5, 6, 7],
    opening_time: "09:00",
    closing_time: "22:00",
    time_slot_duration: 30,
    advance_booking_days: 30,
    min_advance_hours: 2,
    max_party_size: 12,
    min_party_size: 1
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
        atmosphere: restaurant.atmosphere || "",
        // Reservation settings
        reservation_enabled: restaurant.reservation_enabled ?? true,
        allowed_days_of_week: restaurant.allowed_days_of_week || [1, 2, 3, 4, 5, 6, 7],
        opening_time: restaurant.opening_time || "09:00",
        closing_time: restaurant.closing_time || "22:00",
        time_slot_duration: restaurant.time_slot_duration || 30,
        advance_booking_days: restaurant.advance_booking_days || 30,
        min_advance_hours: restaurant.min_advance_hours || 2,
        max_party_size: restaurant.max_party_size || 12,
        min_party_size: restaurant.min_party_size || 1
      })
    } else {
      setFormData({
        name: "",
        description: "",
        cuisine: "",
        location: "",
        phone: "",
        hours: "",
        atmosphere: "",
        // Reservation settings
        reservation_enabled: true,
        allowed_days_of_week: [1, 2, 3, 4, 5, 6, 7],
        opening_time: "09:00",
        closing_time: "22:00",
        time_slot_duration: 30,
        advance_booking_days: 30,
        min_advance_hours: 2,
        max_party_size: 12,
        min_party_size: 1
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
        atmosphere: formData.atmosphere || undefined,
        // Reservation settings
        reservation_enabled: formData.reservation_enabled,
        allowed_days_of_week: formData.allowed_days_of_week,
        opening_time: formData.opening_time,
        closing_time: formData.closing_time,
        time_slot_duration: formData.time_slot_duration,
        advance_booking_days: formData.advance_booking_days,
        min_advance_hours: formData.min_advance_hours,
        max_party_size: formData.max_party_size,
        min_party_size: formData.min_party_size
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

  const handleInputChange = (field: string, value: string | number | boolean | number[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDayToggle = (day: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      allowed_days_of_week: checked
        ? [...prev.allowed_days_of_week, day].sort()
        : prev.allowed_days_of_week.filter(d => d !== day)
    }))
  }

  const dayNames = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
    { value: 7, label: "Sunday" }
  ]

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
              <Textarea
                id="atmosphere"
                value={formData.atmosphere}
                onChange={(e) => handleInputChange("atmosphere", e.target.value)}
                placeholder="Describe the restaurant's atmosphere..."
                rows={3}
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

          <Separator className="my-6" />
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Reservation Settings</h3>
            
            <div className="flex items-center space-x-2">
               <Checkbox
                 id="reservation_enabled"
                 checked={formData.reservation_enabled}
                 onCheckedChange={(checked) => handleInputChange("reservation_enabled", Boolean(checked))}
               />
               <Label htmlFor="reservation_enabled">Enable reservations for this restaurant</Label>
             </div>

            {formData.reservation_enabled && (
              <>
                <div className="space-y-2">
                  <Label>Allowed Days of Week</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {dayNames.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                           id={`day-${day.value}`}
                           checked={formData.allowed_days_of_week.includes(day.value)}
                           onCheckedChange={(checked) => handleDayToggle(day.value, Boolean(checked))}
                         />
                        <Label htmlFor={`day-${day.value}`}>{day.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="opening_time">Opening Time</Label>
                    <Input
                      id="opening_time"
                      type="time"
                      value={formData.opening_time}
                      onChange={(e) => handleInputChange("opening_time", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closing_time">Closing Time</Label>
                    <Input
                      id="closing_time"
                      type="time"
                      value={formData.closing_time}
                      onChange={(e) => handleInputChange("closing_time", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="time_slot_duration">Time Slot Duration (minutes)</Label>
                    <Input
                      id="time_slot_duration"
                      type="number"
                      min="15"
                      max="120"
                      step="15"
                      value={formData.time_slot_duration}
                      onChange={(e) => handleInputChange("time_slot_duration", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advance_booking_days">Advance Booking Days</Label>
                    <Input
                      id="advance_booking_days"
                      type="number"
                      min="1"
                      max="365"
                      value={formData.advance_booking_days}
                      onChange={(e) => handleInputChange("advance_booking_days", parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_advance_hours">Minimum Advance Hours</Label>
                    <Input
                      id="min_advance_hours"
                      type="number"
                      min="0"
                      max="72"
                      value={formData.min_advance_hours}
                      onChange={(e) => handleInputChange("min_advance_hours", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_party_size">Maximum Party Size</Label>
                    <Input
                      id="max_party_size"
                      type="number"
                      min="1"
                      max="50"
                      value={formData.max_party_size}
                      onChange={(e) => handleInputChange("max_party_size", parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_party_size">Minimum Party Size</Label>
                  <Input
                    id="min_party_size"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.min_party_size}
                    onChange={(e) => handleInputChange("min_party_size", parseInt(e.target.value))}
                    className="w-32"
                  />
                </div>
              </>
            )}
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