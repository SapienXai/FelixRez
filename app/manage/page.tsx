"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  Calendar,
  CalendarClock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  UtensilsCrossed,
  Users,
  XCircle,
} from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { TriangleLoader } from "@/components/ui/triangle-loader"
import { ReservationList, type ReservationMutationChange } from "@/components/manage/reservation-list"
import { ReservationForm } from "@/components/manage/reservation-form"
import { useLanguage } from "@/context/language-context"
import { useManageContext } from "@/context/manage-context"
import { getRestaurants } from "./actions"
import {
  getDashboardData,
  getDashboardReservationById,
  getDashboardStats,
  type DashboardSnapshot,
  type DashboardStats,
} from "./dashboard-actions"
import type { Database } from "@/types/supabase"

type ReservationRecord = Database["public"]["Tables"]["reservations"]["Row"] & {
  restaurants?: { id: string; name: string } | null
  reservation_areas?: { id: string; name: string } | null
  booked_by_email?: string | null
  booked_by_label?: string | null
  booked_by_name?: string | null
}

type RestaurantOption = {
  id: string
  name: string
  meal_only_reservations?: boolean
}

type StatusFilter = "all" | "pending" | "confirmed" | "cancelled"
type MetricFilter = "all" | "kuver" | "meal" | "deck" | "terrace"
type OperationFilter = "latest" | "date"

const EMPTY_STATS: DashboardStats = {
  total: 0,
  pending: 0,
  confirmed: 0,
  cancelled: 0,
  percentChange: 0,
  totalKuver: 0,
  totalMealReservations: 0,
  deckKuvers: 0,
  terraceKuvers: 0,
}

const STATS_FIELDS: Array<keyof ReservationRecord> = [
  "status",
  "party_size",
  "reservation_date",
  "restaurant_id",
  "reservation_area_id",
  "reservation_type",
]

function normalizeRestaurantFilter(restaurantId?: string) {
  return restaurantId && restaurantId !== "all" ? restaurantId : undefined
}

function getLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function getDateWithOffset(offset: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return date
}

function getCompactDateLabel(date: Date, locale?: string) {
  return date.toLocaleDateString(locale || "en-US", {
    month: "short",
    day: "numeric",
  })
}

function getDayFilterLabel(date: Date, offset: number, locale?: string) {
  const dayNumber = date.getDate()
  if (offset === 0) return `Today ${dayNumber}`
  if (offset === 1) return `Tomorrow ${dayNumber}`

  const weekday = date.toLocaleDateString(locale || "en-US", { weekday: "short" })
  return `${weekday} ${dayNumber}`
}

function isCreatedToday(reservation: ReservationRecord) {
  return getLocalDateKey(new Date(reservation.created_at)) === getLocalDateKey()
}

function isUpcomingReservation(reservation: ReservationRecord) {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const next30Days = new Date(tomorrow)
  next30Days.setDate(next30Days.getDate() + 29)

  const tomorrowKey = getLocalDateKey(tomorrow)
  const next30DaysKey = getLocalDateKey(next30Days)
  return reservation.reservation_date >= tomorrowKey && reservation.reservation_date <= next30DaysKey
}

function sortByCreatedDesc(a: ReservationRecord, b: ReservationRecord) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}

function sortByReservationDateTimeAsc(a: ReservationRecord, b: ReservationRecord) {
  const dateCompare = a.reservation_date.localeCompare(b.reservation_date)
  if (dateCompare !== 0) return dateCompare
  return a.reservation_time.localeCompare(b.reservation_time)
}

function removeReservation(list: ReservationRecord[], reservationId: string) {
  return list.filter((reservation) => reservation.id !== reservationId)
}

function upsertReservation(
  list: ReservationRecord[],
  reservation: ReservationRecord,
  sortFn: (a: ReservationRecord, b: ReservationRecord) => number,
  limit?: number
) {
  const next = [reservation, ...list.filter((item) => item.id !== reservation.id)].sort(sortFn)
  return typeof limit === "number" ? next.slice(0, limit) : next
}

function statsChanged(previous?: ReservationRecord | null, next?: ReservationRecord | null) {
  if (!previous || !next) {
    return true
  }

  return STATS_FIELDS.some((field) => previous[field] !== next[field])
}

