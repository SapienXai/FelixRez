"use server"

import { createServiceRoleClient } from "@/lib/supabase"

export async function getDashboardStats() {
  try {
    const supabase = createServiceRoleClient()

    // Get total reservations
    const { count: total, error: totalError } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })

    if (totalError) {
      console.error("Error fetching total reservations:", totalError)
      return { success: false, message: totalError.message }
    }

    // Get pending reservations
    const { count: pending, error: pendingError } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")

    if (pendingError) {
      console.error("Error fetching pending reservations:", pendingError)
      return { success: false, message: pendingError.message }
    }

    // Get confirmed reservations
    const { count: confirmed, error: confirmedError } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed")

    if (confirmedError) {
      console.error("Error fetching confirmed reservations:", confirmedError)
      return { success: false, message: confirmedError.message }
    }

    // Get cancelled reservations
    const { count: cancelled, error: cancelledError } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("status", "cancelled")

    if (cancelledError) {
      console.error("Error fetching cancelled reservations:", cancelledError)
      return { success: false, message: cancelledError.message }
    }

    // Get reservations from last month
    const today = new Date()
    const lastMonth = new Date(today)
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const { count: lastMonthCount, error: lastMonthError } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", lastMonth.toISOString())
      .lt("created_at", today.toISOString())

    if (lastMonthError) {
      console.error("Error fetching last month reservations:", lastMonthError)
      return { success: false, message: lastMonthError.message }
    }

    // Get reservations from the month before last month
    const twoMonthsAgo = new Date(lastMonth)
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 1)

    const { count: twoMonthsAgoCount, error: twoMonthsAgoError } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twoMonthsAgo.toISOString())
      .lt("created_at", lastMonth.toISOString())

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
      },
    }
  } catch (error) {
    console.error("Error in getDashboardStats:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

export async function getTodayReservations() {
  try {
    const supabase = createServiceRoleClient()

    // Use system date to avoid timezone issues
    const today = new Date()
    const todayStr = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0')

    console.log('getTodayReservations: Looking for date:', todayStr)

    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        restaurants (id, name)
      `)
      .eq("reservation_date", todayStr)
      .order("reservation_time", { ascending: true })

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

export async function getNewReservations() {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        restaurants (id, name)
      `)
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

export async function getUpcomingReservations() {
  try {
    const supabase = createServiceRoleClient()

    // Use system date to avoid timezone issues
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

    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        restaurants (id, name)
      `)
      .gte("reservation_date", tomorrowStr)
      .lt("reservation_date", nextWeekStr)
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
