"use server"

import { createServiceRoleClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import type { ReservationArea } from "@/types/supabase"

interface ReservationAreaData {
  id?: string
  restaurant_id: string
  name: string
  description?: string
  is_active: boolean
  display_order: number
  opening_time?: string
  closing_time?: string
  time_slot_duration?: number
  max_party_size?: number
  min_party_size?: number
  advance_booking_days?: number
  min_advance_hours?: number
  allowed_days_of_week?: number[]
  blocked_dates?: string[]
  max_concurrent_reservations?: number
}

export async function getReservationAreas(restaurantId: string) {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("reservation_areas")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("display_order", { ascending: true })

    if (error) {
      console.error("Error fetching reservation areas:", error)
      return { success: false, message: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error in getReservationAreas:", error)
    return { success: false, message: "An unexpected error occurred", data: [] }
  }
}

export async function createReservationArea(data: ReservationAreaData) {
  try {
    const supabase = createServiceRoleClient()

    const { data: area, error } = await supabase
      .from("reservation_areas")
      .insert({
        restaurant_id: data.restaurant_id,
        name: data.name,
        description: data.description,
        is_active: data.is_active,
        display_order: data.display_order,
        opening_time: data.opening_time,
        closing_time: data.closing_time,
        time_slot_duration: data.time_slot_duration,
        max_party_size: data.max_party_size,
        min_party_size: data.min_party_size,
        advance_booking_days: data.advance_booking_days,
        min_advance_hours: data.min_advance_hours,
        allowed_days_of_week: data.allowed_days_of_week,
        blocked_dates: data.blocked_dates,
        max_concurrent_reservations: data.max_concurrent_reservations,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating reservation area:", error)
      return { success: false, message: "Failed to create reservation area" }
    }

    revalidatePath("/manage/restaurants")
    return { success: true, message: "Reservation area created successfully", data: area }
  } catch (error) {
    console.error("Error creating reservation area:", error)
    return { success: false, message: "Failed to create reservation area" }
  }
}

export async function updateReservationArea(id: string, data: Partial<ReservationAreaData>) {
  try {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from("reservation_areas")
      .update({
        name: data.name,
        description: data.description,
        is_active: data.is_active,
        display_order: data.display_order,
        opening_time: data.opening_time,
        closing_time: data.closing_time,
        time_slot_duration: data.time_slot_duration,
        max_party_size: data.max_party_size,
        min_party_size: data.min_party_size,
        advance_booking_days: data.advance_booking_days,
        min_advance_hours: data.min_advance_hours,
        allowed_days_of_week: data.allowed_days_of_week,
        blocked_dates: data.blocked_dates,
        max_concurrent_reservations: data.max_concurrent_reservations,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      console.error("Error updating reservation area:", error)
      return { success: false, message: "Failed to update reservation area" }
    }

    revalidatePath("/manage/restaurants")
    return { success: true, message: "Reservation area updated successfully" }
  } catch (error) {
    console.error("Error updating reservation area:", error)
    return { success: false, message: "Failed to update reservation area" }
  }
}

export async function deleteReservationArea(id: string) {
  try {
    const supabase = createServiceRoleClient()

    // Check if there are any reservations for this area
    const { data: reservations, error: reservationError } = await supabase
      .from("reservations")
      .select("id")
      .eq("reservation_area_id", id)
      .limit(1)

    if (reservationError) {
      console.error("Error checking reservations:", reservationError)
      return { success: false, message: "Failed to check existing reservations" }
    }

    if (reservations && reservations.length > 0) {
      return {
        success: false,
        message: "Cannot delete area with existing reservations. Please cancel or move reservations first."
      }
    }

    const { error } = await supabase
      .from("reservation_areas")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting reservation area:", error)
      return { success: false, message: "Failed to delete reservation area" }
    }

    revalidatePath("/manage/restaurants")
    return { success: true, message: "Reservation area deleted successfully" }
  } catch (error) {
    console.error("Error deleting reservation area:", error)
    return { success: false, message: "Failed to delete reservation area" }
  }
}

export async function bulkUpdateReservationAreas(restaurantId: string, areas: ReservationAreaData[]) {
  try {
    const supabase = createServiceRoleClient()

    // Start a transaction-like operation
    const results: { success: boolean; area?: string; error?: string }[] = []

    // 1) Fetch existing area IDs to support deletions
    const { data: existingAreas, error: fetchExistingError } = await supabase
      .from("reservation_areas")
      .select("id")
      .eq("restaurant_id", restaurantId)

    if (fetchExistingError) {
      console.error("Error fetching existing areas:", fetchExistingError)
      return { success: false, message: "Failed to load existing areas" }
    }

    const existingIds = new Set((existingAreas || []).map((a) => a.id))
    const incomingIds = new Set(areas.filter((a) => a.id).map((a) => a.id as string))

    for (const area of areas) {
      if (area.id) {
        // Update existing area
        const { error } = await supabase
          .from("reservation_areas")
          .update({
            name: area.name,
            description: area.description,
            is_active: area.is_active,
            display_order: area.display_order,
            opening_time: area.opening_time,
            closing_time: area.closing_time,
            time_slot_duration: area.time_slot_duration,
            max_party_size: area.max_party_size,
            min_party_size: area.min_party_size,
            advance_booking_days: area.advance_booking_days,
            min_advance_hours: area.min_advance_hours,
            allowed_days_of_week: area.allowed_days_of_week,
            blocked_dates: area.blocked_dates,
            max_concurrent_reservations: area.max_concurrent_reservations,
            updated_at: new Date().toISOString(),
          })
          .eq("id", area.id)

        if (error) {
          console.error("Error updating area:", error)
          results.push({ success: false, area: area.name, error: error.message })
        } else {
          results.push({ success: true, area: area.name })
        }
      } else {
        // Create new area
        const { error } = await supabase
          .from("reservation_areas")
          .insert({
            restaurant_id: restaurantId,
            name: area.name,
            description: area.description,
            is_active: area.is_active,
            display_order: area.display_order,
            opening_time: area.opening_time,
            closing_time: area.closing_time,
            time_slot_duration: area.time_slot_duration,
            max_party_size: area.max_party_size,
            min_party_size: area.min_party_size,
            advance_booking_days: area.advance_booking_days,
            min_advance_hours: area.min_advance_hours,
            allowed_days_of_week: area.allowed_days_of_week,
            blocked_dates: area.blocked_dates,
            max_concurrent_reservations: area.max_concurrent_reservations,
          })

        if (error) {
          console.error("Error creating area:", error)
          results.push({ success: false, area: area.name, error: error.message })
        } else {
          results.push({ success: true, area: area.name })
        }
      }
    }

    // 2) Delete areas that exist in DB but are not present in the incoming payload
    const idsToDelete = Array.from(existingIds).filter((id) => !incomingIds.has(id))
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("reservation_areas")
        .delete()
        .in("id", idsToDelete)
        .eq("restaurant_id", restaurantId)

      if (deleteError) {
        console.error("Error deleting removed areas:", deleteError)
        results.push({ success: false, area: "<deleted>", error: deleteError.message })
      }
    }

    const failedUpdates = results.filter(r => !r.success)
    if (failedUpdates.length > 0) {
      return {
        success: false,
        message: `Failed to update ${failedUpdates.length} areas: ${failedUpdates.map(f => f.area).join(", ")}`,
        results
      }
    }

    revalidatePath("/manage/restaurants")
    return {
      success: true,
      message: `Successfully updated ${results.length} reservation areas`,
      results
    }
  } catch (error) {
    console.error("Error in bulkUpdateReservationAreas:", error)
    return { success: false, message: "Failed to update reservation areas" }
  }
}

export async function reorderReservationAreas(restaurantId: string, areaIds: string[]) {
  try {
    const supabase = createServiceRoleClient()

    // Update display_order for each area
    const updates = areaIds.map((id, index) => 
      supabase
        .from("reservation_areas")
        .update({ display_order: index })
        .eq("id", id)
        .eq("restaurant_id", restaurantId)
    )

    const results = await Promise.all(updates)
    const errors = results.filter(result => result.error)

    if (errors.length > 0) {
      console.error("Error reordering areas:", errors)
      return { success: false, message: "Failed to reorder some areas" }
    }

    revalidatePath("/manage/restaurants")
    return { success: true, message: "Areas reordered successfully" }
  } catch (error) {
    console.error("Error reordering reservation areas:", error)
    return { success: false, message: "Failed to reorder areas" }
  }
}
