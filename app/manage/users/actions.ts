"use server"

import { createServerClient, createServiceRoleClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export interface CreateUserData {
  email: string
  password: string
  role: string
}

export interface UpdateUserData {
  email: string
  role: string
}

export async function getUsers() {
  try {
    const supabase = createServiceRoleClient()
    
    // Get admin profiles with their auth user data
    const { data: adminProfiles, error: profileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (profileError) {
      console.error("Error fetching admin profiles:", profileError)
      return {
        success: false,
        error: "Failed to fetch admin profiles"
      }
    }

    // Get auth user data for each admin profile
    const usersWithAuth = []
    for (const profile of adminProfiles || []) {
      try {
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id)
        if (!authError && authUser.user) {
          usersWithAuth.push({
            id: profile.id,
            email: authUser.user.email || '',
            role: profile.role || 'staff',
            full_name: profile.full_name,
            restaurant_id: profile.restaurant_id,
            created_at: profile.created_at
          })
        }
      } catch (authError) {
        console.warn(`Could not fetch auth data for user ${profile.id}:`, authError)
        // Include profile even if auth data is unavailable
        usersWithAuth.push({
          id: profile.id,
          email: 'Unknown',
          role: profile.role || 'staff',
          full_name: profile.full_name,
          restaurant_id: profile.restaurant_id,
          created_at: profile.created_at
        })
      }
    }

    return {
      success: true,
      data: usersWithAuth
    }
  } catch (error) {
    console.error("Error fetching users:", error)
    return {
      success: false,
      error: "Failed to fetch users"
    }
  }
}

export async function createUser(userData: CreateUserData) {
  try {
    const supabase = createServiceRoleClient()
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true
    })
    
    if (authError) {
      console.error("Error creating auth user:", authError)
      return {
        success: false,
        error: authError.message || "Failed to create user"
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: "Failed to create user - no user data returned"
      }
    }
    
    // Create admin profile
    const { error: profileError } = await supabase
      .from('admin_profiles')
      .insert({
        id: authData.user.id,
        role: userData.role,
        full_name: null // Can be updated later
      })
    
    if (profileError) {
      console.error("Error creating admin profile:", profileError)
      // Try to clean up the auth user if profile creation fails
      try {
        await supabase.auth.admin.deleteUser(authData.user.id)
      } catch (cleanupError) {
        console.error("Error cleaning up auth user:", cleanupError)
      }
      return {
        success: false,
        error: "Failed to create user profile"
      }
    }

    const newUser = {
      id: authData.user.id,
      email: authData.user.email || userData.email,
      role: userData.role,
      full_name: null,
      restaurant_id: null,
      created_at: authData.user.created_at
    }

    revalidatePath("/manage/users")
    
    return {
      success: true,
      data: newUser
    }
  } catch (error) {
    console.error("Error creating user:", error)
    return {
      success: false,
      error: "Failed to create user"
    }
  }
}

export async function updateUser(userId: string, userData: UpdateUserData) {
  try {
    const supabase = createServiceRoleClient()
    
    // Update user email in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(userId, {
      email: userData.email
    })
    
    if (authError) {
      console.error("Error updating auth user:", authError)
      return {
        success: false,
        error: authError.message || "Failed to update user"
      }
    }
    
    // Update admin profile
    const { data: profileData, error: profileError } = await supabase
      .from('admin_profiles')
      .update({
        role: userData.role
      })
      .eq('id', userId)
      .select()
      .single()
    
    if (profileError) {
      console.error("Error updating admin profile:", profileError)
      return {
        success: false,
        error: "Failed to update user profile"
      }
    }
    
    const updatedUser = {
      id: userId,
      email: authData.user?.email || userData.email,
      role: userData.role,
      full_name: profileData?.full_name,
      restaurant_id: profileData?.restaurant_id,
      created_at: profileData?.created_at
    }

    revalidatePath("/manage/users")
    
    return {
      success: true,
      data: updatedUser
    }
  } catch (error) {
    console.error("Error updating user:", error)
    return {
      success: false,
      error: "Failed to update user"
    }
  }
}

export async function deleteUser(userId: string) {
  try {
    const supabase = createServiceRoleClient()
    
    // First delete the admin profile
    const { error: profileError } = await supabase
      .from('admin_profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      console.error("Error deleting admin profile:", profileError)
      return {
        success: false,
        error: "Failed to delete user profile"
      }
    }
    
    // Then delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error("Error deleting auth user:", authError)
      return {
        success: false,
        error: authError.message || "Failed to delete user"
      }
    }
    
    revalidatePath("/manage/users")
    
    return {
      success: true
    }
  } catch (error) {
    console.error("Error deleting user:", error)
    return {
      success: false,
      error: "Failed to delete user"
    }
  }
}

// Helper function to check if current user has admin privileges
export async function checkAdminAccess() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return {
        success: false,
        error: "Not authenticated"
      }
    }

    // Check the user's role from admin_profiles table
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error("Error fetching admin profile:", profileError)
      return {
        success: false,
        error: "User profile not found"
      }
    }
    
    const userRole = adminProfile?.role || "staff"
    
    if (userRole !== "admin") {
      return {
        success: false,
        error: "Insufficient privileges"
      }
    }

    return {
      success: true
    }
  } catch (error) {
    console.error("Error checking admin access:", error)
    return {
      success: false,
      error: "Failed to verify access"
    }
  }
}