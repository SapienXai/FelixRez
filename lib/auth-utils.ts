"use server"

import { createServiceRoleClient } from "../lib/supabase"
import { createClient } from '@supabase/supabase-js'

export interface UserAccess {
  userId: string
  restaurantId: string | null
  role: string
  isSuperAdmin: boolean
}

/**
 * Get the current user's restaurant access information
 * Returns null if user is not authenticated or doesn't have admin profile
 */
export async function getCurrentUserAccess(): Promise<UserAccess | null> {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return null
    }
    
    // Get user's admin profile
    const { data: profile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('restaurant_id, role')
      .eq('id', session.user.id)
      .single()
    
    if (profileError || !profile) {
      return null
    }
    
    return {
      userId: session.user.id,
      restaurantId: profile.restaurant_id,
      role: profile.role,
      isSuperAdmin: profile.restaurant_id === null && profile.role === 'admin'
    }
  } catch (error) {
    console.error('Error getting user access:', error)
    return null
  }
}

/**
 * Check if user has access to a specific restaurant
 */
export async function hasRestaurantAccess(restaurantId: string): Promise<boolean> {
  const userAccess = await getCurrentUserAccess()
  
  if (!userAccess) {
    return false
  }
  
  // Super admins have access to all restaurants
  if (userAccess.isSuperAdmin) {
    return true
  }
  
  // Restaurant-specific users can only access their assigned restaurant
  return userAccess.restaurantId === restaurantId
}

/**
 * Get the restaurant IDs that the current user has access to
 * Returns null for super admins (meaning access to all)
 * Returns array of restaurant IDs for restaurant-specific users
 */
export async function getUserRestaurantIds(): Promise<string[] | null> {
  const userAccess = await getCurrentUserAccess()
  
  if (!userAccess) {
    return []
  }
  
  // Super admins have access to all restaurants
  if (userAccess.isSuperAdmin) {
    return null
  }
  
  // Restaurant-specific users can only access their assigned restaurant
  if (userAccess.restaurantId) {
    return [userAccess.restaurantId]
  }
  
  return []
}