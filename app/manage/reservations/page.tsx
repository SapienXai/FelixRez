"use client"

import type React from "react"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getReservations, getRestaurants } from "../actions"
import { ReservationTable } from "@/components/manage/reservation-table"
import { ReservationForm } from "@/components/manage/reservation-form"
import { useLanguage } from "@/context/language-context"
import {
  readManageOfflineCache,
  writeManageOfflineCache,
  type ManageCachedReservation,
} from "@/lib/manage-offline-cache"

type Reservation = ManageCachedReservation
type RestaurantOption = { id: string; name: string; meal_only_reservations?: boolean }

function getLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function getDateWithOffset(offset: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return getLocalDateKey(date)
}

function applyReservationFilters(
  reservations: Reservation[],
  filters: {
    status?: string
    restaurantId?: string
    dateRange?: string
    searchQuery?: string
    reservationId?: string
  }
) {
  let filtered = reservations

  if (filters.status && filters.status !== "all") {
    filtered = filtered.filter((reservation) => reservation.status === filters.status)
  }

  if (filters.restaurantId && filters.restaurantId !== "all") {
    filtered = filtered.filter((reservation) => reservation.restaurant_id === filters.restaurantId)
  }

  if (filters.reservationId?.trim()) {
    filtered = filtered.filter((reservation) => reservation.id === filters.reservationId?.trim())
  }

  if (filters.dateRange === "today") {
    filtered = filtered.filter((reservation) => reservation.reservation_date === getDateWithOffset(0))
  } else if (filters.dateRange === "tomorrow") {
    filtered = filtered.filter((reservation) => reservation.reservation_date === getDateWithOffset(1))
  } else if (filters.dateRange === "week") {
    filtered = filtered.filter((reservation) => (
      reservation.reservation_date >= getDateWithOffset(0) &&
      reservation.reservation_date <= getDateWithOffset(7)
    ))
  } else if (filters.dateRange === "month") {
    filtered = filtered.filter((reservation) => (
      reservation.reservation_date >= getDateWithOffset(0) &&
      reservation.reservation_date <= getDateWithOffset(30)
    ))
  }

  if (filters.searchQuery?.trim()) {
    const searchTerm = filters.searchQuery.toLowerCase().trim()
    filtered = filtered.filter((reservation) => {
      const customerName = reservation.customer_name?.toLowerCase() || ""
      const customerPhone = reservation.customer_phone?.toLowerCase() || ""
      const customerEmail = reservation.customer_email?.toLowerCase() || ""
      const restaurantName = reservation.restaurants?.name?.toLowerCase() || ""
      const areaName = reservation.reservation_areas?.name?.toLowerCase() || ""

      return (
        customerName.includes(searchTerm) ||
        customerPhone.includes(searchTerm) ||
        customerEmail.includes(searchTerm) ||
        restaurantName.includes(searchTerm) ||
        areaName.includes(searchTerm)
      )
    })
  }

  return [...filtered].sort((a, b) => {
    const createdCompare = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (createdCompare !== 0) return createdCompare
    const dateCompare = b.reservation_date.localeCompare(a.reservation_date)
    if (dateCompare !== 0) return dateCompare
    return b.reservation_time.localeCompare(a.reservation_time)
  })
}

