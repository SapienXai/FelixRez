"use client"

import type React from "react"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { getReservations, getRestaurants } from "../actions"
import { ReservationTable } from "@/components/manage/reservation-table"
import { ReservationForm } from "@/components/manage/reservation-form"
import { useLanguage } from "@/context/language-context"
import type { Database } from "@/types/supabase"

type Reservation = Database['public']['Tables']['reservations']['Row']
type RestaurantOption = { id: string; name: string; meal_only_reservations?: boolean }

function ReservationsPageContent() {
  const { getTranslation } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState({
    status: "all",
    restaurantId: "all",
    dateRange: "all",
    searchQuery: "",
    reservationId: "",
  })
  const supabase = getSupabaseBrowserClient()
  const hasLoadedReservationsRef = useRef(false)

  const fetchReservations = useCallback(async ({ fullLoader = false }: { fullLoader?: boolean } = {}) => {
    const shouldUseFullLoader = fullLoader || !hasLoadedReservationsRef.current

    if (shouldUseFullLoader) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }
    try {
      const result = await getReservations(filters)
      if (result.success) {
        setReservations(result.data)
      }
    } catch (error) {
      console.error("Error fetching reservations:", error)
    } finally {
      hasLoadedReservationsRef.current = true
      if (shouldUseFullLoader) {
        setIsLoading(false)
      } else {
        setIsRefreshing(false)
      }
    }
  }, [filters])

  useEffect(() => {
    const initializePage = async () => {
      await supabase.auth.getSession()
      const restaurantsResult = await getRestaurants()
      if (restaurantsResult.success) {
        setRestaurants(restaurantsResult.data || [])
      }
    }

    // Check URL parameters for auto-opening create form
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('action') === 'new') {
      setShowCreateForm(true)
      // Clean up URL without refreshing
      window.history.replaceState({}, '', '/manage/reservations')
    }

    initializePage()
  }, [supabase])

  useEffect(() => {
    const reservationId = searchParams.get("reservationId")
    if (reservationId) {
      setFilters({
        status: "all",
        restaurantId: "all",
        dateRange: "all",
        searchQuery: "",
        reservationId,
      })
    }
  }, [searchParams])

  // Auto-fetch reservations when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchReservations()
    }, 300) // Debounce search by 300ms

    return () => clearTimeout(timeoutId)
  }, [filters, fetchReservations])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchReservations({ fullLoader: false })
  }

  const handleRefresh = () => {
    fetchReservations({ fullLoader: false })
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">{getTranslation("manage.common.loadingReservations")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-semibold mb-6">{getTranslation("manage.reservations.title")}</h1>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                {getTranslation("manage.reservations.filters.status")}
              </label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder={getTranslation("manage.reservations.filters.statusPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{getTranslation("manage.reservations.filters.statusAll")}</SelectItem>
                  <SelectItem value="pending">{getTranslation("manage.reservations.filters.statusPending")}</SelectItem>
                  <SelectItem value="confirmed">
                    {getTranslation("manage.reservations.filters.statusConfirmed")}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {getTranslation("manage.reservations.filters.statusCancelled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                {getTranslation("manage.reservations.filters.dateRange")}
              </label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => handleFilterChange("dateRange", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={getTranslation("manage.reservations.filters.dateRangePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{getTranslation("manage.reservations.filters.dateAll")}</SelectItem>
                  <SelectItem value="today">{getTranslation("manage.reservations.filters.dateToday")}</SelectItem>
                  <SelectItem value="tomorrow">
                    {getTranslation("manage.reservations.filters.dateTomorrow")}
                  </SelectItem>
                  <SelectItem value="week">{getTranslation("manage.reservations.filters.dateWeek")}</SelectItem>
                  <SelectItem value="month">{getTranslation("manage.reservations.filters.dateMonth")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="text-sm font-medium mb-1 block">
                {getTranslation("manage.reservations.filters.search")}
              </label>
              <Input
                placeholder={getTranslation("manage.reservations.filters.searchPlaceholder")}
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
              />
            </div>

            <div className="col-span-2 flex items-end">
              <Button type="submit" className="mr-2">
                {getTranslation("manage.reservations.filters.apply")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFilters({
                    status: "all",
                    restaurantId: "all",
                    dateRange: "all",
                    searchQuery: "",
                    reservationId: "",
                  })
                  window.history.replaceState({}, '', '/manage/reservations')
                  setTimeout(fetchReservations, 0)
                }}
              >
                {getTranslation("manage.reservations.filters.reset")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{getTranslation("manage.reservations.list.title")}</CardTitle>
            <CardDescription>
              {getTranslation("manage.reservations.list.showing", { count: String(reservations.length) })}
              {isRefreshing ? ` · ${getTranslation("manage.common.loadingReservations")}` : ""}
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreateForm(true)} size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {getTranslation("manage.reservations.list.addReservation")}
          </Button>
        </CardHeader>
        <CardContent>
          <ReservationTable reservations={reservations} onRefresh={handleRefresh} itemsPerPage={20} />
        </CardContent>
      </Card>

      {showCreateForm && (
        <ReservationForm
          isOpen={showCreateForm}
          mode="create"
          restaurants={restaurants}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false)
            fetchReservations({ fullLoader: false })
          }}
        />
      )}
    </div>
  )
}

export default function ReservationsPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-700">Loading reservations...</p>
          </div>
        </div>
      }
    >
      <ReservationsPageContent />
    </Suspense>
  )
}
