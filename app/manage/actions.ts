"use server"

import { createServiceRoleClient } from "@/lib/supabase"
import { canWrite, coerceRestaurantFilter, getUserRestaurantIds, getCurrentUserAccess } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"
import { sendEmail, generateStatusUpdateEmail } from "@/lib/email-service"
import { generateICSFile } from "@/lib/calendar-invite"
import { fetchManagedRestaurants, fetchPublicRestaurants } from "@/lib/services/manage/restaurant-service"
import { sendReservationPushNotification } from "@/lib/push-service"

async function attachBookedByEmail<T extends { booked_by_user_id?: string | null; booked_by_email?: string | null }>(
  supabase: ReturnType<typeof createServiceRoleClient>,
  row: T | null
): Promise<T | null> {
  if (!row?.booked_by_user_id) {
    return row
  }

  try {
    const { data, error } = await supabase.auth.admin.getUserById(row.booked_by_user_id)
    if (!error && data.user?.email) {
      return { ...row, booked_by_email: data.user.email }
    }
  } catch (error) {
    console.warn(`Could not fetch auth user email for ${row.booked_by_user_id}:`, error)
  }

  return row
}

export async function getReservations(filters: {
  status?: string
  restaurantId?: string
  dateRange?: string
  searchQuery?: string
  reservationId?: string
}) {
  try {
    const supabase = createServiceRoleClient()

    // Enforce restaurant scope
    const scope = await coerceRestaurantFilter(filters.restaurantId)
    if (scope.type === "deny") {
      return { success: true, data: [] }
    }

    // Start with a basic query
    let query = supabase.from("reservations").select(`
        *,
        restaurants (id, name),
        reservation_areas (id, name)
      `)

    // Apply filters if provided
    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status)
    }

    if (scope.type === "one" && scope.id) {
      query = query.eq("restaurant_id", scope.id)
    }

    if (filters.reservationId?.trim()) {
      query = query.eq("id", filters.reservationId.trim())
    }

    // Handle date range filtering
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Helper function to format date without timezone issues
    const formatDateToYYYYMMDD = (date: Date) => {
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, "0")
      const day = date.getDate().toString().padStart(2, "0")
      return `${year}-${month}-${day}`
    }

    if (filters.dateRange === "today") {
      query = query.eq("reservation_date", formatDateToYYYYMMDD(today))
    } else if (filters.dateRange === "tomorrow") {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      query = query.eq("reservation_date", formatDateToYYYYMMDD(tomorrow))
    } else if (filters.dateRange === "week") {
      const endOfWeek = new Date(today)
      endOfWeek.setDate(endOfWeek.getDate() + 7)
      query = query
        .gte("reservation_date", formatDateToYYYYMMDD(today))
        .lte("reservation_date", formatDateToYYYYMMDD(endOfWeek))
    } else if (filters.dateRange === "month") {
      const endOfMonth = new Date(today)
      endOfMonth.setMonth(endOfMonth.getMonth() + 1)
      query = query
        .gte("reservation_date", formatDateToYYYYMMDD(today))
        .lte("reservation_date", formatDateToYYYYMMDD(endOfMonth))
    }

    // Execute the initial query to get all filtered data
    const { data: allData, error: initialError } = await query.order("reservation_date", { ascending: true })
    
    if (initialError) {
      console.error("Error fetching reservations:", initialError)
      return { success: false, message: initialError.message, data: [] }
    }

    // Handle search query with client-side filtering
    let filteredData = allData
    if (filters.searchQuery && filters.searchQuery.trim()) {
      console.log('Search query:', filters.searchQuery)
      const searchTerm = filters.searchQuery.toLowerCase().trim()
      console.log('Search term:', searchTerm)
      
      filteredData = allData.filter(reservation => {
        const customerName = reservation.customer_name?.toLowerCase() || ''
        const customerPhone = reservation.customer_phone?.toLowerCase() || ''
        const customerEmail = reservation.customer_email?.toLowerCase() || ''
        const restaurantName = reservation.restaurants?.name?.toLowerCase() || ''
        const areaName = (reservation as any).reservation_areas?.name?.toLowerCase() || ''
        
        return customerName.includes(searchTerm) ||
               customerPhone.includes(searchTerm) ||
               customerEmail.includes(searchTerm) ||
               restaurantName.includes(searchTerm) ||
               areaName.includes(searchTerm)
      })
      
      console.log('Filtered results:', filteredData.length, 'out of', allData.length)
    }

    return { success: true, data: filteredData }
  } catch (error) {
    console.error("Error in getReservations:", error)
    return { success: false, message: "An unexpected error occurred", data: [] }
  }
}

