"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createReservation, updateReservation, getRestaurants } from "@/app/manage/actions"
import { getReservationAreas } from "@/app/manage/reservation-areas-actions"
import { toast } from "sonner"

interface Restaurant {
  id: string
  name: string
  meal_only_reservations?: boolean
}

interface ReservationWithRestaurant {
  id: string
  restaurant_id: string
  reservation_area_id?: string | null
  customer_name: string
  customer_email: string | null
  customer_phone: string
  party_size: number
  reservation_date: string
  reservation_time: string
  special_requests?: string | null
  status: string | null
  table_number?: string | null
  restaurants?: {
    id: string
    name: string
  }
}

interface ReservationFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  reservation?: ReservationWithRestaurant | null
  mode: "create" | "edit"
}

export function ReservationForm({
  isOpen,
  onClose,
  onSuccess,
  reservation,
  mode,
}: ReservationFormProps) {
  const [loading, setLoading] = useState(false)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [areas, setAreas] = useState<{ id: string; name: string; is_active: boolean }[]>([])
  const [formData, setFormData] = useState({
    restaurant_id: "",
    reservation_area_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    party_size: 1,
    reservation_date: "",
    reservation_time: "",
    special_requests: "",
    status: "pending",
    table_number: "",
    reservation_type: "meal",
  })

  // Load restaurants on component mount
  useEffect(() => {
    const loadRestaurants = async () => {
      const result = await getRestaurants()
      if (result.success) {
        setRestaurants(result.data)
      }
    }
    loadRestaurants()
  }, [])

  // Load areas when restaurant changes
  useEffect(() => {
    const loadAreas = async () => {
      if (!formData.restaurant_id) {
        setAreas([])
        setFormData(prev => ({ ...prev, reservation_area_id: "" }))
        return
      }
      const res = await getReservationAreas(formData.restaurant_id)
      if (res.success) {
        const active = (res.data || []).filter((a: any) => a.is_active).map((a: any) => ({ id: a.id, name: a.name, is_active: a.is_active }))
        setAreas(active)
        setFormData(prev => ({ ...prev, reservation_area_id: active.some(a => a.id === prev.reservation_area_id) ? prev.reservation_area_id : "" }))
      } else {
        setAreas([])
        setFormData(prev => ({ ...prev, reservation_area_id: "" }))
      }
    }
    loadAreas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.restaurant_id])

  // Populate form when editing
  useEffect(() => {
    if (mode === "edit" && reservation) {
      setFormData({
        restaurant_id: reservation.restaurant_id,
        reservation_area_id: reservation.reservation_area_id || "",
        customer_name: reservation.customer_name,
        customer_email: reservation.customer_email || "",
        customer_phone: reservation.customer_phone,
        party_size: reservation.party_size,
        reservation_date: reservation.reservation_date,
        reservation_time: reservation.reservation_time,
        special_requests: reservation.special_requests || "",
        status: reservation.status || "pending",
        table_number: reservation.table_number || "",
        reservation_type: (reservation as any).reservation_type || "meal",
      })
    } else if (mode === "create") {
      // Reset form for create mode
      setFormData({
        restaurant_id: "",
        reservation_area_id: "",
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        party_size: 1,
        reservation_date: "",
        reservation_time: "",
        special_requests: "",
        status: "pending",
        table_number: "",
        reservation_type: "meal",
      })
    }
  }, [mode, reservation, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let result
      if (mode === "create") {
        result = await createReservation(formData)
      } else {
        result = await updateReservation(reservation!.id, formData)
      }

      if (result.success) {
        toast.success(result.message)
        onSuccess()
        onClose()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {mode === "create" ? "Create Reservation" : "Edit Reservation"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {mode === "create"
              ? "Fill in the details below."
              : "Update the reservation details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="restaurant" className="text-sm">Restaurant</Label>
              <Select
                value={formData.restaurant_id}
                onValueChange={(value) => handleInputChange("restaurant_id", value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="area" className="text-sm">Area (optional)</Label>
              <Select
                value={formData.reservation_area_id || ""}
                onValueChange={(value) => handleInputChange("reservation_area_id", value === 'none' ? "" : value)}
                disabled={!formData.restaurant_id || areas.length === 0}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={areas.length ? "Restaurant" : "No areas"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Restaurant</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reservation_type" className="text-sm">Type</Label>
                <Select
                  value={formData.reservation_type}
                  onValueChange={(value) => handleInputChange("reservation_type", value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meal">Dining</SelectItem>
                    {!restaurants.find(r => r.id === formData.restaurant_id)?.meal_only_reservations && (
                      <SelectItem value="drinks">Drinks Only</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_name" className="text-sm">Customer Name</Label>
            <Input
              id="customer_name"
              className="h-9"
              value={formData.customer_name}
              onChange={(e) => handleInputChange("customer_name", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_email" className="text-sm">Email</Label>
            <Input
              id="customer_email"
              type="email"
              className="h-9"
              value={formData.customer_email}
              onChange={(e) => handleInputChange("customer_email", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_phone" className="text-sm">Phone</Label>
            <Input
              id="customer_phone"
              className="h-9"
              value={formData.customer_phone}
              onChange={(e) => handleInputChange("customer_phone", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="party_size" className="text-sm">Party Size</Label>
              <Input
                id="party_size"
                type="number"
                min="1"
                max="20"
                className="h-9"
                value={formData.party_size}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  handleInputChange("party_size", isNaN(value) ? 1 : value)
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="table_number" className="text-sm">Table</Label>
              <Input
                id="table_number"
                className="h-9"
                value={formData.table_number}
                onChange={(e) => handleInputChange("table_number", e.target.value)}
                placeholder="e.g., T1, A5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="reservation_date" className="text-sm">Date</Label>
              <Input
                id="reservation_date"
                type="date"
                className="h-9"
                value={formData.reservation_date}
                onChange={(e) => handleInputChange("reservation_date", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reservation_time" className="text-sm">Time</Label>
              <Input
                id="reservation_time"
                type="time"
                className="h-9"
                value={formData.reservation_time}
                onChange={(e) => handleInputChange("reservation_time", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="special_requests" className="text-sm">Special Requests</Label>
            <Textarea
              id="special_requests"
              value={formData.special_requests}
              onChange={(e) => handleInputChange("special_requests", e.target.value)}
              placeholder="Any special requests..."
              rows={2}
              className="text-sm"
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto h-9">
              {loading
                ? mode === "create"
                  ? "Creating..."
                  : "Updating..."
                : mode === "create"
                ? "Create"
                : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
