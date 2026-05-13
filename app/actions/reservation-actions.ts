"use server"

import { createServiceRoleClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { sendEmail, generateReservationConfirmationEmail, generateManagementNotificationEmail, MANAGEMENT_EMAIL } from "@/lib/email-service"
import { sendReservationPushNotification } from "@/lib/push-service"
import {
  fetchActiveReservationAreas,
  fetchRestaurantByName,
  fetchRestaurantMedia,
} from "@/lib/services/public/restaurant-service"
import { buildReservationUpdateSummary } from "@/lib/reservation-update-summary"

/**
 * Create a reservation (server action).
 * Returns structured result instead of throwing for expected errors, as recommended by Next.js [^5][^2].
 */
interface CreateReservationParams {
  restaurantId: string
  reservationAreaId?: string | null
  partySize: number
  reservationDate: string
  reservationTime: string
  customerName: string
  customerPhone: string
  customerEmail: string
  specialRequests?: string
  tableNumber?: string
  reservationType?: string
  lang?: string
}

interface ReservationBlockedInterval {
  date: string
  start_time: string
  end_time: string
  message?: string
}

function normalizeBlockedIntervals(value: unknown): ReservationBlockedInterval[] {
  if (!Array.isArray(value)) return []

  return value.filter((interval): interval is ReservationBlockedInterval => (
    Boolean(interval) &&
    typeof interval === "object" &&
    typeof (interval as ReservationBlockedInterval).date === "string" &&
    typeof (interval as ReservationBlockedInterval).start_time === "string" &&
    typeof (interval as ReservationBlockedInterval).end_time === "string"
  ))
}

function parseTimeToMinutes(value: string | null | undefined) {
  if (!value) return null
  const [hour, minute = 0] = value.split(":").map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
  if (hour === 24 && minute === 0) return 24 * 60
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}

function findBlockedIntervalForReservation(
  intervals: ReservationBlockedInterval[],
  reservationDate: string,
  reservationTime: string
) {
  const reservationMinutes = parseTimeToMinutes(reservationTime)
  if (reservationMinutes === null) return null

  return intervals.find((interval) => {
    if (interval.date !== reservationDate) return false
    const startMinutes = parseTimeToMinutes(interval.start_time)
    const endMinutes = parseTimeToMinutes(interval.end_time)
    if (startMinutes === null || endMinutes === null) return false
    return reservationMinutes >= startMinutes && reservationMinutes < endMinutes
  }) || null
}

export async function createReservation(params: CreateReservationParams) {
  try {
    // Use service role to ensure inserts succeed regardless of RLS on public form
    const supabase = createServiceRoleClient()

    const { data: restaurantSettings, error: restaurantSettingsError } = await supabase
      .from("restaurants")
      .select("reservation_enabled, reservation_start_date, reservation_blocked_intervals")
      .eq("id", params.restaurantId)
      .single()

    if (restaurantSettingsError || !restaurantSettings) {
      console.error("Error fetching restaurant settings:", restaurantSettingsError)
      return { success: false, message: "Restaurant information not found" }
    }

    if (restaurantSettings.reservation_enabled === false) {
      return { success: false, message: "This restaurant is not accepting reservations right now." }
    }

    if (
      restaurantSettings.reservation_start_date &&
      params.reservationDate < restaurantSettings.reservation_start_date
    ) {
      return {
        success: false,
        message: `This restaurant accepts reservations starting from ${restaurantSettings.reservation_start_date}.`,
      }
    }

    const blockedInterval = findBlockedIntervalForReservation(
      normalizeBlockedIntervals(restaurantSettings.reservation_blocked_intervals),
      params.reservationDate,
      params.reservationTime
    )

    if (blockedInterval) {
      return {
        success: false,
        message:
          blockedInterval.message ||
          `We are fully booked between ${blockedInterval.start_time} - ${blockedInterval.end_time}.`,
      }
    }

    const { data, error } = await supabase
      .from("reservations")
      .insert({
        restaurant_id: params.restaurantId,
        reservation_area_id: params.reservationAreaId || null,
        party_size: params.partySize,
        reservation_date: params.reservationDate,
        reservation_time: params.reservationTime,
        customer_name: params.customerName,
        customer_phone: params.customerPhone,
        customer_email: params.customerEmail,
        special_requests: params.specialRequests || null,
        table_number: params.tableNumber || null,
        reservation_type: params.reservationType || "meal",
        status: "pending",
        booked_by_label: "Online",
      })
      .select(`*, reservation_areas ( name )`)

    if (error) {
      console.error("Error creating reservation:", error)
      return { success: false, message: "Failed to create reservation", error }
    }

    // Get restaurant details for the email
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("name")
      .eq("id", params.restaurantId)
      .single()

    // Format date for email
    const reservationDate = new Date(params.reservationDate)
    const locale = params.lang === 'tr' ? 'tr-TR' : 'en-US'
    const formattedDate = reservationDate.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // Generate email content
    const { subject, html } = generateReservationConfirmationEmail({
      customerName: params.customerName,
      restaurantName: restaurant?.name || "Felix Restaurant",
      reservationAreaName: (data?.[0] as any)?.reservation_areas?.name || null,
      reservationDate: formattedDate,
      reservationTime: params.reservationTime,
      partySize: params.partySize,
      reservationType: params.reservationType,
      lang: params.lang === 'tr' ? 'tr' : 'en',
    })

    // Try to send customer confirmation email
    const emailResult = await sendEmail({
      to: params.customerEmail,
      subject,
      html,
    })

    // Send management notification email
    const { subject: mgmtSubject, html: mgmtHtml } = generateManagementNotificationEmail({
      action: 'created',
      customerName: params.customerName,
      restaurantName: restaurant?.name || "Felix Restaurant",
      reservationAreaName: (data?.[0] as any)?.reservation_areas?.name || null,
      reservationDate: formattedDate,
      reservationTime: params.reservationTime,
      partySize: params.partySize,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      specialRequests: params.specialRequests,
      reservationId: data?.[0]?.id || 'Unknown',
      reservationType: params.reservationType,
    })

    const mgmtEmailResult = await sendEmail({
      to: MANAGEMENT_EMAIL,
      subject: mgmtSubject,
      html: mgmtHtml,
    })

    if (!mgmtEmailResult.success) {
      console.error("Failed to send management notification email:", mgmtEmailResult.error)
    }

    if (data?.[0]?.id) {
      await sendReservationPushNotification(data[0].id, "created").catch((error) => {
        console.error("Failed to send reservation push notification:", error)
      })
    }

    let message =
      "Reservation created successfully. The team will confirm your reservation shortly."

    if (!emailResult.success && emailResult.emailDisabled) {
      console.log("Email sending is disabled in this preview environment.")
      message +=
        " (Note: Email notification could not be sent in this preview environment, but your reservation has been recorded.)"
    } else if (!emailResult.success) {
      console.error("Failed to send confirmation email:", emailResult.error)
    }

    revalidatePath("/reserve")
    revalidatePath("/manage")
    revalidatePath("/manage/reservations")

    return {
      success: true,
      message,
      data: data?.[0],
      emailSent: emailResult.success,
    }
  } catch (error) {
    console.error("Error in createReservation:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

/**
  Attempts to fetch a restaurant by name. If Supabase is misconfigured or returns
  a non-JSON response, we log and return a safe fallback instead of throwing,
  per Next.js guidance on expected errors [^1][^2][^5].
*/
export async function getRestaurantByName(name: string) {
  return fetchRestaurantByName(name)
}

// Fetch active reservation areas for a restaurant
export async function getActiveReservationAreas(restaurantId: string) {
  return fetchActiveReservationAreas(restaurantId)
}

export async function getRestaurantMedia(restaurantId: string) {
  return fetchRestaurantMedia(restaurantId)
}

/**
 * Update an existing reservation
 */
interface UpdateReservationParams {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  party_size: number
  reservation_date: string
  reservation_time: string
  special_requests?: string
  table_number?: string
  reservation_type?: string
}

export async function updateReservation(params: UpdateReservationParams) {
  try {
    const supabase = createServiceRoleClient()

    const { data: existingReservation, error: existingReservationError } = await supabase
      .from("reservations")
      .select(`
        *,
        restaurants (name),
        reservation_areas (name)
      `)
      .eq("id", params.id)
      .single()

    if (existingReservationError || !existingReservation) {
      console.error("Error fetching reservation before update:", existingReservationError)
      return { success: false, message: "Reservation not found" }
    }

    const { data, error } = await supabase
      .from("reservations")
      .update({
        customer_name: params.customer_name,
        customer_email: params.customer_email,
        customer_phone: params.customer_phone,
        party_size: params.party_size,
        reservation_date: params.reservation_date,
        reservation_time: params.reservation_time,
        special_requests: params.special_requests || null,
        table_number: params.table_number || null,
        // Any customer-initiated edits should put reservation back to pending
        status: 'pending',
      })
      .eq("id", params.id)
      .select(`
        *,
        restaurants (name),
        reservation_areas (name)
      `)

    if (error) {
      console.error("Error updating reservation:", error)
      return { success: false, message: "Failed to update reservation", error }
    }

    // Get updated reservation data
    let updatedReservation = data?.[0]
    if (updatedReservation) {
      const updateSummary = buildReservationUpdateSummary(existingReservation, updatedReservation, {
        source: "customer",
      })

      if (updateSummary) {
        const { data: summaryData, error: summaryError } = await supabase
          .from("reservations")
          .update({
            last_update_summary: updateSummary,
            last_updated_by_user_id: null,
          })
          .eq("id", params.id)
          .select(`
            *,
            restaurants (name),
            reservation_areas (name)
          `)

        if (summaryError) {
          console.error("Error saving customer reservation update summary:", summaryError)
          updatedReservation = { ...updatedReservation, last_update_summary: updateSummary, last_updated_by_user_id: null }
        } else {
          updatedReservation = summaryData?.[0] || updatedReservation
        }
      }

      // Format date for email
      const reservationDate = new Date(params.reservation_date)
      const formattedDate = reservationDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      // Send management notification email
      const { subject: mgmtSubject, html: mgmtHtml } = generateManagementNotificationEmail({
        action: 'updated',
        customerName: params.customer_name,
        restaurantName: updatedReservation.restaurants?.name || "Felix Restaurant",
        reservationAreaName: (updatedReservation as any)?.reservation_areas?.name || null,
        reservationDate: formattedDate,
        reservationTime: params.reservation_time,
        partySize: params.party_size,
        customerEmail: params.customer_email,
        customerPhone: params.customer_phone,
        specialRequests: params.special_requests,
        reservationId: params.id,
        reservationType: params.reservation_type,
      })

      const mgmtEmailResult = await sendEmail({
        to: MANAGEMENT_EMAIL,
        subject: mgmtSubject,
        html: mgmtHtml,
      })

      if (!mgmtEmailResult.success) {
        console.error("Failed to send management notification email:", mgmtEmailResult.error)
      }

      await sendReservationPushNotification(params.id, "updated").catch((error) => {
        console.error("Failed to send reservation push notification:", error)
      })
    }

    revalidatePath("/manage/reservations")
    revalidatePath("/reserve")

    return {
      success: true,
      message: "Reservation updated successfully",
      data: updatedReservation,
    }
  } catch (error) {
    console.error("Error in updateReservation:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}

/**
 * Fetch reservation status and notes by ID for customer display
 */
export async function getReservationStatus(id: string) {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("reservations")
      .select("id, status, notes")
      .eq("id", id)
      .maybeSingle()

    if (error) {
      console.error("Error fetching reservation status:", error)
      return { success: false, message: "Failed to fetch reservation status" }
    }

    if (!data) {
      return { success: false, message: "Reservation not found" }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in getReservationStatus:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}
