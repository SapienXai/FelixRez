"use server"

import { revalidatePath } from "next/cache"
import { canWrite, coerceRestaurantFilter, getCurrentUserAccess } from "@/lib/auth-utils"
import { createServiceRoleClient } from "@/lib/supabase"

type AssignableUser = {
  id: string
  full_name: string | null
  role: string | null
  restaurant_id: string | null
}

type SeatingFilters = {
  date?: string
  restaurantId?: string
  status?: string
  searchQuery?: string
}

type SeatingRow = {
  id: string
  reservation_date: string
  reservation_time: string
  customer_name: string
  customer_phone: string
  party_size: number
  table_number: string | null
  notes: string | null
  status: string | null
  booked_by_user_id: string | null
  booked_by_label: string | null
  created_at: string
  restaurants?: {
    id: string
    name: string
  } | null
  booked_by_name?: string
}

export async function getSeatingReservations(filters: SeatingFilters) {
  try {
    const supabase = createServiceRoleClient()
    const scope = await coerceRestaurantFilter(filters.restaurantId)
    const statusFilter = filters.status && filters.status !== "all" ? filters.status : "confirmed"
    if (scope.type === "deny") {
      return { success: true, data: [] as SeatingRow[] }
    }

    let query = supabase
      .from("reservations")
      .select(`
        id,
        reservation_date,
        reservation_time,
        customer_name,
        customer_phone,
        party_size,
        table_number,
        notes,
        status,
        booked_by_user_id,
        booked_by_label,
        created_at,
        restaurants (id, name)
      `)

    if (scope.type === "one" && scope.id) {
      query = query.eq("restaurant_id", scope.id)
    }

    if (filters.date) {
      query = query.eq("reservation_date", filters.date)
    }

    query = query.eq("status", statusFilter)

    const { data, error } = await query
      .order("reservation_time", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      return { success: false, message: error.message, data: [] as SeatingRow[] }
    }

    const creatorIds = Array.from(
      new Set((data || []).map((row) => row.booked_by_user_id).filter((id): id is string => Boolean(id)))
    )

    const creatorMap = new Map<string, string>()
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("admin_profiles")
        .select("id, full_name")
        .in("id", creatorIds)

      for (const profile of profiles || []) {
        const name = profile.full_name?.trim()
        if (name) {
          creatorMap.set(profile.id, name)
        }
      }

      const missingCreatorIds = creatorIds.filter((id) => !creatorMap.has(id))
      await Promise.all(
        missingCreatorIds.map(async (id) => {
          const { data: authUser } = await supabase.auth.admin.getUserById(id)
          const email = authUser.user?.email?.trim()
          if (email) {
            creatorMap.set(id, email)
          }
        })
      )
    }

    function getBookedByName(row: Pick<SeatingRow, "booked_by_label" | "booked_by_user_id">) {
      const manualLabel = row.booked_by_label?.trim()
      if (manualLabel) {
        return manualLabel
      }

      if (row.booked_by_user_id) {
        return creatorMap.get(row.booked_by_user_id) || "Staff"
      }

      return "Online"
    }

    let mapped = (data || []).map((row) => ({
      ...row,
      booked_by_name: getBookedByName(row),
    }))

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const term = filters.searchQuery.trim().toLowerCase()
      mapped = mapped.filter((row) => {
        const restaurantsValue = row.restaurants as any
        const restaurantName = Array.isArray(restaurantsValue)
          ? restaurantsValue[0]?.name || ""
          : restaurantsValue?.name || ""
        const haystack = [
          row.customer_name || "",
          row.customer_phone || "",
          row.table_number || "",
          row.notes || "",
          row.booked_by_name || "",
          restaurantName,
        ]
          .join(" ")
          .toLowerCase()
        return haystack.includes(term)
      })
    }

    return { success: true, data: mapped }
  } catch (error) {
    console.error("Error in getSeatingReservations:", error)
    return { success: false, message: "An unexpected error occurred", data: [] as SeatingRow[] }
  }
}

export async function assignReservationTable(input: {
  reservationId: string
  tableNumber?: string
  notes?: string
  bookedByText?: string
}) {
  try {
    const supabase = createServiceRoleClient()
    const access = await getCurrentUserAccess()
    if (!canWrite(access)) {
      return { success: false, message: "Forbidden" }
    }

    const { data: existing, error: existingError } = await supabase
      .from("reservations")
      .select("id, restaurant_id")
      .eq("id", input.reservationId)
      .single()

    if (existingError || !existing) {
      return { success: false, message: existingError?.message || "Reservation not found" }
    }

    const scope = await coerceRestaurantFilter(existing.restaurant_id)
    if (scope.type === "deny") {
      return { success: false, message: "Forbidden" }
    }
    if (scope.type === "one" && scope.id && existing.restaurant_id !== scope.id) {
      return { success: false, message: "Forbidden" }
    }

    const tableNumber = input.tableNumber?.trim() || null
    const notes = input.notes?.trim() || null
    const bookedByLabel = input.bookedByText?.trim() || null

    const { error } = await supabase
      .from("reservations")
      .update({
        table_number: tableNumber,
        notes,
        booked_by_label: bookedByLabel,
      })
      .eq("id", input.reservationId)

    if (error) {
      return { success: false, message: error.message }
    }

    revalidatePath("/manage")
    revalidatePath("/manage/reservations")
    revalidatePath("/manage/seating")

    return { success: true, message: "Table assignment updated" }
  } catch (error) {
    console.error("Error in assignReservationTable:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

export async function getSeatingAssignableUsers(restaurantId?: string) {
  try {
    const supabase = createServiceRoleClient()
    const scope = await coerceRestaurantFilter(restaurantId)
    if (scope.type === "deny") {
      return { success: true, data: [] as AssignableUser[] }
    }

    let query = supabase
      .from("admin_profiles")
      .select("id, full_name, role, restaurant_id")
      .order("full_name", { ascending: true })

    if (scope.type === "one" && scope.id) {
      query = query.or(`restaurant_id.eq.${scope.id},role.eq.admin`)
    }

    const { data, error } = await query
    if (error) {
      return { success: false, message: error.message, data: [] as AssignableUser[] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error in getSeatingAssignableUsers:", error)
    return { success: false, message: "An unexpected error occurred", data: [] as AssignableUser[] }
  }
}
