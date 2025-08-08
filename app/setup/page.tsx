import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import SeedControls from "@/components/setup/seed-controls"
import { createServerClient } from "@/lib/supabase"

async function getStatus() {
  // Server-side check of env + table status
  try {
    const supabase = createServerClient()
    const { count, error } = await supabase.from("restaurants").select("*", { count: "exact", head: true })
    return {
      supabaseOk: !error,
      errorMessage: error?.message ?? null,
      restaurantCount: typeof count === "number" ? count : 0,
    }
  } catch (e: any) {
    return {
      supabaseOk: false,
      errorMessage: e?.message ?? String(e),
      restaurantCount: 0,
    }
  }
}

export default async function SetupPage() {
  const status = await getStatus()

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <p className="mb-2">
              Use the button below to seed demo restaurants and media. This will create data used by the homepage and reservation flow.
            </p>
            <p className="text-muted-foreground">
              Server Actions are used to run the seed securely with server-only environment variables [docs].
            </p>
          </div>

          {!status.supabaseOk ? (
            <Alert>
              <AlertTitle>Supabase not ready</AlertTitle>
              <AlertDescription>
                {status.errorMessage || "Supabase URL/keys are not configured."}
                {" "}
                Ensure SUPABASE_URL and a server key (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY) are set.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <div>Restaurants in DB: <span className="font-medium">{status.restaurantCount}</span></div>
              {status.errorMessage ? (
                <div className="text-red-600 mt-1">Error: {status.errorMessage}</div>
              ) : null}
            </div>
            <SeedControls supabaseOk={status.supabaseOk} />
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground">
            If you have not created the tables yet, run the SQL in{" "}
            <code>scripts/sql/001_create_tables.sql</code> in the Supabase SQL editor, then click seed.
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
