"use server"

import { createServiceRoleClient } from "@/lib/supabase"
import { coerceRestaurantFilter } from "@/lib/auth-utils"

type SupabaseClient = ReturnType<typeof createServiceRoleClient>
type RestaurantScope = Awaited<ReturnType<typeof coerceRestaurantFilter>>

type ReservationRow = {
  id: string
  restaurant_id: string
  reservation_date: string
  reservation_time: string
  created_at: string
  booked_by_user_id?: string | null
  booked_by_email?: string | null
  [key: string]: any
}

export type DashboardStats = {
  total: number
  pending: number
  confirmed: number
  cancelled: number
  percentChange: number
  totalKuver: number
  totalMealReservations: number
  deckKuvers: number
  terraceKuvers: number
}

export type DashboardSnapshot = {
  stats: DashboardStats
  newReservations: ReservationRow[]
  newTodayReservations: ReservationRow[]
  todayReservations: ReservationRow[]
  upcomingReservations: ReservationRow[]
  selectedDateReservations: ReservationRow[]
}

const ZERO_STATS: DashboardStats = {
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

const RESERVATION_SELECT = `
  *,
  restaurants (id, name),
  reservation_areas (id, name)
`

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function getTodayDate() {
  return formatLocalDate(new Date())
}

function getStatsRange(selectedDate?: string, timePeriod?: string) {
  if (selectedDate) {
    return { startDate: selectedDate, endDate: selectedDate, selectedDate }
  }

  if (!timePeriod) {
    return { startDate: undefined, endDate: undefined, selectedDate: undefined }
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentDate = now.getDate()

  if (timePeriod === "daily") {
    const today = formatLocalDate(now)
    return { startDate: today, endDate: today, selectedDate: undefined }
  }

  if (timePeriod === "weekly") {
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(currentDate + mondayOffset)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return { startDate: formatLocalDate(monday), endDate: formatLocalDate(sunday), selectedDate: undefined }
  }

  if (timePeriod === "monthly") {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    return { startDate: formatLocalDate(firstDay), endDate: formatLocalDate(lastDay), selectedDate: undefined }
  }

  if (timePeriod === "yearly") {
    const firstDay = new Date(currentYear, 0, 1)
    const lastDay = new Date(currentYear, 11, 31)
    return { startDate: formatLocalDate(firstDay), endDate: formatLocalDate(lastDay), selectedDate: undefined }
  }

  return { startDate: undefined, endDate: undefined, selectedDate: undefined }
}

function getUpcomingRange() {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const next30Days = new Date(tomorrow)
  next30Days.setDate(next30Days.getDate() + 29)

  return {
    tomorrow: formatLocalDate(tomorrow),
    next30Days: formatLocalDate(next30Days),
  }
}

function applyRestaurantScope<T extends { eq: (column: string, value: string) => T }>(query: T, scope: RestaurantScope): T {
  if (scope.type === "one" && scope.id) {
    return query.eq("restaurant_id", scope.id)
  }

  return query
}

function applyReservationDateRange<T extends {
  eq: (column: string, value: string) => T
  gte: (column: string, value: string) => T
  lte: (column: string, value: string) => T
}>(query: T, startDate?: string, endDate?: string): T {
  if (startDate && endDate && startDate === endDate) {
    return query.eq("reservation_date", startDate)
  }

  if (startDate && endDate) {
    return query.gte("reservation_date", startDate).lte("reservation_date", endDate)
  }

  return query
}

async function attachBookedByEmails<T extends { booked_by_user_id?: string | null; booked_by_email?: string | null }>(
  supabase: SupabaseClient,
  rows: T[]
): Promise<T[]> {
  const userIds = Array.from(new Set(rows.map((row) => row.booked_by_user_id).filter((id): id is string => Boolean(id))))
  if (userIds.length === 0) {
    return rows
  }

  const emailMap = new Map<string, string>()
  await Promise.all(userIds.map(async (userId) => {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId)
      if (!error && data.user?.email) {
        emailMap.set(userId, data.user.email)
      }
    } catch (error) {
      console.warn(`Could not fetch auth user email for ${userId}:`, error)
    }
  }))

  return rows.map((row) => ({
    ...row,
    booked_by_email: row.booked_by_user_id ? emailMap.get(row.booked_by_user_id) || null : null,
  }))
}

function normalizeStats(raw: any): DashboardStats {
  return {
    total: Number(raw?.total ?? 0),
    pending: Number(raw?.pending ?? 0),
    confirmed: Number(raw?.confirmed ?? 0),
    cancelled: Number(raw?.cancelled ?? 0),
    percentChange: Number(raw?.percent_change ?? raw?.percentChange ?? 0),
    totalKuver: Number(raw?.total_kuver ?? raw?.totalKuver ?? 0),
    totalMealReservations: Number(raw?.total_meal_reservations ?? raw?.totalMealReservations ?? 0),
    deckKuvers: Number(raw?.deck_kuvers ?? raw?.deckKuvers ?? 0),
    terraceKuvers: Number(raw?.terrace_kuvers ?? raw?.terraceKuvers ?? 0),
  }
}