function ReservationsPageContent() {
  const { getTranslation } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [offlineMode, setOfflineMode] = useState(false)
  const [offlineSyncedAt, setOfflineSyncedAt] = useState<string | null>(null)
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
  const offlineModeRef = useRef(false)
  const restaurantsRef = useRef<RestaurantOption[]>([])

  useEffect(() => {
    restaurantsRef.current = restaurants
  }, [restaurants])

  const loadReservationsFromOfflineCache = useCallback(() => {
    const cache = readManageOfflineCache()
    offlineModeRef.current = true
    setOfflineMode(true)
    setOfflineSyncedAt(cache?.syncedAt || null)
    setShowCreateForm(false)
    setReservations(cache ? applyReservationFilters(cache.reservations, filters) : [])
    if (cache?.restaurants.length) {
      setRestaurants(cache.restaurants)
    }
  }, [filters])

  const refreshManageEmergencyCache = useCallback(async (restaurantOptions: RestaurantOption[]) => {
    try {
      const result = await getReservations({
        status: "all",
        restaurantId: "all",
        dateRange: "week",
        searchQuery: "",
        reservationId: "",
      })

      if (result.success) {
        const cache = writeManageOfflineCache({
          reservations: (result.data || []) as Reservation[],
          restaurants: restaurantOptions,
        })
        if (cache) {
          setOfflineSyncedAt(cache.syncedAt)
        }
      }
    } catch (error) {
      console.error("Error refreshing manage offline cache:", error)
    }
  }, [])

  const flushCurrentReservationsToOfflineCache = useCallback(() => {
    if (reservations.length === 0 && restaurants.length === 0) {
      return
    }

    const cache = writeManageOfflineCache({
      reservations,
      restaurants,
    })
    if (cache) {
      setOfflineSyncedAt(cache.syncedAt)
    }
  }, [reservations, restaurants])

  const fetchReservations = useCallback(async ({ fullLoader = false }: { fullLoader?: boolean } = {}) => {
    const shouldUseFullLoader = fullLoader || !hasLoadedReservationsRef.current

    if (offlineModeRef.current || (typeof navigator !== "undefined" && !navigator.onLine)) {
      loadReservationsFromOfflineCache()
      hasLoadedReservationsRef.current = true
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    if (shouldUseFullLoader) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }
    try {
      const result = await getReservations(filters)
      if (result.success) {
        setOfflineMode(false)
        setReservations((result.data || []) as Reservation[])
        void refreshManageEmergencyCache(restaurantsRef.current)
      } else {
        loadReservationsFromOfflineCache()
      }
    } catch (error) {
      console.error("Error fetching reservations:", error)
      loadReservationsFromOfflineCache()
    } finally {
      hasLoadedReservationsRef.current = true
      if (shouldUseFullLoader) {
        setIsLoading(false)
      } else {
        setIsRefreshing(false)
      }
    }
  }, [filters, loadReservationsFromOfflineCache, refreshManageEmergencyCache])

  useEffect(() => {
    const initializePage = async () => {
      try {
        await supabase.auth.getSession()
        const restaurantsResult = await getRestaurants()
        if (restaurantsResult.success) {
          setRestaurants(restaurantsResult.data || [])
          void refreshManageEmergencyCache(restaurantsResult.data || [])
          return
        }
      } catch (error) {
        console.error("Error initializing reservations page:", error)
      }

      const cache = readManageOfflineCache()
      if (cache?.restaurants.length) {
        setRestaurants(cache.restaurants)
      }
      if (!hasLoadedReservationsRef.current) {
        const cache = readManageOfflineCache()
        setOfflineSyncedAt(cache?.syncedAt || null)
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
  }, [refreshManageEmergencyCache, supabase])

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

  useEffect(() => {
    offlineModeRef.current = offlineMode
  }, [offlineMode])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOffline = () => {
      if (offlineModeRef.current) {
        return
      }

      offlineModeRef.current = true
      flushCurrentReservationsToOfflineCache()
      loadReservationsFromOfflineCache()
      hasLoadedReservationsRef.current = true
      setIsLoading(false)
      setIsRefreshing(false)
    }

    const handleOnline = () => {
      offlineModeRef.current = false
      void fetchReservations({ fullLoader: false })
    }

    if (!navigator.onLine) {
      handleOffline()
    }

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [fetchReservations, flushCurrentReservationsToOfflineCache, loadReservationsFromOfflineCache])

  // Auto-fetch reservations when filters change
  useEffect(() => {
    if (offlineModeRef.current || (typeof navigator !== "undefined" && !navigator.onLine)) {
      loadReservationsFromOfflineCache()
      return
    }

    const timeoutId = setTimeout(() => {
      fetchReservations()
    }, 300) // Debounce search by 300ms

    return () => clearTimeout(timeoutId)
  }, [filters, fetchReservations, loadReservationsFromOfflineCache])

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
      <div className="flex items-center space-x-3 mb-6">
        <h1 className="text-xl md:text-2xl font-semibold">{getTranslation("manage.reservations.title")}</h1>
        {!offlineMode ? (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-black hover:bg-gray-800 text-white text-xs px-2 py-1 h-7"
            size="sm"
          >
            + {getTranslation("manage.reservations.list.addReservation")}
          </Button>
        ) : null}
      </div>

      {offlineMode ? (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardContent className="p-3 text-sm text-amber-900">
            <div className="font-medium">{getTranslation("manage.offline.title")}</div>
            <div>
              {offlineSyncedAt
                ? getTranslation("manage.offline.description", {
                    syncedAt: new Date(offlineSyncedAt).toLocaleString(getTranslation("common.locale") || "en-US"),
                  })
                : getTranslation("manage.offline.noCache")}
            </div>
          </CardContent>
        </Card>
      ) : null}

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
        </CardHeader>
        <CardContent>
          <ReservationTable
            reservations={reservations}
            onRefresh={handleRefresh}
            itemsPerPage={20}
            readOnly={offlineMode}
            emptyMessage={offlineMode && !offlineSyncedAt ? getTranslation("manage.offline.empty") : undefined}
          />
        </CardContent>
      </Card>

      {showCreateForm && !offlineMode && (
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
