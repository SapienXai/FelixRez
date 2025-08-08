import { createServiceRoleClient } from "@/lib/supabase"

type SeedResult = { success: boolean; message: string }

export async function seedRestaurants(): Promise<SeedResult> {
  let supabase: ReturnType<typeof createServiceRoleClient>
  try {
    supabase = createServiceRoleClient()
  } catch (e: any) {
    return { success: false, message: `Supabase misconfigured: ${e?.message ?? String(e)}` }
  }

  try {
    // Verify table exists; if not, prompt to run SQL first.
    const { count, error: existsError } = await supabase
      .from("restaurants")
      .select("*", { count: "exact", head: true })

    if (existsError && (existsError.message?.toLowerCase().includes("relation") || existsError.code === "42P01")) {
      return {
        success: false,
        message: "Tables not found. Run scripts/sql/001_create_tables.sql in Supabase SQL editor, then try again.",
      }
    }

    if (typeof count === "number" && count > 0) {
      return { success: true, message: "Restaurants already seeded." }
    }

    const restaurants = [
      {
        name: "Felix Beach",
        description: "Dine with your toes in the sand and the sound of waves as your backdrop",
        cuisine: "Mediterranean",
        hours: "12PM - 10PM",
        atmosphere: "Relaxing",
        phone: "+12345678901",
        location: "Felix+Beach",
        media_type: "slideshow",
      },
      {
        name: "Felix Garden",
        description: "A lush oasis where nature and culinary artistry blend seamlessly",
        cuisine: "Farm-to-Table",
        hours: "11AM - 9PM",
        atmosphere: "Serene",
        phone: "+12345678902",
        location: "Felix+Garden",
        media_type: "video",
      },
      {
        name: "Felix Marina",
        description: "Elegant waterfront dining with stunning views of luxury yachts",
        cuisine: "Seafood",
        hours: "5PM - 11PM",
        atmosphere: "Upscale",
        phone: "+12345678903",
        location: "Felix+Marina",
        media_type: "slideshow",
      },
      {
        name: "Felix Selimiye",
        description: "Traditional flavors with a modern twist in a historic setting",
        cuisine: "Turkish Fusion",
        hours: "4PM - 12AM",
        atmosphere: "Lively",
        phone: "+12345678904",
        location: "Felix+Selimiye",
        media_type: "slideshow",
      },
    ]

    // Insert and return rows so we can attach media.
    const { data: insertedRestaurants, error: restaurantError } = await supabase
      .from("restaurants")
      .insert(restaurants)
      .select()

    if (restaurantError) {
      // PostgREST returns JSON normally; if a non-JSON error came back earlier, catch-all below will inform.
      return { success: false, message: `Insert restaurants failed: ${restaurantError.message}` }
    }
    if (!insertedRestaurants || insertedRestaurants.length === 0) {
      return { success: false, message: "Insert restaurants returned no rows." }
    }

    // Support numeric or string PKs depending on schema.
    const mediaEntries: Array<{ restaurant_id: number | string; media_url: string; media_order: number }> = []
    for (const r of insertedRestaurants as any[]) {
      if (r.name === "Felix Beach") {
        mediaEntries.push(
          { restaurant_id: r.id, media_url: "/assets/beach1.jpeg", media_order: 0 },
          { restaurant_id: r.id, media_url: "/assets/beach2.jpeg", media_order: 1 },
        )
      } else if (r.name === "Felix Garden") {
        mediaEntries.push({ restaurant_id: r.id, media_url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/garden-oRA3ycYMsw6eyb1694bRzBCKGHaF6Y.mp4", media_order: 0 })
      } else if (r.name === "Felix Marina") {
        mediaEntries.push(
          { restaurant_id: r.id, media_url: "/assets/marina1.jpeg", media_order: 0 },
          { restaurant_id: r.id, media_url: "/assets/marina2.jpeg", media_order: 1 },
        )
      } else if (r.name === "Felix Selimiye") {
        mediaEntries.push(
          { restaurant_id: r.id, media_url: "/assets/selimiye1.jpeg", media_order: 0 },
          { restaurant_id: r.id, media_url: "/assets/selimiye2.jpeg", media_order: 1 },
          { restaurant_id: r.id, media_url: "/assets/selimiye3.jpeg", media_order: 2 },
        )
      }
    }

    if (mediaEntries.length > 0) {
      const { error: mediaError } = await supabase.from("restaurant_media").insert(mediaEntries)
      if (mediaError) {
        return { success: false, message: `Insert media failed: ${mediaError.message}` }
      }
    }

    const notificationSettings = (insertedRestaurants as any[]).map((r) => ({
      restaurant_id: r.id as number | string,
      email_notifications: true,
      sms_notifications: false,
      notification_emails: ["admin@felixrestaurants.com"],
    }))

    const { error: notificationError } = await supabase
      .from("notification_settings")
      .insert(notificationSettings)

    if (notificationError) {
      return { success: false, message: `Insert notification settings failed: ${notificationError.message}` }
    }

    return { success: true, message: "Database seeded successfully." }
  } catch (err: any) {
    const msg = err?.message || String(err)
    if (msg.includes("Unexpected token") || msg.toLowerCase().includes("invalid")) {
      return {
        success: false,
        message:
          "Supabase request failed to parse (likely wrong URL or key). Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set and belong to the same project.",
      }
    }
    return { success: false, message: `Seeding failed: ${msg}` }
  }
}
