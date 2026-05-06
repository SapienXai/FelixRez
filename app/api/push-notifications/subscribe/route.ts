import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUserAccess } from "@/lib/auth-utils"
import { createServiceRoleClient } from "@/lib/supabase"

type PushSubscriptionBody = {
  endpoint?: string
  keys?: {
    p256dh?: string
    auth?: string
  }
}

function isValidSubscription(value: unknown): value is PushSubscriptionBody {
  if (!value || typeof value !== "object") return false
  const subscription = value as PushSubscriptionBody
  return Boolean(
    subscription.endpoint &&
      subscription.keys?.p256dh &&
      subscription.keys?.auth
  )
}

export async function POST(request: NextRequest) {
  const access = await getCurrentUserAccess()
  if (!access) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!isValidSubscription(body)) {
    return NextResponse.json({ ok: false, error: "Invalid subscription" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from("admin_push_subscriptions")
    .upsert(
      {
        user_id: access.userId,
        restaurant_id: access.restaurantId,
        endpoint: body.endpoint,
        p256dh: body.keys!.p256dh,
        auth: body.keys!.auth,
        user_agent: request.headers.get("user-agent"),
        enabled: true,
      },
      { onConflict: "endpoint" }
    )

  if (error) {
    console.error("Failed to save push subscription:", error)
    return NextResponse.json({ ok: false, error: "Failed to save subscription" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const access = await getCurrentUserAccess()
  if (!access) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null
  if (!endpoint) {
    return NextResponse.json({ ok: false, error: "Missing endpoint" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from("admin_push_subscriptions")
    .update({ enabled: false })
    .eq("user_id", access.userId)
    .eq("endpoint", endpoint)

  if (error) {
    console.error("Failed to disable push subscription:", error)
    return NextResponse.json({ ok: false, error: "Failed to disable subscription" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
