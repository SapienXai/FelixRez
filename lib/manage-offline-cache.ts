"use client"

import type { Database } from "@/types/supabase"

export type ManageCachedReservation = Database["public"]["Tables"]["reservations"]["Row"] & {
  restaurants?: { id: string; name: string } | null
  reservation_areas?: { id: string; name: string } | null
  booked_by_email?: string | null
  booked_by_label?: string | null
  booked_by_name?: string | null
}

export type ManageCachedRestaurant = {
  id: string
  name: string
  meal_only_reservations?: boolean
}

export type ManageOfflineCache = {
  syncedAt: string
  reservations: ManageCachedReservation[]
  restaurants: ManageCachedRestaurant[]
}

const CACHE_KEY = "felix:manage:emergency-offline-cache:v1"

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function getManageOfflineRange(date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  }
}

export function isReservationInManageOfflineRange(reservation: { reservation_date?: string | null }) {
  if (!reservation.reservation_date) {
    return false
  }

  const { startDate, endDate } = getManageOfflineRange()
  return reservation.reservation_date >= startDate && reservation.reservation_date <= endDate
}

export function filterReservationsForManageOfflineRange<T extends { reservation_date?: string | null }>(
  reservations: T[]
) {
  return reservations.filter(isReservationInManageOfflineRange)
}

export function readManageOfflineCache(): ManageOfflineCache | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<ManageOfflineCache>
    if (
      typeof parsed.syncedAt !== "string" ||
      !Array.isArray(parsed.reservations) ||
      !Array.isArray(parsed.restaurants)
    ) {
      window.localStorage.removeItem(CACHE_KEY)
      return null
    }

    return {
      syncedAt: parsed.syncedAt,
      reservations: parsed.reservations as ManageCachedReservation[],
      restaurants: parsed.restaurants as ManageCachedRestaurant[],
    }
  } catch {
    window.localStorage.removeItem(CACHE_KEY)
    return null
  }
}

export function writeManageOfflineCache(input: {
  reservations: ManageCachedReservation[]
  restaurants: ManageCachedRestaurant[]
}) {
  if (typeof window === "undefined") {
    return null
  }

  const existingCache = readManageOfflineCache()
  const nextReservations = filterReservationsForManageOfflineRange(input.reservations)
  const reservationMap = new Map<string, ManageCachedReservation>()
  for (const reservation of existingCache?.reservations || []) {
    reservationMap.set(reservation.id, reservation)
  }
  for (const reservation of nextReservations) {
    reservationMap.set(reservation.id, reservation)
  }
  const reservations = Array.from(reservationMap.values())
  const restaurants = input.restaurants.length > 0 ? input.restaurants : existingCache?.restaurants || []

  const cache: ManageOfflineCache = {
    syncedAt: new Date().toISOString(),
    reservations,
    restaurants,
  }

  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    return cache
  } catch {
    return null
  }
}
