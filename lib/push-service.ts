import webpush, { type PushSubscription } from "web-push"
import { createServiceRoleClient } from "@/lib/supabase"

type ReservationPushEvent = "created" | "updated"

type AdminPushSubscriptionRow = {
  id: string
  user_id: string
  restaurant_id: string | null
  endpoint: string
  p256dh: string
  auth: string
  enabled: boolean
}

type AdminProfileRow = {
  id: string
  role: string | null
  restaurant_id: string | null
}

function getVapidConfig() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY || process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY
  const subject = process.env.WEB_PUSH_SUBJECT || "mailto:info@felixsmile.com"

  if (!publicKey || !privateKey) {
    return null
  }

  return { publicKey, privateKey, subject }
}

export function getWebPushPublicKey() {
  return process.env.WEB_PUSH_PUBLIC_KEY || process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || null
}

function configureWebPush() {
  const config = getVapidConfig()
  if (!config) {
    return false
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)
  return true
}

function canReceiveRestaurantPush(profile: AdminProfileRow | undefined, restaurantId: string) {
  if (!profile || profile.role === "readonly") {
    return false
  }

  if (profile.role === "admin") {
    return true
  }

  return profile.restaurant_id === restaurantId
}

function formatReservationDate(date: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(new Date(`${date}T00:00:00`))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value

  return [part("weekday"), part("day"), part("month")].filter(Boolean).join(" ")
}

function getReservationNotificationTitle(event: ReservationPushEvent) {
  return event === "updated" ? "Update Reservation" : "New Reservation"
}

export async function sendReservationPushNotification(
  reservationId: string,
  event: ReservationPushEvent
) {
  if (!configureWebPush()) {
    console.warn("Web Push is not configured. Set WEB_PUSH_PUBLIC_KEY and WEB_PUSH_PRIVATE_KEY.")
    return
  }

  const supabase = createServiceRoleClient()

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .select(`
      id,
      restaurant_id,
      customer_name,
      party_size,
      reservation_date,
      reservation_time,
      restaurants(name),
      reservation_areas(name)
    `)
    .eq("id", reservationId)
    .single()

  if (reservationError || !reservation) {
    console.error("Could not fetch reservation for push notification:", reservationError)
    return
  }

  const restaurantId = reservation.restaurant_id

  const [{ data: subscriptions }, { data: profiles }] = await Promise.all([
    supabase
      .from("admin_push_subscriptions")
      .select("id, user_id, restaurant_id, endpoint, p256dh, auth, enabled")
      .eq("enabled", true),
    supabase
      .from("admin_profiles")
      .select("id, role, restaurant_id"),
  ])

  if (!subscriptions?.length || !profiles?.length) {
    return
  }

  const profilesById = new Map((profiles as AdminProfileRow[]).map((profile) => [profile.id, profile]))
  const restaurantName = (reservation.restaurants as any)?.name || "Felix"
  const body = [
    restaurantName,
    formatReservationDate(reservation.reservation_date),
    `${reservation.party_size} Pax`,
    reservation.customer_name,
  ].filter(Boolean).join(" - ")

  const payload = JSON.stringify({
    title: getReservationNotificationTitle(event),
    body,
    icon: "/placeholder-logo.png",
    badge: "/placeholder-logo.png",
    url: `/manage/reservations?reservationId=${encodeURIComponent(reservationId)}`,
    reservationId,
    event,
  })

  await Promise.all(
    (subscriptions as AdminPushSubscriptionRow[])
      .filter((subscription) => canReceiveRestaurantPush(profilesById.get(subscription.user_id), restaurantId))
      .map(async (subscription) => {
        const pushSubscription: PushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        }

        try {
          await webpush.sendNotification(pushSubscription, payload)
        } catch (error: any) {
          const statusCode = error?.statusCode
          if (statusCode === 404 || statusCode === 410) {
            await supabase
              .from("admin_push_subscriptions")
              .update({ enabled: false })
              .eq("id", subscription.id)
          } else {
            console.error("Failed to send push notification:", error)
          }
        }
      })
  )
}