export async function updateReservationStatus(id: string, status: string, notes?: string, sendNotification = true, lang: string = 'en') {
  try {
    console.log(`Updating reservation ${id} to status: ${status}, sendNotification: ${sendNotification}`)

    const supabase = createServiceRoleClient()
    const access = await getCurrentUserAccess()
    if (!canWrite(access)) {
      return { success: false, message: "Forbidden" }
    }

    const updateData: any = { status }
    if (notes !== undefined) {
      updateData.notes = notes
    }

    // First, get the reservation details
    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select(`
        *,
        restaurants (name, location),
        reservation_areas (name)
      `)
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching reservation:", fetchError)
      return { success: false, message: fetchError.message }
    }

    console.log("Retrieved reservation:", reservation)

    // Authorization: ensure user can update this reservation (restaurant scoped)
    const scope = await coerceRestaurantFilter(reservation?.restaurant_id)
    if (scope.type === "deny") {
      return { success: false, message: "Forbidden" }
    }
    if (scope.type === "one" && scope.id && reservation?.restaurant_id !== scope.id) {
      return { success: false, message: "Forbidden" }
    }

    // Update the reservation status and return the complete row for optimistic dashboard updates.
    const { data: updatedReservation, error } = await supabase
      .from("reservations")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        restaurants (id, name),
        reservation_areas (id, name)
      `)
      .single()

    if (error) {
      console.error("Error updating reservation status:", error)
      return { success: false, message: error.message }
    }

    console.log("Successfully updated reservation status in database")

    // Send notification email if requested
    if (sendNotification && reservation.customer_email) {
      console.log(`Preparing to send email to ${reservation.customer_email}`)

      const isConfirmation = status === "confirmed"

      // Format date for email
      const reservationDate = new Date(reservation.reservation_date)
      const locale = lang === 'tr' ? 'tr-TR' : 'en-US'
      const formattedDate = reservationDate.toLocaleDateString(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      const { subject, html } = generateStatusUpdateEmail({
        customerName: reservation.customer_name,
        restaurantName: reservation.restaurants.name,
        reservationAreaName: (reservation as any)?.reservation_areas?.name || null,
        reservationDate: formattedDate,
        reservationTime: reservation.reservation_time,
        partySize: reservation.party_size,
        status: status === "confirmed" ? "confirmed" : "cancelled",
        notes: notes,
        reservationType: reservation.reservation_type,
        lang,
      })

      // Only generate calendar invite for confirmed reservations
      let attachments: { filename: string; content: string }[] = []

      if (isConfirmation) {
        try {
          // Parse the reservation time
          const [hours, minutes] = reservation.reservation_time.split(":").map(Number)

          // Create start and end dates for the reservation
          const startDate = new Date(reservation.reservation_date)
          startDate.setHours(hours, minutes, 0, 0)

          const endDate = new Date(startDate)
          endDate.setHours(endDate.getHours() + 2) // Assuming 2 hours for dining

          // Generate the calendar invite
          const icsContent = generateICSFile({
            summary: `Reservation at ${reservation.restaurants.name}`,
            description: `Your reservation for ${reservation.party_size} people at ${reservation.restaurants.name}.\n\n${notes || ""}`,
            location: reservation.restaurants.location || `${reservation.restaurants.name}`,
            startDate,
            endDate,
            organizerName: "Felix Restaurants",
            organizerEmail: `reservations@felixsmile.com`,
          })

          attachments = [
            {
              filename: "reservation.ics",
              content: icsContent,
            },
          ]

          console.log("Generated calendar invite attachment")
        } catch (error) {
          console.error("Error generating calendar invite:", error)
          // Continue without the calendar invite if there's an error
        }
      }

      try {
        console.log("Sending email with subject:", subject)

        const emailResult = await sendEmail({
          to: reservation.customer_email,
          subject,
          html,
          attachments,
        })

        if (!emailResult.success) {
          console.error(`Failed to send ${status} email:`, emailResult.error)
          // We still return success for the status update, but log the email failure
        } else {
          console.log("Email sent successfully:", emailResult.data)
        }
      } catch (error) {
        console.error("Error sending email:", error)
        // Continue with the status update even if email sending fails
      }
    } else {
      console.log(
        `Email notification skipped. sendNotification: ${sendNotification}, email: ${reservation.customer_email}`,
      )
    }

    revalidatePath("/manage/reservations")
    await sendReservationPushNotification(id, "status_changed").catch((error) => {
      console.error("Failed to send reservation push notification:", error)
    })

    return {
      success: true,
      data: await attachBookedByEmail(supabase, updatedReservation),
      message: `Reservation ${status} successfully`,
    }
  } catch (error) {
    console.error("Error in updateReservationStatus:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

// Add a function to get all reservations without filters for debugging
export async function getAllReservations() {
  try {
    const access = await getCurrentUserAccess()
    if (!access || !access.isSuperAdmin) {
      return { success: false, message: "Forbidden", data: [] }
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("reservations")
      .select(`
        *,
        restaurants (id, name)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching all reservations:", error)
      return { success: false, message: error.message, data: [] }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in getAllReservations:", error)
    return { success: false, message: "An unexpected error occurred", data: [] }
  }
}