async function fetchDashboardStatsRpc(
  supabase: SupabaseClient,
  scope: RestaurantScope,
  selectedDate?: string,
  timePeriod?: string
): Promise<DashboardStats | null> {
  const { startDate, endDate } = getStatsRange(selectedDate, timePeriod)
  const restaurantId = scope.type === "one" ? scope.id ?? null : null

  try {
    const { data, error } = await (supabase as any)
      .rpc("get_dashboard_stats", {
        p_restaurant_id: restaurantId,
        p_start_date: startDate ?? null,
        p_end_date: endDate ?? null,
      })
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return normalizeStats(data)
  } catch {
    return null
  }
}

async function fetchDashboardStatsFallback(
  supabase: SupabaseClient,
  scope: RestaurantScope,
  selectedDate?: string,
  timePeriod?: string
): Promise<DashboardStats> {
  const { startDate, endDate } = getStatsRange(selectedDate, timePeriod)
  const today = new Date()
  const lastMonth = new Date(today)
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  const twoMonthsAgo = new Date(lastMonth)
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 1)

  let statsQuery = supabase
    .from("reservations")
    .select(`
      status,
      party_size,
      reservation_type,
      reservation_areas (name)
    `)

  statsQuery = applyRestaurantScope(statsQuery, scope)
  statsQuery = applyReservationDateRange(statsQuery, startDate, endDate)

  let lastMonthQuery = supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .gte("created_at", lastMonth.toISOString())
    .lt("created_at", today.toISOString())

  let twoMonthsAgoQuery = supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .gte("created_at", twoMonthsAgo.toISOString())
    .lt("created_at", lastMonth.toISOString())

  lastMonthQuery = applyRestaurantScope(lastMonthQuery, scope)
  twoMonthsAgoQuery = applyRestaurantScope(twoMonthsAgoQuery, scope)

  const [
    { data: rows, error: statsError },
    { count: lastMonthCount, error: lastMonthError },
    { count: twoMonthsAgoCount, error: twoMonthsAgoError },
  ] = await Promise.all([
    statsQuery,
    lastMonthQuery,
    twoMonthsAgoQuery,
  ])

  if (statsError) {
    throw new Error(statsError.message)
  }
  if (lastMonthError) {
    throw new Error(lastMonthError.message)
  }
  if (twoMonthsAgoError) {
    throw new Error(twoMonthsAgoError.message)
  }

  const stats = { ...ZERO_STATS }

  for (const row of rows || []) {
    const status = row.status || "pending"
    const partySize = Number(row.party_size || 0)
    const areaName = Array.isArray((row as any).reservation_areas)
      ? (row as any).reservation_areas[0]?.name
      : (row as any).reservation_areas?.name
    const normalizedAreaName = String(areaName || "").toLowerCase()

    stats.total += 1
    if (status === "pending") stats.pending += 1
    if (status === "confirmed") {
      stats.confirmed += 1
      stats.totalKuver += partySize
      if (normalizedAreaName.includes("deck")) stats.deckKuvers += partySize
      if (normalizedAreaName.includes("terrace")) stats.terraceKuvers += partySize
    }
    if (status === "cancelled") stats.cancelled += 1
    if (row.reservation_type === "meal") stats.totalMealReservations += 1
  }

  if ((twoMonthsAgoCount || 0) > 0) {
    stats.percentChange = Math.round((((lastMonthCount || 0) - (twoMonthsAgoCount || 0)) / (twoMonthsAgoCount || 0)) * 100)
  }

  return stats
}

async function fetchDashboardStats(
  supabase: SupabaseClient,
  scope: RestaurantScope,
  selectedDate?: string,
  timePeriod?: string
): Promise<DashboardStats> {
  if (scope.type === "deny") {
    return ZERO_STATS
  }

  const rpcStats = await fetchDashboardStatsRpc(supabase, scope, selectedDate, timePeriod)
  if (rpcStats) {
    return rpcStats
  }

  return fetchDashboardStatsFallback(supabase, scope, selectedDate, timePeriod)
}

async function fetchReservationsForDate(supabase: SupabaseClient, scope: RestaurantScope, date: string) {
  if (scope.type === "deny") {
    return []
  }

  let query = supabase
    .from("reservations")
    .select(RESERVATION_SELECT)
    .eq("reservation_date", date)

  query = applyRestaurantScope(query, scope)

  const { data, error } = await query.order("reservation_time", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return attachBookedByEmails(supabase, data || [])
}

async function fetchNewReservations(supabase: SupabaseClient, scope: RestaurantScope) {
  if (scope.type === "deny") {
    return []
  }

  let query = supabase
    .from("reservations")
    .select(RESERVATION_SELECT)

  query = applyRestaurantScope(query, scope)

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) {
    throw new Error(error.message)
  }

  return attachBookedByEmails(supabase, data || [])
}

