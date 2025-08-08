import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Derive project ref from SUPABASE_URL to build cookie name
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  let projectRef = "supabase"
  if (supabaseUrl) {
    try {
      projectRef = new URL(supabaseUrl).host.split(".")[0]
    } catch {}
  }
  const cookieName = `sb-${projectRef}-auth-token`
  const cookieVal = request.cookies.get(cookieName)?.value

  let hasSession = false
  if (cookieVal) {
    try {
      const parsed = JSON.parse(cookieVal)
      // Support both our manual shape and auth-helpers shapes
      hasSession = Boolean(
        parsed?.currentToken ||
          parsed?.access_token ||
          parsed?.value?.access_token ||
          parsed?.currentSession?.access_token
      )
    } catch {
      // If cookie can't be parsed, treat as no session
      hasSession = false
    }
  }

  // Protected /manage routes excluding auth pages
  const isManageRoute =
    pathname.startsWith("/manage") &&
    !pathname.startsWith("/manage/login") &&
    !pathname.startsWith("/manage/reset-password") &&
    !pathname.startsWith("/manage/update-password")

  if (isManageRoute && !hasSession) {
    const redirectUrl = new URL("/manage/login", request.url)
    redirectUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is already logged in, keep them out of the login page
  if (pathname === "/manage/login" && hasSession) {
    return NextResponse.redirect(new URL("/manage", request.url))
  }

  return response
}

export const config = {
matcher: ["/manage/:path*"],
}
