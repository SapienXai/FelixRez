import { NextResponse } from "next/server"
import { getCurrentUserAccess } from "@/lib/auth-utils"

export async function GET() {
  try {
    const access = await getCurrentUserAccess()
    if (!access) return NextResponse.json({ ok: true, role: null })
    return NextResponse.json({ ok: true, role: access.role, isSuperAdmin: access.isSuperAdmin })
  } catch (e) {
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 })
  }
}