async function fetchTodayCreatedReservations(supabase: SupabaseClient, scope: RestaurantScope) {
  if (scope.type === "deny") {
    return []
  }

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

  let query = supabase
    .from("reservations")
    .select(RESERVATION_SELECT)
    .gte("created_at", startOfToday.toISOString())
    .lt("created_at", startOfTomorrow.toISOString())

  query = applyRestaurantScope(query, scope)

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return attachBookedByEmails(supabase, data || [])
}

async function fetchUpcomingReservations(supabase: SupabaseClient, scope: RestaurantScope) {
  if (scope.type === "deny") {
    return []
  }

  const { tomorrow, next30Days } = getUpcomingRange()

  let query = supabase
    .from("reservations")
    .select(RESERVATION_SELECT)
    .gte("reservation_date", tomorrow)
    .lte("reservation_date", next30Days)

  query = applyRestaurantScope(query, scope)

  const { data, error } = await query
    .order("reservation_date", { ascending: true })
    .order("reservation_time", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return attachBookedByEmails(supabase, data || [])
}

async function getScope(restaurantId?: string) {
  return coerceRestaurantFilter(restaurantId)
}

export async function getDashboardData(restaurantId?: string, selectedDate?: string, timePeriod?: string) {
  try {
    const supabase = createServiceRoleClient()
    const scope = await getScope(restaurantId)
    if (scope.type === "deny") {
      return {
        success: true,
        data: {
          stats: ZERO_STATS,
          newReservations: [],
          newTodayReservations: [],
          todayReservations: [],
          upcomingReservations: [],
          selectedDateReservations: [],
        } satisfies DashboardSnapshot,
      }
    }

    const [
      stats,
      newReservations,
      newTodayReservations,
      todayReservations,
      upcomingReservations,
      selectedDateReservations,
    ] = await Promise.all([
      fetchDashboardStats(supabase, scope, selectedDate, timePeriod),
      fetchNewReservations(supabase, scope),
      fetchTodayCreatedReservations(supabase, scope),
      fetchReservationsForDate(supabase, scope, getTodayDate()),
      fetchUpcomingReservations(supabase, scope),
      selectedDate ? fetchReservationsForDate(supabase, scope, selectedDate) : Promise.resolve([]),
    ])

    return {
      success: true,
      data: {
        stats,
        newReservations,
        newTodayReservations,
        todayReservations,
        upcomingReservations,
        selectedDateReservations,
      } satisfies DashboardSnapshot,
    }
  } catch (error) {
    console.error("Error in getDashboardData:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

export async function getDashboardStats(restaurantId?: string, selectedDate?: string, timePeriod?: string) {
  try {
    const supabase = createServiceRoleClient()
    const scope = await getScope(restaurantId)
    return { success: true, stats: await fetchDashboardStats(supabase, scope, selectedDate, timePeriod) }
  } catch (error) {
    console.error("Error in getDashboardStats:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

export async function getTodayReservations(restaurantId?: string, selectedDate?: string) {
  try {
    const supabase = createServiceRoleClient()
    const scope = await getScope(restaurantId)
    return { success: true, data: await fetchReservationsForDate(supabase, scope, selectedDate || getTodayDate()) }
  } catch (error) {
    console.error("Error in getTodayReservations:", error)
    return { success: false, message: "An unexpected error occurred", data: [] }
  }
}

export async function getNewReservations(restaurantId?: string) {
  try {
    const supabase = createServiceRoleClient()
    const scope = await getScope(restaurantId)
    return { success: true, data: await fetchNewReservations(supabase, scope) }
  } catch (error) {
    console.error("Error in getNewReservations:", error)
    return { success: false, message: "An unexpected error occurred", data: [] }
  }
}

export async function getTodayCreatedReservations(restaurantId?: string) {
  try {
    const supabase = createServiceRoleClient()
    const scope = await getScope(restaurantId)
    return { success: true, data: await fetchTodayCreatedReservations(supabase, scope) }
  } catch (error) {
    console.error("Error in getTodayCreatedReservations:", error)
    return { success: false, message: "An unexpected error occurred", data: [] }
  }
}

export async function getUpcomingReservations(restaurantId?: string) {
  try {
    const supabase = createServiceRoleClient()
    const scope = await getScope(restaurantId)
    return { success: true, data: await fetchUpcomingReservations(supabase, scope) }
  } catch (error) {
    console.error("Error in getUpcomingReservations:", error)
    return { success: false, message: "An unexpected error occurred", data: [] }
  }
}

export async function getDashboardReservationById(id: string, restaurantId?: string) {
  try {
    const supabase = createServiceRoleClient()
    const scope = await getScope(restaurantId)
    if (scope.type === "deny") {
      return { success: true, data: null }
    }

    let query = supabase
      .from("reservations")
      .select(RESERVATION_SELECT)
      .eq("id", id)

    query = applyRestaurantScope(query, scope)

    const { data, error } = await query.single()

    if (error) {
      return { success: false, message: error.message, data: null }
    }

    const [reservation] = await attachBookedByEmails(supabase, data ? [data] : [])
    return { success: true, data: reservation || null }
  } catch (error) {
    console.error("Error in getDashboardReservationById:", error)
    return { success: false, message: "An unexpected error occurred", data: null }
  }
}
