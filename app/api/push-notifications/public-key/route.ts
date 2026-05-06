import { NextResponse } from "next/server"
import { getWebPushPublicKey } from "@/lib/push-service"

export async function GET() {
  const publicKey = getWebPushPublicKey()

  if (!publicKey) {
    return NextResponse.json({ ok: false, error: "Web Push is not configured" }, { status: 503 })
  }

  return NextResponse.json({ ok: true, publicKey })
}
