import { Suspense } from "react"
import { ReservationApp } from "@/components/reservation-app"
import { TriangleLoader } from "@/components/ui/triangle-loader"

export default async function ReservePage({
  searchParams,
}: {
  searchParams: Promise<{ restaurant?: string; lang?: string }>
}) {
  const params = await searchParams
  const restaurant = params.restaurant || "Felix Garden"
  const lang = params.lang || "en"

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8" style={{ minHeight: '40vh' }}>
          <TriangleLoader label="Loading reservation form..." />
        </div>
      }
    >
      <ReservationApp initialRestaurant={restaurant} initialLang={lang} />
    </Suspense>
  )
}
