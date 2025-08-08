"use server"

import { createServerClient, createServiceRoleClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { sendEmail, generateReservationConfirmationEmail } from "@/lib/email-service"
import { defaultRestaurant, defaultMedia } from "@/lib/fallback-data"

/**
 * Create a reservation (server action).
 * Returns structured result instead of throwing for expected errors, as recommended by Next.js [^5][^2].
 */
interface CreateReservationParams {
  restaurantId: string
  partySize: number
  reservationDate: string
  reservationTime: string
  customerName: string
  customerPhone: string
  customerEmail: string
  specialRequests?: string
}

export async function createReservation(params: CreateReservationParams) {
  try {
    // Use service role to ensure inserts succeed regardless of RLS on public form
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("reservations")
      .insert({
        restaurant_id: params.restaurantId,
        party_size: params.partySize,
        reservation_date: params.reservationDate,
        reservation_time: params.reservationTime,
        customer_name: params.customerName,
        customer_phone: params.customerPhone,
        customer_email: params.customerEmail,
        special_requests: params.specialRequests || null,
        status: "pending",
      })
      .select()

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
    const formattedDate = reservationDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // Generate email content
    const { subject, html } = generateReservationConfirmationEmail({
      customerName: params.customerName,
      restaurantName: restaurant?.name || "Felix Restaurant",
      reservationDate: formattedDate,
      reservationTime: params.reservationTime,
      partySize: params.partySize,
      lang: "en",
    })

    // Try to send email
    const emailResult = await sendEmail({
      to: params.customerEmail,
      subject,
      html,
    })

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
      })
      .eq("id", params.id)
      .select()

    if (error) {
      console.error("Error updating reservation:", error)
      return { success: false, message: "Failed to update reservation", error }
    }

    revalidatePath("/manage/reservations")
    revalidatePath("/reserve")

    return {
      success: true,
      message: "Reservation updated successfully",
      data: data?.[0],
    }
  } catch (error) {
    console.error("Error in updateReservation:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}
