"use server"

import { seedRestaurants } from "@/lib/seed-data"

export async function seedDatabase() {
  // Run seeding with strict service role client; return structured result for UI
  const result = await seedRestaurants()
  return result
}
