import { NextResponse } from "next/server"

type AuthEvent = "SIGNED_IN" | "TOKEN_REFRESHED" | "SIGNED_OUT" | string

export async function POST(request: Request) {
  try {
    const { event, session }: { event: AuthEvent; session: any } = await request.json()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    if (!supabaseUrl) {
      return NextResponse.json({ ok: false, error: "Missing SUPABASE_URL" }, { status: 500 })
    }
    let projectRef = "supabase"
    try {
      projectRef = new URL(supabaseUrl).host.split(".")[0]
    } catch {}
    const cookieName = `sb-${projectRef}-auth-token`

    const res = NextResponse.json({ ok: true })

    if (event === "SIGNED_OUT") {
      // Clear cookie on sign out
      res.cookies.set(cookieName, "", { path: "/", maxAge: 0 })
      return res
    }

    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      if (!session || !session.access_token) {
        return NextResponse.json({ ok: false, error: "Missing session" }, { status: 400 })
      }
      const now = Math.floor(Date.now() / 1000)
      const exp = Number(session.expires_at || now + 60 * 60)
      const maxAge = Math.max(0, exp - now)
      const value = JSON.stringify({ currentSession: session, currentToken: session.access_token })
      res.cookies.set(cookieName, value, {
        path: "/",
        maxAge,
        sameSite: "lax",
      })
      return res
    }

    return res
  } catch (e) {
    console.error("/auth/callback error:", e)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
