import { Suspense } from "react"
import { ReservationApp } from "@/components/reservation-app"

export default async function ReservePage({
  searchParams,
}: {
  searchParams: Promise<{ restaurant?: string; lang?: string }>
}) {
  const params = await searchParams
  const restaurant = params.restaurant || "Felix Garden"
  const lang = params.lang || "en"

  return (
    <Suspense fallback={<div className="p-8">Loading reservation form...</div>}>
      <ReservationApp initialRestaurant={restaurant} initialLang={lang} />
    </Suspense>
  )
}
