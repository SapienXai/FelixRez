"use server"

import { cookies } from "next/headers"
import { createServiceRoleClient } from "../lib/supabase"

export interface UserAccess {
  userId: string
  restaurantId: string | null
  role: string
  isSuperAdmin: boolean
}

function getProjectCookieName(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  let projectRef = "supabase"
  if (supabaseUrl) {
    try {
      projectRef = new URL(supabaseUrl).host.split(".")[0]
    } catch {}
  }
  return `sb-${projectRef}-auth-token`
}

/**
 * Read the current user from the Supabase auth cookie and return restaurant-scoped access.
 * Returns null if unauthenticated or profile missing.
 */
export async function getCurrentUserAccess(): Promise<UserAccess | null> {
  try {
    const cookieName = getProjectCookieName()
    const store = await cookies()
    const raw = store.get(cookieName)?.value
    if (!raw) return null

    let userId: string | null = null
    try {
      const parsed = JSON.parse(raw)
      userId = parsed?.currentSession?.user?.id || parsed?.user?.id || null
    } catch {
      userId = null
    }
    if (!userId) return null

    const supabase = createServiceRoleClient()
    const { data: profile, error } = await supabase
      .from("admin_profiles")
      .select("restaurant_id, role")
      .eq("id", userId)
      .single()

    if (error || !profile) return null

    const access: UserAccess = {
      userId,
      restaurantId: profile.restaurant_id,
      role: profile.role || "staff",
      // Treat any 'admin' as super admin regardless of restaurant_id
      isSuperAdmin: profile.role === "admin",
    }
    return access
  } catch (error) {
    console.error("Error resolving user access:", error)
    return null
  }
}

/** Check if current user may access a restaurant id. */
export async function hasRestaurantAccess(restaurantId: string): Promise<boolean> {
  const access = await getCurrentUserAccess()
  if (!access) return false
  if (access.isSuperAdmin) return true
  return access.restaurantId === restaurantId
}

/**
 * Get restaurant scope for current user.
 * - null => super-admin (all restaurants)
 * - [id] => scoped to that single restaurant
 * - [] => no access
 */
export async function getUserRestaurantIds(): Promise<string[] | null> {
  const access = await getCurrentUserAccess()
  if (!access) return []
  if (access.isSuperAdmin) return null
  return access.restaurantId ? [access.restaurantId] : []
}

/**
 * Given an optional requested restaurantId, coerce it to the allowed scope.
 * - If super-admin: returns requested id (or undefined to mean all)
 * - If scoped: returns the only allowed id regardless of requested
 * - If no access: returns "DENY"
 */
export async function coerceRestaurantFilter(requested?: string): Promise<{ type: "all" | "one" | "deny"; id?: string }> {
  const allowed = await getUserRestaurantIds()
  if (allowed === null) {
    // super admin
    return requested ? { type: "one", id: requested } : { type: "all" }
  }
  if (!allowed || allowed.length === 0) return { type: "deny" }
  return { type: "one", id: allowed[0] }
}