function getReservationAreaName(reservation: ReservationRecord) {
  return reservation.reservation_areas?.name?.toLowerCase() ?? ""
}

function matchesMetricFilter(reservation: ReservationRecord, metricFilter: MetricFilter) {
  if (metricFilter === "all") {
    return true
  }

  if (metricFilter === "meal") {
    return reservation.reservation_type === "meal"
  }

  if (metricFilter === "kuver") {
    return reservation.status === "confirmed"
  }

  const areaName = getReservationAreaName(reservation)
  if (metricFilter === "deck") {
    return reservation.status === "confirmed" && areaName.includes("deck")
  }

  if (metricFilter === "terrace") {
    return reservation.status === "confirmed" && areaName.includes("terrace")
  }

  return true
}

function getStatusFilterLabel(statusFilter: StatusFilter) {
  if (statusFilter === "pending") return "Pending"
  if (statusFilter === "confirmed") return "Confirmed"
  if (statusFilter === "cancelled") return "Cancelled"
  return "All"
}

function getMetricFilterLabel(metricFilter: MetricFilter) {
  if (metricFilter === "kuver") return "Total Kuver"
  if (metricFilter === "meal") return "Meal Reservations"
  if (metricFilter === "deck") return "Deck"
  if (metricFilter === "terrace") return "Terrace"
  return "All"
}

