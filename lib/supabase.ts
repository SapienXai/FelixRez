import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

/**
 * Strict Service Role client: requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Use this for privileged operations like seeding.
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) {
    throw new Error("SUPABASE_URL is not set on the server.")
  }
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("SUPABASE_URL must start with https://")
  }
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for seeding.")
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "felix-reservation/seed" } },
  })
}

/**
 * General server-side client (reads/mutations) with safe defaults.
 * Prefer service role for mutations that bypass RLS.
 */
export function createServerClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) throw new Error("Supabase URL is not configured (SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL).")
  if (!key) throw new Error("Supabase anon key is not configured.")
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "felix-reservation/server" } },
  })
}

/**
 * Browser client for Client Components. Requires NEXT_PUBLIC_* envs.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for browser client.")
  }
  // Singleton in browser to avoid multiple GoTrue instances and storage races
  if (typeof window !== "undefined") {
    if (!(window as any).___supabaseBrowserClient) {
      const projectRef = (() => {
        try {
          const host = new URL(url).host // e.g. rhfsjgaxbhqmiecwtvgu.supabase.co
          return host.split(".")[0]
        } catch {
          return "supabase"
        }
      })()
      ;(window as any).___supabaseBrowserClient = createSupabaseClient<Database>(url, anon, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: `sb-${projectRef}-auth-token`,
        },
        global: { headers: { "X-Client-Info": "felix-reservation/browser" } },
      }) as SupabaseClient<Database>
    }
    return (window as any).___supabaseBrowserClient as SupabaseClient<Database>
  }
  // Fallback for non-browser contexts (shouldn't be called from server components)
  return createSupabaseClient<Database>(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true },
    global: { headers: { "X-Client-Info": "felix-reservation/browser" } },
  })
}

// Backward-compat alias if any code imports { createClient } from "@/lib/supabase".
export const createClient = createServerClient
