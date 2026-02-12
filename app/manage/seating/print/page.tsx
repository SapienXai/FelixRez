"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getSeatingReservations } from "@/app/manage/seating-actions"
import { useLanguage } from "@/context/language-context"

type PrintReservation = {
  id: string
  customer_name: string
  customer_phone: string
  party_size: number
  table_number: string | null
  notes: string | null
  booked_by_name?: string
  reservation_time: string
}

function formatDateLabel(date: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("tr-TR", { year: "numeric", month: "2-digit", day: "2-digit" })
}

function SeatingPrintPageInner() {
  const params = useSearchParams()
  const { getTranslation } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [reservations, setReservations] = useState<PrintReservation[]>([])
  const totalPax = useMemo(
    () => reservations.reduce((sum, reservation) => sum + (reservation.party_size || 0), 0),
    [reservations]
  )

  const filters = useMemo(
    () => ({
      date: params.get("date") || "",
      restaurantId: params.get("restaurantId") || "all",
      status: params.get("status") || "all",
      searchQuery: params.get("searchQuery") || "",
    }),
    [params]
  )

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      const result = await getSeatingReservations(filters)
      if (result.success) {
        setReservations(result.data as PrintReservation[])
      } else {
        setReservations([])
      }
      setLoading(false)
    }
    run()
  }, [filters])

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        window.print()
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [loading])

  return (
    <div className="mx-auto max-w-5xl p-6 print:max-w-none print:p-0">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 16mm;
          }
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-wrap { padding: 4mm 2mm; }
        }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => window.close()}>
          {getTranslation("manage.seating.printClose")}
        </Button>
        <Button onClick={() => window.print()}>{getTranslation("manage.seating.printNow")}</Button>
      </div>

      <div className="print-wrap">
      <div className="mb-4 border-b pb-4">
        <h1 className="text-2xl font-semibold">{getTranslation("manage.seating.printTitle")}</h1>
        <div className="mt-2 text-sm text-muted-foreground">
          <div>
            {getTranslation("manage.seating.date")}: {filters.date ? formatDateLabel(filters.date) : "-"}
          </div>
          <div>
            {getTranslation("manage.seating.status")}: {filters.status}
          </div>
          <div>
            {getTranslation("manage.seating.listCount", { count: String(reservations.length) })}
          </div>
          <div>
            {getTranslation("manage.seating.colPax")} Total: {totalPax}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{getTranslation("manage.seating.loading")}</div>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-2 py-2 text-left">{getTranslation("manage.seating.colName")}</th>
              <th className="px-2 py-2 text-left">{getTranslation("manage.seating.colPhone")}</th>
              <th className="px-2 py-2 text-left">{getTranslation("manage.seating.colPax")}</th>
              <th className="px-2 py-2 text-left">{getTranslation("manage.seating.colTable")}</th>
              <th className="px-2 py-2 text-left">{getTranslation("manage.seating.colNote")}</th>
              <th className="px-2 py-2 text-left">{getTranslation("manage.seating.colBookedBy")}</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation.id} className="border-b align-top">
                <td className="px-2 py-2">
                  <div className="font-medium">{reservation.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{reservation.reservation_time.slice(0, 5)}</div>
                </td>
                <td className="px-2 py-2">{reservation.customer_phone}</td>
                <td className="px-2 py-2">{reservation.party_size}</td>
                <td className="px-2 py-2">{reservation.table_number || "-"}</td>
                <td className="px-2 py-2 whitespace-pre-wrap">{reservation.notes || "-"}</td>
                <td className="px-2 py-2">{reservation.booked_by_name || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </div>
  )
}

export default function SeatingPrintPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl p-6 text-sm text-muted-foreground">Loading...</div>}>
      <SeatingPrintPageInner />
    </Suspense>
  )
}
