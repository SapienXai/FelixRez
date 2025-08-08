"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Database, RefreshCw } from 'lucide-react'
import { seedDatabase } from "@/app/actions/seed-database"
import { useRouter } from "next/navigation"

type Props = { supabaseOk: boolean }
type SeedState = { success: boolean; message: string }

export default function SeedControls({ supabaseOk }: Props) {
  const router = useRouter()
  const [state, action, pending] = useActionState<SeedState, FormData>(
    async (_prev, _form) => {
      const res = await seedDatabase()
      return { success: !!res?.success, message: res?.message ?? "Done" }
    },
    { success: false, message: "" }
  )

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={!supabaseOk || pending} className="gap-2">
        <Database className="h-4 w-4" />
        {pending ? "Seeding..." : "Seed demo data"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => router.refresh()}
        disabled={pending}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh status
      </Button>
      {state.message ? (
        <span className={`text-sm ${state.success ? "text-green-600" : "text-red-600"}`}>{state.message}</span>
      ) : null}
    </form>
  )
}
