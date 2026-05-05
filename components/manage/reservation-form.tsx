"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react"
import { createReservation, updateReservation, getRestaurants } from "@/app/manage/actions"
import { getReservationAreas } from "@/app/manage/reservation-areas-actions"
import { toast } from "sonner"
import { useLanguage } from "@/context/language-context"

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
  } | null
}

type ReservationFormData = {
  restaurant_id: string
  reservation_area_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  party_size: number | ""
  reservation_date: string
  reservation_time: string
  special_requests: string
  status: string
  table_number: string
  reservation_type: string
}

interface ReservationFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (reservation?: ReservationWithRestaurant | null, previousReservation?: ReservationWithRestaurant | null) => void
  reservation?: ReservationWithRestaurant | null
  mode: "create" | "edit"
  restaurants?: Restaurant[]
  defaultRestaurantId?: string
}

const getTodayDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getCreateDefaultFormData = (): ReservationFormData => ({
  restaurant_id: "",
  reservation_area_id: "",
  customer_name: "",
  customer_email: "rez@felixsmile.com",
  customer_phone: "",
  party_size: 1,
  reservation_date: getTodayDate(),
  reservation_time: "19:00",
  special_requests: "",
  status: "confirmed",
  table_number: "",
  reservation_type: "meal",
})

const getCreateFormData = (defaultRestaurantId?: string): ReservationFormData => ({
  ...getCreateDefaultFormData(),
  restaurant_id: defaultRestaurantId || "",
})

const MAIN_HALL_AREA_VALUE = "__main_hall__"