export default function ManageDashboard() {
  const { getTranslation } = useLanguage()
  const { role, isSuperAdmin, loading: roleLoading } = useManageContext()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isStatsLoading, setIsStatsLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [newReservations, setNewReservations] = useState<ReservationRecord[]>([])
  const [newTodayReservations, setNewTodayReservations] = useState<ReservationRecord[]>([])
  const [, setTodayReservations] = useState<ReservationRecord[]>([])
  const [, setUpcomingReservations] = useState<ReservationRecord[]>([])
  const [selectedDateReservations, setSelectedDateReservations] = useState<ReservationRecord[]>([])
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("all")
  const [selectedRestaurant, setSelectedRestaurant] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>(() => getDateWithOffset(0))
  const [operationFilter, setOperationFilter] = useState<OperationFilter>("date")
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [cardsExpanded, setCardsExpanded] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const hasLoadedInitialDataRef = useRef(false)
  const lastLoadedDashboardFiltersRef = useRef<{
    restaurantId: string
    dateKey: string
    operationFilter: OperationFilter
  } | null>(null)
  const dashboardRequestIdRef = useRef(0)
  const statsRequestIdRef = useRef(0)
  const ignoredRealtimeIdsRef = useRef<Set<string>>(new Set())
  const statsRefreshTimerRef = useRef<number | null>(null)
  const dashboardFiltersRef = useRef<{
    restaurantId: string
    dateKey: string
    operationFilter: OperationFilter
  }>({
    restaurantId: "",
    dateKey: getLocalDateKey(),
    operationFilter: "date",
  })

  const selectedDateKey = useMemo(
    () => format(selectedDate, "yyyy-MM-dd"),
    [selectedDate]
  )

  const dayFilterOptions = useMemo(() => (
    [0, 1, 2, 3].map((offset) => {
      const date = getDateWithOffset(offset)
      return {
        date,
        dateKey: getLocalDateKey(date),
        label: getDayFilterLabel(date, offset, getTranslation("common.locale")),
      }
    })
  ), [getTranslation])

  const operationFilterLabel = useMemo(() => {
    if (operationFilter === "latest") {
      return "Latest"
    }

    const preset = dayFilterOptions.find((option) => option.dateKey === selectedDateKey)
    return preset?.label ?? getCompactDateLabel(selectedDate, getTranslation("common.locale"))
  }, [dayFilterOptions, getTranslation, operationFilter, selectedDate, selectedDateKey])

  const setDashboardSnapshot = useCallback((snapshot: DashboardSnapshot) => {
    setStats(snapshot.stats)
    setNewReservations(snapshot.newReservations as ReservationRecord[])
    setNewTodayReservations(snapshot.newTodayReservations as ReservationRecord[])
    setTodayReservations(snapshot.todayReservations as ReservationRecord[])
    setUpcomingReservations(snapshot.upcomingReservations as ReservationRecord[])
    setSelectedDateReservations(snapshot.selectedDateReservations as ReservationRecord[])
  }, [])

  useEffect(() => {
    dashboardFiltersRef.current = {
      restaurantId: selectedRestaurant,
      dateKey: selectedDateKey,
      operationFilter,
    }
  }, [operationFilter, selectedRestaurant, selectedDateKey])

  const refreshStats = useCallback(async (
    restaurantId?: string,
    dateKey?: string,
    nextOperationFilter?: OperationFilter
  ) => {
    const filters = dashboardFiltersRef.current
    const targetRestaurantId = restaurantId ?? filters.restaurantId
    const targetDateKey = dateKey ?? filters.dateKey
    const targetOperationFilter = nextOperationFilter ?? filters.operationFilter
    const requestId = ++statsRequestIdRef.current
    setIsStatsLoading(true)

    try {
      const result = await getDashboardStats(
        normalizeRestaurantFilter(targetRestaurantId),
        targetOperationFilter === "latest" ? undefined : targetDateKey,
        targetOperationFilter === "latest" ? "latest" : "daily"
      )
      if (statsRequestIdRef.current !== requestId) {
        return
      }

      if (result.success && result.stats) {
        setStats(result.stats)
      }
    } catch (error) {
      console.error("Error refreshing dashboard stats:", error)
    } finally {
      if (statsRequestIdRef.current === requestId) {
        setIsStatsLoading(false)
      }
    }
  }, [])

  const scheduleStatsRefresh = useCallback(() => {
    if (statsRefreshTimerRef.current) {
      window.clearTimeout(statsRefreshTimerRef.current)
    }

    statsRefreshTimerRef.current = window.setTimeout(() => {
      void refreshStats()
    }, 150)
  }, [refreshStats])

  const fetchDashboardSnapshot = useCallback(async ({
    restaurantId,
    dateKey,
    operationFilter: nextOperationFilter,
    fullLoader = false,
  }: {
    restaurantId?: string
    dateKey?: string
    operationFilter?: OperationFilter
    fullLoader?: boolean
  } = {}) => {
    const filters = dashboardFiltersRef.current
    const targetRestaurantId = restaurantId ?? filters.restaurantId
    const targetDateKey = dateKey ?? filters.dateKey
    const targetOperationFilter = nextOperationFilter ?? filters.operationFilter
    const requestId = ++dashboardRequestIdRef.current

    if (fullLoader) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    try {
      setDashboardError(null)
      const result = await getDashboardData(
        normalizeRestaurantFilter(targetRestaurantId),
        targetOperationFilter === "latest" ? undefined : targetDateKey,
        targetOperationFilter === "latest" ? "latest" : "daily"
      )
      if (dashboardRequestIdRef.current !== requestId) {
        return
      }

      if (result.success && result.data) {
        setDashboardSnapshot(result.data)
        lastLoadedDashboardFiltersRef.current = {
          restaurantId: targetRestaurantId,
          dateKey: targetDateKey,
          operationFilter: targetOperationFilter,
        }
      } else {
        setDashboardError(result.message || "Could not load dashboard data.")
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setDashboardError("Could not load dashboard data.")
    } finally {
      if (dashboardRequestIdRef.current === requestId) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [setDashboardSnapshot])

  const ignoreNextRealtimeEvent = useCallback((reservationId: string) => {
    ignoredRealtimeIdsRef.current.add(reservationId)
    window.setTimeout(() => {
      ignoredRealtimeIdsRef.current.delete(reservationId)
    }, 2500)
  }, [])

  const matchesCurrentRestaurant = useCallback((reservation: ReservationRecord) => {
    return !selectedRestaurant || selectedRestaurant === "all" || reservation.restaurant_id === selectedRestaurant
  }, [selectedRestaurant])

  const applyReservationChange = useCallback((change: ReservationMutationChange) => {
    const reservation = change.reservation as ReservationRecord | null | undefined
    const reservationId = change.reservationId || reservation?.id || change.previousReservation?.id

    if (!reservationId) {
      void fetchDashboardSnapshot()
      return
    }

    if (change.type === "delete") {
      setNewReservations((prev) => removeReservation(prev, reservationId))
      setNewTodayReservations((prev) => removeReservation(prev, reservationId))
      setTodayReservations((prev) => removeReservation(prev, reservationId))
      setUpcomingReservations((prev) => removeReservation(prev, reservationId))
      setSelectedDateReservations((prev) => removeReservation(prev, reservationId))
      scheduleStatsRefresh()
      return
    }

    if (!reservation) {
      void fetchDashboardSnapshot()
      return
    }

    const visibleForRestaurant = matchesCurrentRestaurant(reservation)
    const todayKey = getLocalDateKey()
    const selectedKey = selectedDateKey

    setNewReservations((prev) => (
      visibleForRestaurant
        ? upsertReservation(prev, reservation, sortByCreatedDesc, 20)
        : removeReservation(prev, reservation.id)
    ))
    setNewTodayReservations((prev) => (
      visibleForRestaurant && isCreatedToday(reservation)
        ? upsertReservation(prev, reservation, sortByCreatedDesc)
        : removeReservation(prev, reservation.id)
    ))
    setTodayReservations((prev) => (
      visibleForRestaurant && reservation.reservation_date === todayKey
        ? upsertReservation(prev, reservation, sortByReservationDateTimeAsc)
        : removeReservation(prev, reservation.id)
    ))
    setUpcomingReservations((prev) => (
      visibleForRestaurant && isUpcomingReservation(reservation)
        ? upsertReservation(prev, reservation, sortByReservationDateTimeAsc)
        : removeReservation(prev, reservation.id)
    ))
    setSelectedDateReservations((prev) => (
      visibleForRestaurant && selectedKey && reservation.reservation_date === selectedKey
        ? upsertReservation(prev, reservation, sortByReservationDateTimeAsc)
        : removeReservation(prev, reservation.id)
    ))

    const shouldRefreshStats = change.statsDirty ?? statsChanged(
      change.previousReservation as ReservationRecord | null | undefined,
      reservation
    )
    if (shouldRefreshStats) {
      scheduleStatsRefresh()
    }
  }, [fetchDashboardSnapshot, matchesCurrentRestaurant, scheduleStatsRefresh, selectedDateKey])

  const handleReservationChange = useCallback((change: ReservationMutationChange) => {
    const reservationId = change.reservationId || change.reservation?.id || change.previousReservation?.id
    if (reservationId) {
      ignoreNextRealtimeEvent(reservationId)
    }

    applyReservationChange(change)
  }, [applyReservationChange, ignoreNextRealtimeEvent])

  useEffect(() => {
    if (roleLoading) {
      return
    }

    let cancelled = false

    const loadInitialDashboard = async () => {
      setIsLoading(true)
      try {
        setDashboardError(null)
        const { data } = await supabase.auth.getSession()
        const restaurantResult = await getRestaurants()
        const restaurantData = restaurantResult.success ? (restaurantResult.data || []) : []
        const isGlobalUser = Boolean(data.session) && (isSuperAdmin || role === "manager")
        const initialRestaurant = isGlobalUser ? "all" : restaurantData[0]?.id || "all"

        if (cancelled) return

        setRestaurants(restaurantData)
        setSelectedRestaurant(initialRestaurant)

        const initialDateKey = getLocalDateKey()
        const dashboardResult = await getDashboardData(normalizeRestaurantFilter(initialRestaurant), initialDateKey, "daily")
        if (cancelled) return

        if (dashboardResult.success && dashboardResult.data) {
          setDashboardSnapshot(dashboardResult.data)
          lastLoadedDashboardFiltersRef.current = {
            restaurantId: initialRestaurant,
            dateKey: initialDateKey,
            operationFilter: "date",
          }
        } else {
          setDashboardError(dashboardResult.message || "Could not load dashboard data.")
        }

        hasLoadedInitialDataRef.current = true
      } catch (error) {
        console.error("Error loading dashboard:", error)
        setDashboardError("Could not load dashboard data.")
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialDashboard()

    return () => {
      cancelled = true
    }
  }, [roleLoading, role, isSuperAdmin, supabase, setDashboardSnapshot])

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        await fetch("/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event, session }),
        })
      } catch {}

      if (event === "SIGNED_OUT") {
        router.replace("/manage/login")
      }
    })

    return () => subscription?.subscription?.unsubscribe?.()
  }, [router, supabase])

  useEffect(() => {
    if (!hasLoadedInitialDataRef.current) {
      return
    }

    const lastLoadedFilters = lastLoadedDashboardFiltersRef.current
    if (
      lastLoadedFilters &&
      lastLoadedFilters.restaurantId === selectedRestaurant &&
      lastLoadedFilters.dateKey === selectedDateKey &&
      lastLoadedFilters.operationFilter === operationFilter
    ) {
      return
    }

    void fetchDashboardSnapshot()
  }, [fetchDashboardSnapshot, operationFilter, selectedDateKey, selectedRestaurant])

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-reservations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
        },
        async (payload: any) => {
          const reservationId = payload.new?.id || payload.old?.id
          if (!reservationId) {
            return
          }

          if (ignoredRealtimeIdsRef.current.has(reservationId)) {
            ignoredRealtimeIdsRef.current.delete(reservationId)
            return
          }

          if (payload.eventType === "DELETE") {
            applyReservationChange({
              type: "delete",
              reservationId,
              statsDirty: true,
            })
            return
          }

          const result = await getDashboardReservationById(reservationId, normalizeRestaurantFilter(selectedRestaurant))
          if (result.success && result.data) {
            applyReservationChange({
              type: payload.eventType === "INSERT" ? "create" : "update",
              reservation: result.data as ReservationRecord,
              statsDirty: true,
            })
          } else if (payload.eventType === "UPDATE") {
            applyReservationChange({
              type: "delete",
              reservationId,
              statsDirty: true,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [applyReservationChange, selectedRestaurant, supabase])

  useEffect(() => {
    return () => {
      if (statsRefreshTimerRef.current) {
        window.clearTimeout(statsRefreshTimerRef.current)
      }
    }
  }, [])

  const handleStatusFilter = useCallback((nextStatusFilter: StatusFilter) => {
    setStatusFilter(nextStatusFilter)
    setMetricFilter("all")
  }, [])

  const handleMetricFilter = useCallback((nextMetricFilter: MetricFilter) => {
    setMetricFilter((currentMetricFilter) => (currentMetricFilter === nextMetricFilter ? "all" : nextMetricFilter))
    setStatusFilter("all")
  }, [])

  const handleLatestFilter = useCallback(() => {
    setSelectedDate(getDateWithOffset(0))
    setOperationFilter("latest")
    setDatePopoverOpen(false)
  }, [])

  const handleDateFilter = useCallback((date: Date) => {
    setSelectedDate(date)
    setOperationFilter("date")
    setDatePopoverOpen(false)
  }, [])

  const activeFilterLabel = useMemo(() => {
    if (metricFilter !== "all") {
      return getMetricFilterLabel(metricFilter)
    }

    if (statusFilter !== "all") {
      return getStatusFilterLabel(statusFilter)
    }

    return null
  }, [metricFilter, statusFilter])

  const filterReservations = useCallback((reservations: ReservationRecord[]) => {
    let filtered = reservations
    if (selectedRestaurant !== "all") {
      filtered = filtered.filter((reservation) => reservation.restaurant_id === selectedRestaurant)
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((reservation) => reservation.status === statusFilter)
    }
    if (metricFilter !== "all") {
      filtered = filtered.filter((reservation) => matchesMetricFilter(reservation, metricFilter))
    }
    return filtered
  }, [metricFilter, selectedRestaurant, statusFilter])

  const filteredNewReservations = useMemo(
    () => filterReservations(newReservations),
    [filterReservations, newReservations]
  )
  const filteredNewTodayReservations = useMemo(
    () => filterReservations(newTodayReservations),
    [filterReservations, newTodayReservations]
  )
  const filteredSelectedDateReservations = useMemo(
    () => filterReservations(selectedDateReservations),
    [filterReservations, selectedDateReservations]
  )
  const operationReservations = operationFilter === "latest"
    ? filteredNewReservations
    : filteredSelectedDateReservations
  const operationCount = operationReservations.length
  const operationTitle = operationFilter === "latest"
    ? "Latest reservations"
    : `Reservations for ${operationFilterLabel}`
  const operationDescription = operationFilter === "latest"
    ? `${filteredNewTodayReservations.length} created today, ${filteredNewReservations.length} latest reservations shown`
    : `${operationCount} reservations for ${operationFilterLabel}`
  const statsDateLabel = operationFilter === "latest" ? "Last 24 Hours" : operationFilterLabel
  const totalStatsLabel = operationFilter === "date" && selectedDateKey === getLocalDateKey()
    ? getTranslation("manage.dashboard.stats.total")
    : `${statsDateLabel} Reservations`
  const kuverDateLabel = operationFilter === "date" && selectedDateKey === getLocalDateKey()
    ? "today"
    : statsDateLabel.toLowerCase()
  const defaultFormRestaurantId = normalizeRestaurantFilter(selectedRestaurant)

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">{getTranslation("manage.common.loadingDashboard")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl md:text-2xl font-semibold">{getTranslation("manage.dashboard.title")}</h1>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-black hover:bg-gray-800 text-white text-xs px-2 py-1 h-7"
            size="sm"
          >
            + {getTranslation("manage.reservations.list.addReservation")}
          </Button>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[420px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full min-w-0 justify-between px-3 text-sm font-normal"
                aria-label="Operation filter"
              >
                <span className="truncate">{operationFilterLabel}</span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(92vw,340px)] p-2" align="end">
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant={operationFilter === "latest" ? "default" : "ghost"}
                  className="h-9 justify-start text-sm"
                  onClick={handleLatestFilter}
                >
                  Latest
                </Button>
                {dayFilterOptions.map((option) => (
                  <Button
                    key={option.dateKey}
                    type="button"
                    variant={operationFilter === "date" && selectedDateKey === option.dateKey ? "default" : "ghost"}
                    className="h-9 justify-start text-sm"
                    onClick={() => handleDateFilter(option.date)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <div className="mt-2 border-t pt-2">
                <div className="mb-2 flex items-center gap-2 px-2 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Pick date
                </div>
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      handleDateFilter(date)
                    }
                  }}
                  initialFocus
                />
              </div>
            </PopoverContent>
          </Popover>

          <div className="min-w-0">
            <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder={getTranslation("manage.dashboard.filter.allRestaurants")} />
              </SelectTrigger>
              <SelectContent>
                {isSuperAdmin && (
                  <SelectItem value="all">{getTranslation("manage.dashboard.filter.allRestaurants")}</SelectItem>
                )}
                {restaurants.map((restaurant) => (
                  <SelectItem key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-2 transition-all duration-300">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "all" && metricFilter === "all" ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => handleStatusFilter("all")}
            role="button"
            aria-pressed={statusFilter === "all" && metricFilter === "all"}
          >
            <CardContent className="p-2.5 md:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">
                    {totalStatsLabel}
                  </p>
                  <p className="text-lg md:text-xl font-bold">{stats.total}</p>
                </div>
                <div className="rounded-full bg-blue-100 p-1.5 text-blue-600">
                  <CalendarClock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${metricFilter === "kuver" ? "ring-2 ring-purple-500" : ""}`}
            onClick={() => handleMetricFilter("kuver")}
            role="button"
            aria-pressed={metricFilter === "kuver"}
          >
            <CardContent className="p-2.5 md:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Kuver</p>
                  <p className="text-lg md:text-xl font-bold">{stats.totalKuver}</p>
                </div>
                <div className="rounded-full bg-purple-100 p-1.5 text-purple-600">
                  <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "pending" ? "ring-2 ring-yellow-500" : ""}`}
            onClick={() => handleStatusFilter("pending")}
            role="button"
            aria-pressed={statusFilter === "pending"}
          >
            <CardContent className="p-2.5 md:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">
                    {getTranslation("manage.dashboard.stats.pending")}
                  </p>
                  <p className="text-lg md:text-xl font-bold">{stats.pending}</p>
                </div>
                <div className="rounded-full bg-yellow-100 p-1.5 text-yellow-600">
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "cancelled" ? "ring-2 ring-red-500" : ""}`}
            onClick={() => handleStatusFilter("cancelled")}
            role="button"
            aria-pressed={statusFilter === "cancelled"}
          >
            <CardContent className="p-2.5 md:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">
                    {getTranslation("manage.dashboard.stats.cancelled")}
                  </p>
                  <p className="text-lg md:text-xl font-bold">{stats.cancelled}</p>
                </div>
                <div className="rounded-full bg-red-100 p-1.5 text-red-600">
                  <XCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {cardsExpanded ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-2 mt-2 transition-all duration-300">
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "confirmed" ? "ring-2 ring-green-500" : ""}`}
              onClick={() => handleStatusFilter("confirmed")}
              role="button"
              aria-pressed={statusFilter === "confirmed"}
            >
              <CardContent className="p-2.5 md:p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">
                      {getTranslation("manage.dashboard.stats.confirmed")}
                    </p>
                    <p className="text-lg md:text-xl font-bold">{stats.confirmed}</p>
                  </div>
                  <div className="rounded-full bg-green-100 p-1.5 text-green-600">
                    <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${metricFilter === "meal" ? "ring-2 ring-orange-500" : ""}`}
              onClick={() => handleMetricFilter("meal")}
              role="button"
              aria-pressed={metricFilter === "meal"}
            >
              <CardContent className="p-2.5 md:p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">Meal Reservations</p>
                    <p className="text-lg md:text-xl font-bold">{stats.totalMealReservations}</p>
                  </div>
                  <div className="rounded-full bg-orange-100 p-1.5 text-orange-600">
                    <UtensilsCrossed className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Food reservations</p>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${metricFilter === "deck" ? "ring-2 ring-teal-500" : ""}`}
              onClick={() => handleMetricFilter("deck")}
              role="button"
              aria-pressed={metricFilter === "deck"}
            >
              <CardContent className="p-2.5 md:p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">Deck</p>
                    <p className="text-lg md:text-xl font-bold">{stats.deckKuvers}</p>
                  </div>
                  <div className="rounded-full bg-teal-100 p-1.5 text-teal-600">
                    <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Kuvers {kuverDateLabel}</p>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${metricFilter === "terrace" ? "ring-2 ring-emerald-500" : ""}`}
              onClick={() => handleMetricFilter("terrace")}
              role="button"
              aria-pressed={metricFilter === "terrace"}
            >
              <CardContent className="p-2.5 md:p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">Terrace</p>
                    <p className="text-lg md:text-xl font-bold">{stats.terraceKuvers}</p>
                  </div>
                  <div className="rounded-full bg-emerald-100 p-1.5 text-emerald-600">
                    <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Kuvers {kuverDateLabel}</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="flex justify-center -mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCardsExpanded((expanded) => !expanded)}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {cardsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {dashboardError ? (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="p-3 text-sm text-red-700">
            {dashboardError}
          </CardContent>
        </Card>
      ) : null}

      <div className="relative">
        {isStatsLoading || isRefreshing ? (
          <div className="absolute inset-0 bg-gray-100/70 backdrop-blur-[1px] flex items-start justify-center z-10 rounded-lg pt-12 pointer-events-none">
            <TriangleLoader />
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-4">
              <div className="flex flex-col gap-1">
                <div>
                  <h3 className="text-lg font-semibold">{operationTitle}</h3>
                  <p className="text-sm text-muted-foreground">
                    {operationDescription}
                    {activeFilterLabel ? (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Filtered by: {activeFilterLabel}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>
            {operationCount > 0 ? (
              <ReservationList
                reservations={operationReservations}
                onStatusChange={() => void fetchDashboardSnapshot()}
                onReservationChange={handleReservationChange}
                itemsPerPage={10}
                restaurants={restaurants}
                defaultRestaurantId={defaultFormRestaurantId}
              />
            ) : (
              <Card>
                <CardContent className="flex min-h-[180px] flex-col items-center justify-center gap-2 p-6 text-center">
                  <CalendarClock className="h-8 w-8 text-muted-foreground" />
                  <h4 className="text-sm font-medium">No reservations found</h4>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {operationFilter === "latest"
                      ? "No recent reservations match the current filters."
                      : `No reservations match ${operationFilterLabel} with the current filters.`}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={() => void fetchDashboardSnapshot()} variant="outline" disabled={isRefreshing}>
          {isRefreshing ? getTranslation("manage.common.loadingDashboard") : getTranslation("manage.common.refreshData")}
        </Button>
      </div>

      {showCreateForm ? (
        <ReservationForm
          isOpen={showCreateForm}
          mode="create"
          restaurants={restaurants}
          defaultRestaurantId={defaultFormRestaurantId}
          onClose={() => setShowCreateForm(false)}
          onSuccess={(reservation) => {
            setShowCreateForm(false)
            if (reservation) {
              handleReservationChange({
                type: "create",
                reservation: reservation as ReservationRecord,
                statsDirty: true,
              })
            } else {
              void fetchDashboardSnapshot()
            }
          }}
        />
      ) : null}
    </div>
  )
}
