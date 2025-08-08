"use server"

import { seedRestaurants } from "@/lib/seed-data"
import { createServerClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function initializeDatabase() {
  try {
    await seedRestaurants()
    revalidatePath("/")
    return { success: true, message: "Database initialized successfully" }
  } catch (error) {
    console.error("Error initializing database:", error)
    return { success: false, message: "Failed to initialize database" }
  }
}

export async function createInitialAdminUser(email: string, password: string, fullName: string) {
  try {
    const supabase = createServerClient()

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      console.error("Error creating admin user:", authError)
      return { success: false, message: authError.message }
    }

    // Create the admin profile
    const { error: profileError } = await supabase.from("admin_profiles").insert({
      id: authData.user.id,
      full_name: fullName,
      role: "admin",
    })

    if (profileError) {
      console.error("Error creating admin profile:", profileError)
      return { success: false, message: profileError.message }
    }

    return { success: true, message: "Admin user created successfully" }
  } catch (error) {
    console.error("Error in createInitialAdminUser:", error)
    return { success: false, message: "An unexpected error occurred" }
  }
}