export async function createReservation(reservationData: {
  restaurant_id: string
  reservation_area_id?: string | null
  customer_name: string
  customer_email: string
  customer_phone: string
  party_size: number
  reservation_date: string
  reservation_time: string
  special_requests?: string
  status?: string
  reservation_type?: string
}) {
  try {
    const supabase = createServiceRoleClient()
    const access = await getCurrentUserAccess()
    if (!canWrite(access)) {
      return { success: false, message: "Forbidden" }
    }
    const normalizedSpecialRequests = reservationData.special_requests?.trim() || null
    const scope = await coerceRestaurantFilter(reservationData.restaurant_id)
    if (scope.type === "deny") {
      return { success: false, message: "Forbidden" }
    }
    if (scope.type === "one" && scope.id && reservationData.restaurant_id !== scope.id) {
      return { success: false, message: "Forbidden" }
    }

    const { data, error } = await supabase
      .from("reservations")
      .insert({
        ...reservationData,
        notes: normalizedSpecialRequests,
        reservation_area_id: reservationData.reservation_area_id ? reservationData.reservation_area_id : null,
        status: reservationData.status || "pending",
        booked_by_user_id: access?.userId ?? null,
      })
      .select(`
        *,
        restaurants (id, name),
        reservation_areas (id, name)
      `)
      .single()

    if (error) {
      console.error("Error creating reservation:", error)
      return { success: false, message: error.message }
    }

    revalidatePath("/manage/reservations")
    await sendReservationPushNotification(data.id, "created").catch((error) => {
      console.error("Failed to send reservation push notification:", error)
    })

    return { success: true, data: await attachBookedByEmail(supabase, data), message: "Reservation created successfully" }
  } catch (error) {
    console.error("Error in createReservation:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

export async function updateReservation(id: string, reservationData: {
  restaurant_id?: string
  reservation_area_id?: string | null
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  party_size?: number
  reservation_date?: string
  reservation_time?: string
  special_requests?: string
  status?: string
  table_number?: string
  reservation_type?: string
}) {
  try {
    const supabase = createServiceRoleClient()
    const access = await getCurrentUserAccess()
    if (!canWrite(access)) {
      return { success: false, message: "Forbidden" }
    }
    const shouldSyncNotes = reservationData.special_requests !== undefined
    const normalizedSpecialRequests = reservationData.special_requests?.trim() || null
    const { data: existingReservation, error: existingReservationError } = await supabase
      .from("reservations")
      .select("id, restaurant_id")
      .eq("id", id)
      .single()

    if (existingReservationError || !existingReservation) {
      return { success: false, message: existingReservationError?.message || "Reservation not found" }
    }

    const currentScope = await coerceRestaurantFilter(existingReservation.restaurant_id)
    if (currentScope.type === "deny") {
      return { success: false, message: "Forbidden" }
    }
    if (currentScope.type === "one" && currentScope.id && existingReservation.restaurant_id !== currentScope.id) {
      return { success: false, message: "Forbidden" }
    }

    const targetRestaurantId = reservationData.restaurant_id ?? existingReservation.restaurant_id
    const targetScope = await coerceRestaurantFilter(targetRestaurantId)
    if (targetScope.type === "deny") {
      return { success: false, message: "Forbidden" }
    }
    if (targetScope.type === "one" && targetScope.id && targetRestaurantId !== targetScope.id) {
      return { success: false, message: "Forbidden" }
    }

    const { data, error } = await supabase
      .from("reservations")
      .update({
        ...reservationData,
        ...(shouldSyncNotes ? { notes: normalizedSpecialRequests } : {}),
        reservation_area_id: reservationData.reservation_area_id === "" || reservationData.reservation_area_id === undefined
          ? null
          : reservationData.reservation_area_id,
      })
      .eq("id", id)
      .select(`
        *,
        restaurants (id, name),
        reservation_areas (id, name)
      `)
      .single()

    if (error) {
      console.error("Error updating reservation:", error)
      return { success: false, message: error.message }
    }

    revalidatePath("/manage/reservations")
    await sendReservationPushNotification(id, "updated").catch((error) => {
      console.error("Failed to send reservation push notification:", error)
    })

    return { success: true, data: await attachBookedByEmail(supabase, data), message: "Reservation updated successfully" }
  } catch (error) {
    console.error("Error in updateReservation:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

export async function deleteReservation(id: string) {
  try {
    const supabase = createServiceRoleClient()
    const access = await getCurrentUserAccess()
    if (!canWrite(access)) {
      return { success: false, message: "Forbidden" }
    }

    // Fetch to check scope
    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select("id, restaurant_id")
      .eq("id", id)
      .single()
    if (fetchError) {
      console.error("Error fetching reservation for delete:", fetchError)
      return { success: false, message: fetchError.message }
    }
    const scope = await coerceRestaurantFilter(reservation?.restaurant_id)
    if (scope.type === "deny") {
      return { success: false, message: "Forbidden" }
    }
    if (scope.type === "one" && scope.id && reservation?.restaurant_id !== scope.id) {
      return { success: false, message: "Forbidden" }
    }

    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting reservation:", error)
      return { success: false, message: error.message }
    }

    revalidatePath("/manage/reservations")
    return { success: true, id, message: "Reservation deleted successfully" }
  } catch (error) {
    console.error("Error in deleteReservation:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

export async function getRestaurants() {
  try {
    // Enforce restaurant scope
    const allowed = await getUserRestaurantIds()

    if (Array.isArray(allowed) && allowed.length === 0) {
      return { success: true, data: [] }
    }

    const { data, error } = await fetchManagedRestaurants(allowed)

    if (error) {
      console.error("Error fetching restaurants:", error)
      return { success: false, message: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error in getRestaurants:", error)
    return { success: false, message: "An unexpected error occurred", data: [] }
  }
}

// Public function to get all restaurants for the main page (no authentication required)
export async function getPublicRestaurants() {
  try {
    const { data, error } = await fetchPublicRestaurants()

    if (error) {
      console.error("Error fetching public restaurants:", error)
      return { success: false, message: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error("Error in getPublicRestaurants:", error)
    return { success: false, message: "An unexpected error occurred", data: [] }
  }
}

export async function createRestaurant(data: {
  name: string;
  description?: string;
  cuisine?: string;
  location?: string;
  phone?: string;
  hours?: string;
  atmosphere?: string;
  media_type?: string;
  media_url?: string;
  // Reservation settings
  reservation_enabled?: boolean;
  allowed_days_of_week?: number[];
  opening_time?: string;
  closing_time?: string;
  time_slot_duration?: number;
  advance_booking_days?: number;
  min_advance_hours?: number;
  max_party_size?: number;
  min_party_size?: number;
  reservation_start_date?: string;
  reservation_blocked_intervals?: {
    date: string;
    start_time: string;
    end_time: string;
    message?: string;
  }[];
  meal_only_reservations?: boolean;
}) {
  try {
    const supabase = createServiceRoleClient()
    const access = await getCurrentUserAccess()
    if (!access || !access.isSuperAdmin) {
      return { success: false, message: "Forbidden" }
    }

    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .insert({
        name: data.name,
        description: data.description,
        cuisine: data.cuisine,
        location: data.location,
        phone: data.phone,
        hours: data.hours,
        atmosphere: data.atmosphere,
        media_type: data.media_type,
        // Reservation settings
        reservation_enabled: data.reservation_enabled,
        allowed_days_of_week: data.allowed_days_of_week,
        opening_time: data.opening_time,
        closing_time: data.closing_time,
        time_slot_duration: data.time_slot_duration,
        advance_booking_days: data.advance_booking_days,
        min_advance_hours: data.min_advance_hours,
        max_party_size: data.max_party_size,
        min_party_size: data.min_party_size,
        reservation_start_date: data.reservation_start_date === undefined ? undefined : data.reservation_start_date || null,
        reservation_blocked_intervals: data.reservation_blocked_intervals ?? [],
        meal_only_reservations: data.meal_only_reservations,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating restaurant:", error)
      return { success: false, message: "Failed to create restaurant" }
    }

    // Add media if provided
    if (data.media_url && restaurant) {
      const { error: mediaError } = await supabase
        .from("restaurant_media")
        .insert({
          restaurant_id: restaurant.id,
          media_url: data.media_url,
          media_order: 1,
        })

      if (mediaError) {
        console.error("Error adding restaurant media:", mediaError)
      }
    }

    revalidatePath("/manage/restaurants")
    return { success: true, message: "Restaurant created successfully" }
  } catch (error) {
    console.error("Error creating restaurant:", error)
    return { success: false, message: "Failed to create restaurant" }
  }
}

export async function updateRestaurant(id: string, data: {
  name?: string;
  description?: string;
  cuisine?: string;
  location?: string;
  phone?: string;
  hours?: string;
  atmosphere?: string;
  media_type?: string;
  media_url?: string;
  // Reservation settings
  reservation_enabled?: boolean;
  allowed_days_of_week?: number[];
  opening_time?: string;
  closing_time?: string;
  time_slot_duration?: number;
  advance_booking_days?: number;
  min_advance_hours?: number;
  max_party_size?: number;
  min_party_size?: number;
  reservation_start_date?: string;
  reservation_blocked_intervals?: {
    date: string;
    start_time: string;
    end_time: string;
    message?: string;
  }[];
  meal_only_reservations?: boolean;
}) {
  try {
    const supabase = createServiceRoleClient()
    const access = await getCurrentUserAccess()
    if (!access || !access.isSuperAdmin) {
      return { success: false, message: "Forbidden" }
    }

    const { error } = await supabase
      .from("restaurants")
      .update({
        name: data.name,
        description: data.description,
        cuisine: data.cuisine,
        location: data.location,
        phone: data.phone,
        hours: data.hours,
        atmosphere: data.atmosphere,
        media_type: data.media_type,
        // Reservation settings
        reservation_enabled: data.reservation_enabled,
        allowed_days_of_week: data.allowed_days_of_week,
        opening_time: data.opening_time,
        closing_time: data.closing_time,
        time_slot_duration: data.time_slot_duration,
        advance_booking_days: data.advance_booking_days,
        min_advance_hours: data.min_advance_hours,
        max_party_size: data.max_party_size,
        min_party_size: data.min_party_size,
        reservation_start_date: data.reservation_start_date === undefined ? undefined : data.reservation_start_date || null,
        reservation_blocked_intervals: data.reservation_blocked_intervals,
        meal_only_reservations: data.meal_only_reservations,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      console.error("Error updating restaurant:", error)
      return { success: false, message: "Failed to update restaurant" }
    }

    // Update media if provided
    if (data.media_url) {
      // First, try to update existing media
      const { data: existingMedia } = await supabase
        .from("restaurant_media")
        .select("id")
        .eq("restaurant_id", id)
        .limit(1)
        .single()

      if (existingMedia) {
        await supabase
          .from("restaurant_media")
          .update({ media_url: data.media_url })
          .eq("id", existingMedia.id)
      } else {
        await supabase
          .from("restaurant_media")
          .insert({
            restaurant_id: id,
            media_url: data.media_url,
            media_order: 1,
          })
      }
    }

    revalidatePath("/manage/restaurants")
    return { success: true, message: "Restaurant updated successfully" }
  } catch (error) {
    console.error("Error updating restaurant:", error)
    return { success: false, message: "Failed to update restaurant" }
  }
}

export async function deleteRestaurant(id: string) {
  try {
    const supabase = createServiceRoleClient()
    const access = await getCurrentUserAccess()
    if (!access || !access.isSuperAdmin) {
      return { success: false, message: "Forbidden" }
    }

    const { error } = await supabase
      .from("restaurants")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting restaurant:", error)
      return { success: false, message: error.message }
    }

    revalidatePath("/manage/restaurants")
    return { success: true, message: "Restaurant deleted successfully" }
  } catch (error) {
    console.error("Error in deleteRestaurant:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}
