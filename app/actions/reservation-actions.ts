"use server"

import { createServerClient, createServiceRoleClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { sendEmail, generateReservationConfirmationEmail, generateManagementNotificationEmail, MANAGEMENT_EMAIL } from "@/lib/email-service"
import { defaultRestaurant, defaultMedia } from "@/lib/fallback-data"

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
  lang?: string
}

export async function createReservation(params: CreateReservationParams) {
  try {
    // Use service role to ensure inserts succeed regardless of RLS on public form
    const supabase = createServiceRoleClient()

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
        status: "pending",
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
    })

    const mgmtEmailResult = await sendEmail({
      to: MANAGEMENT_EMAIL,
      subject: mgmtSubject,
      html: mgmtHtml,
    })

    if (!mgmtEmailResult.success) {
      console.error("Failed to send management notification email:", mgmtEmailResult.error)
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
  try {
    // Use service role to reliably read even if RLS blocks anon
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .ilike("name", name)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn("getRestaurantByName query error:", error.message)
      return null
    }

    return data
  } catch (err: any) {
    console.warn("getRestaurantByName failed:", String(err))
    return null
  }
}

// Fetch active reservation areas for a restaurant
export async function getActiveReservationAreas(restaurantId: string) {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("reservation_areas")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) {
      console.warn("getActiveReservationAreas error:", error.message)
      return []
    }

    return data || []
  } catch (err: any) {
    console.warn("getActiveReservationAreas failed:", String(err))
    return []
  }
}

export async function getRestaurantMedia(restaurantId: string) {
  try {
    // Use service role for consistent reads
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("restaurant_media")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("media_order")

    if (error) {
      console.error("Error fetching restaurant media:", error)
      return defaultMedia
    }

    return data?.length ? data : defaultMedia
  } catch (err: any) {
    const msg = String(err?.message || err || "")
    if (msg.includes("Unexpected token") || msg.toLowerCase().includes("invalid")) {
      console.warn("Using fallback media due to Supabase misconfiguration.")
      return defaultMedia
    }
    console.error("Error in getRestaurantMedia:", msg)
    return defaultMedia
  }
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
}

export async function updateReservation(params: UpdateReservationParams) {
  try {
    const supabase = createServiceRoleClient()

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
    const updatedReservation = data?.[0]
    if (updatedReservation) {
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
      })

      const mgmtEmailResult = await sendEmail({
        to: MANAGEMENT_EMAIL,
        subject: mgmtSubject,
        html: mgmtHtml,
      })

      if (!mgmtEmailResult.success) {
        console.error("Failed to send management notification email:", mgmtEmailResult.error)
      }
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
