"use server"

import { createServiceRoleClient } from "@/lib/supabase"
import { coerceRestaurantFilter } from "@/lib/auth-utils"

export async function getDashboardStats(restaurantId?: string, selectedDate?: string, timePeriod?: string) {
  try {
    const supabase = createServiceRoleClient()
    const scope = await coerceRestaurantFilter(restaurantId)
    if (scope.type === "deny") {
      return { success: true, stats: { total: 0, pending: 0, confirmed: 0, cancelled: 0, percentChange: 0, totalKuver: 0, totalMealReservations: 0, deckKuvers: 0, terraceKuvers: 0 } }
    }

    // Calculate date range based on time period
    let startDate: string | undefined
    let endDate: string | undefined
    
    if (timePeriod && !selectedDate) {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      const currentDate = now.getDate()
      
      if (timePeriod === 'weekly') {
        // Current week (Monday to Sunday)
        const dayOfWeek = now.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const monday = new Date(now)
        monday.setDate(currentDate + mondayOffset)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        
        startDate = monday.toISOString().split('T')[0]
        endDate = sunday.toISOString().split('T')[0]
      } else if (timePeriod === 'monthly') {
        // Current month
        const firstDay = new Date(currentYear, currentMonth, 1)
        const lastDay = new Date(currentYear, currentMonth + 1, 0)
        
        startDate = firstDay.toISOString().split('T')[0]
        endDate = lastDay.toISOString().split('T')[0]
      } else if (timePeriod === 'yearly') {
        // Current year
        const firstDay = new Date(currentYear, 0, 1)
        const lastDay = new Date(currentYear, 11, 31)
        
        startDate = firstDay.toISOString().split('T')[0]
        endDate = lastDay.toISOString().split('T')[0]
      }
    }

    // Get total reservations
    let totalQuery = supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
    
    if (scope.type === "one" && scope.id) {
      totalQuery = totalQuery.eq("restaurant_id", scope.id)
    }
    
    if (selectedDate) {
      totalQuery = totalQuery.eq("reservation_date", selectedDate)
    } else if (startDate && endDate) {
      totalQuery = totalQuery.gte("reservation_date", startDate).lte("reservation_date", endDate)
    }

    const { count: total, error: totalError } = await totalQuery

    if (totalError) {
      console.error("Error fetching total reservations:", totalError)
      return { success: false, message: totalError.message }
    }

    // Get pending reservations
    let pendingQuery = supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
    
    if (scope.type === "one" && scope.id) {
      pendingQuery = pendingQuery.eq("restaurant_id", scope.id)
    }
    
    if (selectedDate) {
      pendingQuery = pendingQuery.eq("reservation_date", selectedDate)
    } else if (startDate && endDate) {
      pendingQuery = pendingQuery.gte("reservation_date", startDate).lte("reservation_date", endDate)
    }

    const { count: pending, error: pendingError } = await pendingQuery

    if (pendingError) {
      console.error("Error fetching pending reservations:", pendingError)
      return { success: false, message: pendingError.message }
    }

    // Get confirmed reservations
    let confirmedQuery = supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed")
    
    if (scope.type === "one" && scope.id) {
      confirmedQuery = confirmedQuery.eq("restaurant_id", scope.id)
    }
    
    if (selectedDate) {
      confirmedQuery = confirmedQuery.eq("reservation_date", selectedDate)
    } else if (startDate && endDate) {
      confirmedQuery = confirmedQuery.gte("reservation_date", startDate).lte("reservation_date", endDate)
    }

    const { count: confirmed, error: confirmedError } = await confirmedQuery

    if (confirmedError) {
      console.error("Error fetching confirmed reservations:", confirmedError)
      return { success: false, message: confirmedError.message }
    }

    // Get cancelled reservations
    let cancelledQuery = supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("status", "cancelled")
    
    if (scope.type === "one" && scope.id) {
      cancelledQuery = cancelledQuery.eq("restaurant_id", scope.id)
    }
    
    if (selectedDate) {
      cancelledQuery = cancelledQuery.eq("reservation_date", selectedDate)
    } else if (startDate && endDate) {
      cancelledQuery = cancelledQuery.gte("reservation_date", startDate).lte("reservation_date", endDate)
    }

    const { count: cancelled, error: cancelledError } = await cancelledQuery

    if (cancelledError) {
      console.error("Error fetching cancelled reservations:", cancelledError)
      return { success: false, message: cancelledError.message }
    }

    // Get total kuver (customers served) - sum of party_size for confirmed reservations
    let kuverQuery = supabase
      .from("reservations")
      .select("party_size")
      .eq("status", "confirmed")
    
    if (scope.type === "one" && scope.id) {
      kuverQuery = kuverQuery.eq("restaurant_id", scope.id)
    }
    
    if (selectedDate) {
      kuverQuery = kuverQuery.eq("reservation_date", selectedDate)
    } else if (startDate && endDate) {
      kuverQuery = kuverQuery.gte("reservation_date", startDate).lte("reservation_date", endDate)
    }

    const { data: kuverData, error: kuverError } = await kuverQuery

    if (kuverError) {
      console.error("Error fetching kuver data:", kuverError)
      return { success: false, message: kuverError.message }
    }

    const totalKuver = kuverData?.reduce((sum, reservation) => sum + reservation.party_size, 0) || 0

    // Get total meal reservations
    let mealQuery = supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("reservation_type", "meal")
    
    if (scope.type === "one" && scope.id) {
      mealQuery = mealQuery.eq("restaurant_id", scope.id)
    }
    
    if (selectedDate) {
      mealQuery = mealQuery.eq("reservation_date", selectedDate)
    } else if (startDate && endDate) {
      mealQuery = mealQuery.gte("reservation_date", startDate).lte("reservation_date", endDate)
    }

    const { count: totalMealReservations, error: mealError } = await mealQuery

    if (mealError) {
      console.error("Error fetching meal reservations:", mealError)
      return { success: false, message: mealError.message }
    }

    // Get current kuvers on deck/terrace (confirmed reservations in deck/terrace areas)
    const today = new Date()
    const todayStr = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0')

    // Get deck reservations
    let deckQuery = supabase
      .from("reservations")
      .select(`
        party_size,
        reservation_areas!inner(name)
      `)
      .eq("status", "confirmed")
      .ilike("reservation_areas.name", "%deck%")
    
    if (scope.type === "one" && scope.id) {
      deckQuery = deckQuery.eq("restaurant_id", scope.id)
    }
    
    if (selectedDate) {
      deckQuery = deckQuery.eq("reservation_date", selectedDate)
    } else if (startDate && endDate) {
      deckQuery = deckQuery.gte("reservation_date", startDate).lte("reservation_date", endDate)
    } else {
      deckQuery = deckQuery.eq("reservation_date", todayStr)
    }

    // Get terrace reservations
    let terraceQuery = supabase
      .from("reservations")
      .select(`
        party_size,
        reservation_areas!inner(name)
      `)
      .eq("status", "confirmed")
      .ilike("reservation_areas.name", "%terrace%")
    
    if (scope.type === "one" && scope.id) {
      terraceQuery = terraceQuery.eq("restaurant_id", scope.id)
    }
    
    if (selectedDate) {
      terraceQuery = terraceQuery.eq("reservation_date", selectedDate)
    } else if (startDate && endDate) {
      terraceQuery = terraceQuery.gte("reservation_date", startDate).lte("reservation_date", endDate)
    } else {
      terraceQuery = terraceQuery.eq("reservation_date", todayStr)
    }

    const [{ data: deckData, error: deckError }, { data: terraceData, error: terraceError }] = await Promise.all([
      deckQuery,
      terraceQuery
    ])

    if (deckError) {
      console.error("Error fetching deck kuvers:", deckError)
      return { success: false, message: deckError.message }
    }

    if (terraceError) {
      console.error("Error fetching terrace kuvers:", terraceError)
      return { success: false, message: terraceError.message }
    }

    const deckKuvers = deckData?.reduce((sum, reservation) => sum + reservation.party_size, 0) || 0
    const terraceKuvers = terraceData?.reduce((sum, reservation) => sum + reservation.party_size, 0) || 0

    // Get reservations from last month
    const lastMonth = new Date(today)
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    let lastMonthQuery = supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", lastMonth.toISOString())
      .lt("created_at", today.toISOString())
    
    if (restaurantId) {
      lastMonthQuery = lastMonthQuery.eq("restaurant_id", restaurantId)
    }

    const { count: lastMonthCount, error: lastMonthError } = await lastMonthQuery

    if (lastMonthError) {
      console.error("Error fetching last month reservations:", lastMonthError)
      return { success: false, message: lastMonthError.message }
    }

    // Get reservations from the month before last month
    const twoMonthsAgo = new Date(lastMonth)
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 1)

    let twoMonthsAgoQuery = supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twoMonthsAgo.toISOString())
      .lt("created_at", lastMonth.toISOString())
    
    if (restaurantId) {
      twoMonthsAgoQuery = twoMonthsAgoQuery.eq("restaurant_id", restaurantId)
    }

    const { count: twoMonthsAgoCount, error: twoMonthsAgoError } = await twoMonthsAgoQuery

    if (twoMonthsAgoError) {
      console.error("Error fetching two months ago reservations:", twoMonthsAgoError)
      return { success: false, message: twoMonthsAgoError.message }
    }

    // Calculate percent change
    let percentChange = 0
    if ((twoMonthsAgoCount || 0) > 0) {
      percentChange = Math.round((((lastMonthCount || 0) - (twoMonthsAgoCount || 0)) / (twoMonthsAgoCount || 0)) * 100)
    }

    return {
      success: true,
      stats: {
        total: total || 0,
        pending: pending || 0,
        confirmed: confirmed || 0,
        cancelled: cancelled || 0,
        percentChange,
        totalKuver: totalKuver,
        totalMealReservations: totalMealReservations || 0,
        deckKuvers: deckKuvers,
        terraceKuvers: terraceKuvers
      },
    }
  } catch (error) {
    console.error("Error in getDashboardStats:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

export async function getTodayReservations(restaurantId?: string, selectedDate?: string) {
  try {
    const supabase = createServiceRoleClient()
    const scope = await coerceRestaurantFilter(restaurantId)
    if (scope.type === "deny") {
      return { success: true, data: [] }
    }

    // Use selected date or system date to avoid timezone issues
    const dateToUse = selectedDate || (() => {
      const today = new Date()
      return today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0')
    })()

    console.log('getTodayReservations: Looking for date:', dateToUse)

    let query = supabase
      .from("reservations")
      .select(`
        *,
        restaurants (id, name),
        reservation_areas (id, name)
      `)
      .eq("reservation_date", dateToUse)
    
    if (scope.type === "one" && scope.id) {
      query = query.eq("restaurant_id", scope.id)
    }

    const { data, error } = await query.order("reservation_time", { ascending: true })

    if (error) {
      console.error("Error fetching today's reservations:", error)
      return { success: false, message: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error in getTodayReservations:", error)
    return { success: false, message: "An unexpected error occurred", data: [] }
  }
}

export async function getNewReservations(restaurantId?: string) {
  try {
    const supabase = createServiceRoleClient()
    const scope = await coerceRestaurantFilter(restaurantId)
    if (scope.type === "deny") {
      return { success: true, data: [] }
    }

    let query = supabase
      .from("reservations")
      .select(`
        *,
        restaurants (id, name),
        reservation_areas (id, name)
      `)
    
    if (scope.type === "one" && scope.id) {
      query = query.eq("restaurant_id", scope.id)
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Error fetching new reservations:", error)
      return { success: false, message: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error in getNewReservations:", error)
    return { success: false, message: "An unexpected error occurred", data: [] }
  }
}

export async function getUpcomingReservations(restaurantId?: string, selectedDate?: string) {
  try {
    const supabase = createServiceRoleClient()
    const scope = await coerceRestaurantFilter(restaurantId)
    if (scope.type === "deny") {
      return { success: true, data: [] }
    }

    let query = supabase
      .from("reservations")
      .select(`
        *,
        restaurants (id, name),
        reservation_areas (id, name)
      `)
    
    if (selectedDate) {
      // If a specific date is selected, get reservations for that date
      query = query.eq("reservation_date", selectedDate)
    } else {
      // Use system date to avoid timezone issues for upcoming reservations
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)

      const tomorrowStr = tomorrow.getFullYear() + '-' + 
        String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + 
        String(tomorrow.getDate()).padStart(2, '0')
      const nextWeekStr = nextWeek.getFullYear() + '-' + 
        String(nextWeek.getMonth() + 1).padStart(2, '0') + '-' + 
        String(nextWeek.getDate()).padStart(2, '0')

      console.log('getUpcomingReservations: Looking from', tomorrowStr, 'to', nextWeekStr)
      
      query = query
        .gte("reservation_date", tomorrowStr)
        .lt("reservation_date", nextWeekStr)
    }
    
    if (scope.type === "one" && scope.id) {
      query = query.eq("restaurant_id", scope.id)
    }

    const { data, error } = await query
      .order("reservation_date", { ascending: true })
      .order("reservation_time", { ascending: true })

    if (error) {
      console.error("Error fetching upcoming reservations:", error)
      return { success: false, message: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error in getUpcomingReservations:", error)
    return { success: false, message: "An unexpected error occurred", data: [] }
  }
}
