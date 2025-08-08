import { NextResponse } from "next/server"

type EnvInfo = {
  key: string
  present: boolean
  length: number
  hint?: string | null
}

function info(key: string, hint?: string): EnvInfo {
  const val = process.env[key]
  return {
    key,
    present: Boolean(val && val.length > 0),
    length: val ? val.length : 0,
    hint: hint ?? null,
  }
}

export async function GET() {
  const serverUrl = process.env.SUPABASE_URL
  const clientUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  const payload = {
    timestamp: new Date().toISOString(),
    supabase: {
      url: {
        server: info("SUPABASE_URL", "Server-only"),
        client: info("NEXT_PUBLIC_SUPABASE_URL", "Client-safe"),
        matches:
          serverUrl && clientUrl ? serverUrl === clientUrl : null,
      },
      keys: {
        serviceRole: info("SUPABASE_SERVICE_ROLE_KEY", "Server-only"),
        serverAnon: info("SUPABASE_ANON_KEY", "Server-only"),
        clientAnon: info("NEXT_PUBLIC_SUPABASE_ANON_KEY", "Client-safe"),
      },
    },
    notes: [
      "Values are not returned for security. Presence and string length are shown.",
      "URL mismatch can break Supabase calls if clients point to different projects.",
      "Only NEXT_PUBLIC_* variables are available in the browser.",
    ],
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