export function ReservationForm({
  isOpen,
  onClose,
  onSuccess,
  reservation,
  mode,
  restaurants: providedRestaurants,
  defaultRestaurantId,
}: ReservationFormProps) {
  const { getTranslation } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [restaurants, setRestaurants] = useState<Restaurant[]>(providedRestaurants || [])
  const [areas, setAreas] = useState<{ id: string; name: string; is_active: boolean }[]>([])
  const [areasLoading, setAreasLoading] = useState(false)
  const [formData, setFormData] = useState<ReservationFormData>(getCreateDefaultFormData())
  const areaLoadRequestRef = useRef(0)

  useEffect(() => {
    if (providedRestaurants) {
      setRestaurants(providedRestaurants)
    }
  }, [providedRestaurants])

  // Load restaurants only when the parent did not already provide them.
  useEffect(() => {
    if (providedRestaurants) {
      return
    }

    const loadRestaurants = async () => {
      const result = await getRestaurants()
      if (result.success) {
        setRestaurants(result.data)
      }
    }
    loadRestaurants()
  }, [providedRestaurants])

  const loadAreasForRestaurant = async (restaurantId: string, shouldResetArea: boolean) => {
    const requestId = ++areaLoadRequestRef.current

    if (!restaurantId) {
      setAreasLoading(false)
      setAreas([])
      if (shouldResetArea) {
        setFormData(prev => ({ ...prev, reservation_area_id: "" }))
      }
      return
    }

    setAreasLoading(true)
    setAreas([])
    if (shouldResetArea) {
      setFormData(prev => ({ ...prev, reservation_area_id: "" }))
    }

    const res = await getReservationAreas(restaurantId)
    if (areaLoadRequestRef.current !== requestId) {
      return
    }

    if (res.success) {
      const loadedAreas = (res.data || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        is_active: a.is_active,
      }))
      setAreas(loadedAreas)
      if (shouldResetArea) {
        setFormData(prev => ({ ...prev, reservation_area_id: "" }))
      }
    } else {
      setAreas([])
    }
    setAreasLoading(false)
  }

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
      void loadAreasForRestaurant(reservation.restaurant_id, false)
    } else if (mode === "create") {
      // Reset form for create mode
      const nextFormData = getCreateFormData(defaultRestaurantId)
      setFormData(nextFormData)
      if (nextFormData.restaurant_id) {
        void loadAreasForRestaurant(nextFormData.restaurant_id, true)
      } else {
        setAreas([])
      }
    }
  }, [mode, reservation, isOpen, defaultRestaurantId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        party_size: formData.party_size === "" ? 1 : formData.party_size,
        customer_phone: formData.customer_phone.trim() || "-",
      }

      let result
      if (mode === "create") {
        result = await createReservation(payload)
      } else {
        result = await updateReservation(reservation!.id, payload)
      }

      if (result.success) {
        toast.success(result.message)
        onSuccess(result.data || null, reservation || null)
        onClose()
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }
      
      // If area is changed and it's Terrace or Deck, force reservation type to meal
      // Exception: Felix Marina's Terrace area accepts drinks reservations
      if (field === 'reservation_area_id') {
        const selectedArea = areas.find(area => area.id === value)
        const selectedRestaurant = restaurants.find(r => r.id === formData.restaurant_id)
        const isFelixMarinaTerraceArea = selectedArea && selectedRestaurant &&
          selectedRestaurant.name.toLowerCase().includes('felix') && 
          selectedRestaurant.name.toLowerCase().includes('marina') && 
          selectedArea.name.toLowerCase().includes('terrace')
        
        if (selectedArea && 
            (selectedArea.name.toLowerCase().includes('terrace') || selectedArea.name.toLowerCase().includes('deck')) &&
            !isFelixMarinaTerraceArea) {
          newData.reservation_type = 'meal'
        }
      }
      
      return newData
    })

    if (field === "restaurant_id") {
      void loadAreasForRestaurant(value, mode === "create")
    }
  }

  const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === formData.restaurant_id)
  const selectedArea = areas.find((area) => area.id === formData.reservation_area_id)
  const locale = getTranslation("common.locale") || "en-US"
  const formattedDate = formData.reservation_date
    ? new Date(`${formData.reservation_date}T12:00:00`).toLocaleDateString(locale, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : getTranslation("manage.reservationForm.datePlaceholder")
  const formattedTime = formData.reservation_time ? formData.reservation_time.slice(0, 5) : getTranslation("manage.reservationForm.timePlaceholder")
  const selectedAreaLabel = !formData.restaurant_id
    ? getTranslation("manage.reservationForm.noAreas")
    : formData.reservation_area_id
    ? selectedArea?.name || getTranslation("manage.reservationForm.mainHall")
    : getTranslation("manage.reservationForm.mainHall")
  const selectedTypeLabel =
    formData.reservation_type === "drinks"
      ? getTranslation("manage.reservationForm.reservationTypeDrinks")
      : getTranslation("manage.reservationForm.reservationTypeDining")
  const selectedStatusLabel =
    formData.status === "confirmed"
      ? getTranslation("manage.reservationForm.statusConfirmed")
      : formData.status === "cancelled"
      ? getTranslation("manage.reservationForm.statusCancelled")
      : formData.status === "completed"
      ? getTranslation("manage.reservationForm.statusCompleted")
      : getTranslation("manage.reservationForm.statusPending")
  const previewStatusClassName =
    formData.status === "confirmed"
      ? "border-green-200 bg-green-50 text-green-700"
      : formData.status === "cancelled"
      ? "border-red-200 bg-red-50 text-red-700"
      : formData.status === "completed"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-yellow-200 bg-yellow-50 text-yellow-700"

  const formFieldClassName =
    "h-10 rounded-xl border-slate-200 bg-white shadow-sm transition-shadow focus-visible:shadow-md"
  const textAreaClassName =
    "min-h-[120px] rounded-xl border-slate-200 bg-white shadow-sm transition-shadow focus-visible:shadow-md"

  const renderPreviewPanel = () => {
    const cardBgClassName = "bg-white"
    const iconClassName = "text-slate-500"

    return (
      <Card className="rounded-2xl border border-white/70 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.08)] ring-1 ring-black/5">
        <CardHeader className="border-b bg-white/70 px-4 py-3">
          <CardTitle className="text-sm font-semibold text-slate-950">
            {getTranslation("manage.reservationForm.previewTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="mb-3 text-xs text-slate-500">
            {getTranslation("manage.reservationForm.previewDescription")}
          </p>

          {!selectedRestaurant ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-[#fbf5ea] p-3">
              <p className="text-xs text-slate-500">{getTranslation("manage.reservationForm.previewEmpty")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className={`rounded-xl border border-white/60 bg-white p-3 shadow-sm ${cardBgClassName}`}>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    {getTranslation("manage.reservationForm.restaurant")}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{selectedRestaurant.name}</div>
                </div>
                <div className={`rounded-xl border border-white/60 bg-white p-3 shadow-sm ${cardBgClassName}`}>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    {getTranslation("manage.reservationForm.area")}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{selectedAreaLabel}</div>
                </div>
                <div className={`rounded-xl border border-white/60 bg-white p-3 shadow-sm ${cardBgClassName}`}>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    {getTranslation("manage.reservationForm.date")}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{formattedDate}</div>
                </div>
                <div className={`rounded-xl border border-white/60 bg-white p-3 shadow-sm ${cardBgClassName}`}>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    {getTranslation("manage.reservationForm.time")}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{formattedTime}</div>
                </div>
              </div>

              <Separator className="bg-slate-200" />

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={`rounded-full ${previewStatusClassName}`}>
                  {selectedStatusLabel}
                </Badge>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700">
                  {selectedTypeLabel}
                </Badge>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700">
                  <Users className="mr-1 h-3 w-3" />
                  {formData.party_size === "" ? "1" : formData.party_size}
                </Badge>
              </div>

              <div className={`rounded-xl border border-white/60 bg-white p-3 shadow-sm ${cardBgClassName}`}>
                <div className="flex items-start gap-3 text-slate-500">
                  <MapPin className={`mt-0.5 h-4 w-4 ${iconClassName}`} />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {getTranslation("manage.reservationForm.reservationDetails")}
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedRestaurant.name} · {selectedAreaLabel}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl border border-white/60 bg-white p-3 shadow-sm ${cardBgClassName}`}>
                <div className="flex items-start gap-3 text-slate-500">
                  <Clock className={`mt-0.5 h-4 w-4 ${iconClassName}`} />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {getTranslation("manage.reservationForm.notesTitle")}
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {formData.special_requests || getTranslation("manage.reservationForm.specialRequestsPlaceholder")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-5xl p-0 overflow-hidden bg-[#eef3f8]">
        <div className="flex max-h-[92vh] min-h-0 flex-col">
          <div className="flex min-h-0 flex-col bg-transparent">
            <div className="border-b border-white/60 bg-white/65 px-4 py-4 shadow-sm backdrop-blur sm:px-5">
              <DialogHeader className="space-y-3">
                <DialogTitle className="sr-only">
                  {mode === "create"
                    ? getTranslation("manage.reservationForm.title")
                    : getTranslation("manage.reservationForm.editTitle")}
                </DialogTitle>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
                      <Sparkles className="h-3.5 w-3.5" />
                      {mode === "create" ? getTranslation("manage.reservationForm.title") : getTranslation("manage.reservationForm.editTitle")}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] text-white hover:bg-slate-900">
                    {mode === "create" ? getTranslation("manage.reservationForm.create") : getTranslation("manage.reservationForm.update")}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full border-white/70 bg-white px-2.5 py-0.5 text-[11px] text-slate-700 shadow-sm">
                    {selectedRestaurant?.name || getTranslation("manage.reservationForm.restaurantPlaceholder")}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/70 bg-white px-2.5 py-0.5 text-[11px] text-slate-700 shadow-sm">
                    <MapPin className="mr-1 h-3 w-3" />
                    {selectedAreaLabel}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/70 bg-white px-2.5 py-0.5 text-[11px] text-slate-700 shadow-sm">
                    <Calendar className="mr-1 h-3 w-3" />
                    {formattedDate}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/70 bg-white px-2.5 py-0.5 text-[11px] text-slate-700 shadow-sm">
                    <Clock className="mr-1 h-3 w-3" />
                    {formattedTime}
                  </Badge>
                </div>
              </DialogHeader>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <form id="reservation-form" onSubmit={handleSubmit} className="space-y-4 px-4 py-4 sm:px-5">

                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.08)] ring-1 ring-black/5">
                    <CardHeader className="border-b border-slate-100 bg-white/80 px-4 py-3">
                      <CardTitle className="text-sm font-semibold text-slate-950">
                        {getTranslation("manage.reservationForm.guestDetails")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 p-4 md:grid-cols-2">
                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="customer_name" className="text-xs font-medium text-slate-700">
                          {getTranslation("manage.reservationForm.customerName")}
                        </Label>
                        <Input
                          id="customer_name"
                          className={formFieldClassName}
                          value={formData.customer_name}
                          onChange={(e) => handleInputChange("customer_name", e.target.value)}
                          placeholder={getTranslation("manage.reservationForm.customerNamePlaceholder")}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="customer_email" className="text-xs font-medium text-slate-700">
                          {getTranslation("manage.reservationForm.email")}
                        </Label>
                        <Input
                          id="customer_email"
                          type="email"
                          className={formFieldClassName}
                          value={formData.customer_email}
                          onChange={(e) => handleInputChange("customer_email", e.target.value)}
                          placeholder={getTranslation("manage.reservationForm.emailPlaceholder")}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="customer_phone" className="text-xs font-medium text-slate-700">
                          {getTranslation("manage.reservationForm.phone")}
                        </Label>
                        <Input
                          id="customer_phone"
                          className={formFieldClassName}
                          value={formData.customer_phone}
                          onChange={(e) => handleInputChange("customer_phone", e.target.value)}
                          placeholder={getTranslation("manage.reservationForm.phonePlaceholder")}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="party_size" className="text-xs font-medium text-slate-700">
                          {getTranslation("manage.reservationForm.partySize")}
                        </Label>
                        <Input
                          id="party_size"
                          type="number"
                          min="1"
                          max="20"
                          className={formFieldClassName}
                          value={formData.party_size}
                          onChange={(e) => {
                            const value = e.target.value
                            handleInputChange("party_size", value === "" ? "" : Number(value))
                          }}
                          placeholder={getTranslation("manage.reservationForm.partySizePlaceholder")}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="table_number" className="text-xs font-medium text-slate-700">
                          {getTranslation("manage.reservationForm.tableNumber")}
                        </Label>
                        <Input
                          id="table_number"
                          className={formFieldClassName}
                          value={formData.table_number}
                          onChange={(e) => handleInputChange("table_number", e.target.value)}
                          placeholder={getTranslation("manage.reservationForm.tableNumberPlaceholder")}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.08)] ring-1 ring-black/5">
                    <CardHeader className="border-b border-slate-100 bg-white/80 px-4 py-3">
                      <CardTitle className="text-sm font-semibold text-slate-950">
                        {getTranslation("manage.reservationForm.reservationDetails")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 p-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="restaurant" className="text-xs font-medium text-slate-700">
                          {getTranslation("manage.reservationForm.restaurant")}
                        </Label>
                        <Select
                          value={formData.restaurant_id}
                          onValueChange={(value) => handleInputChange("restaurant_id", value)}
                        >
                          <SelectTrigger className={formFieldClassName}>
                            <SelectValue placeholder={getTranslation("manage.reservationForm.restaurantPlaceholder")} />
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

                      <div className="space-y-1.5">
                        <Label htmlFor="area" className="text-xs font-medium text-slate-700">
                          {getTranslation("manage.reservationForm.area")}
                        </Label>
                        <Select
                          key={`${formData.restaurant_id}-${areas.map((area) => area.id).join(",")}`}
                          value={formData.restaurant_id ? formData.reservation_area_id || MAIN_HALL_AREA_VALUE : ""}
                          onValueChange={(value) => handleInputChange("reservation_area_id", value === MAIN_HALL_AREA_VALUE ? "" : value)}
                          disabled={!formData.restaurant_id || areasLoading}
                        >
                          <SelectTrigger className={formFieldClassName}>
                            <SelectValue
                              placeholder={
                                areasLoading
                                  ? getTranslation("manage.reservationForm.loadingAreas")
                                  : formData.restaurant_id
                                  ? getTranslation("manage.reservationForm.mainHall")
                                  : getTranslation("manage.reservationForm.noAreas")
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {formData.restaurant_id && (
                              <SelectItem value={MAIN_HALL_AREA_VALUE}>
                                {getTranslation("manage.reservationForm.mainHall")}
                              </SelectItem>
                            )}
                            {areas.map((area) => (
                              <SelectItem key={area.id} value={area.id}>
                                {area.name}
                                {!area.is_active ? ` (${getTranslation("manage.reservationForm.inactive")})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="status" className="text-xs font-medium text-slate-700">
                            {getTranslation("manage.reservationForm.status")}
                          </Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) => handleInputChange("status", value)}
                          >
                            <SelectTrigger className={formFieldClassName}>
                              <SelectValue placeholder={getTranslation("manage.reservationForm.statusPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">{getTranslation("manage.reservationForm.statusPending")}</SelectItem>
                              <SelectItem value="confirmed">{getTranslation("manage.reservationForm.statusConfirmed")}</SelectItem>
                              <SelectItem value="cancelled">{getTranslation("manage.reservationForm.statusCancelled")}</SelectItem>
                              <SelectItem value="completed">{getTranslation("manage.reservationForm.statusCompleted")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="reservation_type" className="text-xs font-medium text-slate-700">
                            {getTranslation("manage.reservationForm.reservationType")}
                          </Label>
                          <Select
                            value={formData.reservation_type}
                            onValueChange={(value) => handleInputChange("reservation_type", value)}
                          >
                            <SelectTrigger className={formFieldClassName}>
                              <SelectValue placeholder={getTranslation("manage.reservationForm.reservationTypePlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="meal">{getTranslation("manage.reservationForm.reservationTypeDining")}</SelectItem>
                              {(() => {
                                const selectedArea = areas.find(area => area.id === formData.reservation_area_id)
                                const selectedRestaurant = restaurants.find(r => r.id === formData.restaurant_id)
                                const isFelixMarinaTerraceArea = selectedArea && selectedRestaurant &&
                                  selectedRestaurant.name.toLowerCase().includes('felix') &&
                                  selectedRestaurant.name.toLowerCase().includes('marina') &&
                                  selectedArea.name.toLowerCase().includes('terrace')
                                const isTerraceOrDeck = selectedArea &&
                                  (selectedArea.name.toLowerCase().includes('terrace') || selectedArea.name.toLowerCase().includes('deck')) &&
                                  !isFelixMarinaTerraceArea
                                const restaurantMealOnly = selectedRestaurant?.meal_only_reservations

                                return !restaurantMealOnly && !isTerraceOrDeck && (
                                  <SelectItem value="drinks">{getTranslation("manage.reservationForm.reservationTypeDrinks")}</SelectItem>
                                )
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="reservation_date" className="text-xs font-medium text-slate-700">
                            {getTranslation("manage.reservationForm.date")}
                          </Label>
                          <Input
                            id="reservation_date"
                            type="date"
                            className={formFieldClassName}
                            value={formData.reservation_date}
                            onChange={(e) => handleInputChange("reservation_date", e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="reservation_time" className="text-xs font-medium text-slate-700">
                            {getTranslation("manage.reservationForm.time")}
                          </Label>
                          <Input
                            id="reservation_time"
                            type="time"
                            className={formFieldClassName}
                            value={formData.reservation_time}
                            onChange={(e) => handleInputChange("reservation_time", e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.08)] ring-1 ring-black/5">
                  <CardHeader className="border-b border-slate-100 bg-white/80 px-4 py-3">
                    <CardTitle className="text-sm font-semibold text-slate-950">
                      {getTranslation("manage.reservationForm.notesTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="special_requests" className="text-xs font-medium text-slate-700">
                        {getTranslation("manage.reservationForm.specialRequests")}
                      </Label>
                      <Textarea
                        id="special_requests"
                        value={formData.special_requests}
                        onChange={(e) => handleInputChange("special_requests", e.target.value)}
                        placeholder={getTranslation("manage.reservationForm.specialRequestsPlaceholder")}
                        rows={4}
                        className={textAreaClassName}
                      />
                    </div>
                  </CardContent>
                </Card>

                {renderPreviewPanel()}
              </form>
            </ScrollArea>

            <div className="border-t border-white/60 bg-white/70 px-4 py-3 backdrop-blur sm:px-5">
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={onClose} className="h-10 w-full rounded-xl sm:w-auto">
                  {getTranslation("manage.reservationForm.cancel")}
                </Button>
                <Button type="submit" form="reservation-form" disabled={loading} className="h-10 w-full rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800 sm:w-auto">
                  {loading
                    ? mode === "create"
                      ? getTranslation("manage.reservationForm.creating")
                      : getTranslation("manage.reservationForm.updating")
                    : mode === "create"
                    ? getTranslation("manage.reservationForm.create")
                    : getTranslation("manage.reservationForm.update")}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
