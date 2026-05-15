"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getSeatingReservations } from "@/app/manage/seating-actions"
import { useLanguage } from "@/context/language-context"

type PrintReservation = {
  id: string
  reservation_date: string
  customer_name: string
  customer_phone: string
  party_size: number
  table_number: string | null
  reservation_type: string | null
  notes: string | null
  booked_by_name?: string
  reservation_time: string
  restaurants?: {
    id: string
    name: string
  } | null
}

function formatDateLabel(date: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("tr-TR", { year: "numeric", month: "2-digit", day: "2-digit" })
}

function formatTitleDate(date: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })
}

function formatFileDate(date: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    String(parsed.getDate()).padStart(2, "0"),
  ].join("-")
}

function formatTime(time: string) {
  return time?.slice(0, 5) || "-"
}

function getReservationTypeLabel(type: string | null | undefined, getTranslation: (key: string) => string) {
  return type === "drinks"
    ? getTranslation("manage.seating.typeDrinks")
    : getTranslation("manage.seating.typeMeal")
}

function getReservationTypeBadgeClassName(type: string | null | undefined) {
  return type === "drinks"
    ? "bg-slate-900 text-white"
    : "bg-rose-900 text-white"
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
  const totalDiningPax = useMemo(
    () => reservations.reduce((sum, reservation) => (
      reservation.reservation_type === "drinks" ? sum : sum + (reservation.party_size || 0)
    ), 0),
    [reservations]
  )
  const generatedAt = useMemo(
    () => new Date().toLocaleString(getTranslation("common.locale") || "tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    }),
    [getTranslation]
  )
  const restaurantNames = useMemo(() => {
    const names = new Set<string>()
    reservations.forEach((reservation) => {
      const restaurant = reservation.restaurants as PrintReservation["restaurants"] | PrintReservation["restaurants"][]
      const name = Array.isArray(restaurant) ? restaurant[0]?.name : restaurant?.name
      if (name) {
        names.add(name)
      }
    })

    return Array.from(names)
  }, [reservations])

  const filters = useMemo(
    () => ({
      date: params.get("date") || "",
      restaurantId: params.get("restaurantId") || "all",
      status: params.get("status") || "confirmed",
      searchQuery: params.get("searchQuery") || "",
    }),
    [params]
  )
  const serviceListTitle = useMemo(() => {
    if (!filters.date) {
      return getTranslation("manage.seating.printTitle")
    }

    return getTranslation("manage.seating.printTitleWithDate", {
      date: formatTitleDate(filters.date),
    })
  }, [filters.date, getTranslation])
  const pdfFileTitle = useMemo(() => {
    if (!filters.date) {
      return "Felix Service List"
    }

    return `Felix Service List - ${formatFileDate(filters.date)}`
  }, [filters.date])

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
    const previousTitle = document.title
    document.title = pdfFileTitle

    return () => {
      document.title = previousTitle
    }
  }, [pdfFileTitle])

  const printServiceList = () => {
    document.title = pdfFileTitle
    window.print()
  }

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        document.title = pdfFileTitle
        requestAnimationFrame(() => {
          document.title = pdfFileTitle
          window.print()
        })
      }, 650)
      return () => clearTimeout(timer)
    }
  }, [loading, pdfFileTitle])

  return (
    <div className="min-h-screen bg-stone-100 p-4 text-stone-950 print:bg-white print:p-0">
      <style>{`
        .a4-sheet {
          box-sizing: border-box;
        }
        .service-table {
          table-layout: fixed;
        }
        .service-table th,
        .service-table td {
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 8px;
          }
          .no-print { display: none !important; }
          html, body {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .a4-sheet {
            width: 100% !important;
            max-width: none !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: 0 !important;
            --tw-ring-shadow: 0 0 #0000 !important;
          }
          .print-summary-card { padding: 3mm !important; border-radius: 4mm !important; }
          .service-table tr { break-inside: avoid; page-break-inside: avoid; }
          .service-table th,
          .service-table td { padding: 1.4mm 1mm !important; }
        }
      `}</style>

      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-end gap-2">
        <Button variant="outline" onClick={() => window.close()}>
          {getTranslation("manage.seating.printClose")}
        </Button>
        <Button onClick={printServiceList}>{getTranslation("manage.seating.printNow")}</Button>
      </div>

      <div className="a4-sheet mx-auto flex min-h-[297mm] w-[210mm] max-w-[calc(100vw-32px)] flex-col bg-white p-[14mm] shadow-2xl ring-1 ring-stone-200">
        <header className="mb-4 border-b border-stone-950 pb-3 print:mb-[4mm] print:pb-[3mm]">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">Felix</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
                {serviceListTitle}
              </h1>
            </div>
            <div className="text-right text-[11px] leading-5 text-stone-600">
              <div>{getTranslation("manage.seating.generatedAt")}</div>
              <div className="font-medium text-stone-950">{generatedAt}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-[11px] print:mt-[3mm] print:gap-[2mm]">
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 print:rounded-[3mm] print:px-[2mm] print:py-[1.5mm]">
              <p className="text-stone-500">{getTranslation("manage.seating.date")}</p>
              <p className="mt-1 font-semibold text-stone-950">{filters.date ? formatDateLabel(filters.date) : "-"}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 print:rounded-[3mm] print:px-[2mm] print:py-[1.5mm]">
              <p className="text-stone-500">{getTranslation("manage.seating.restaurant")}</p>
              <p className="mt-1 truncate font-semibold text-stone-950">
                {restaurantNames.length > 0 ? restaurantNames.join(", ") : getTranslation("manage.seating.allRestaurants")}
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 print:rounded-[3mm] print:px-[2mm] print:py-[1.5mm]">
              <p className="text-stone-500">{getTranslation("manage.seating.status")}</p>
              <p className="mt-1 font-semibold capitalize text-stone-950">{filters.status}</p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          {loading ? (
            <div className="py-10 text-center text-sm text-stone-500">{getTranslation("manage.seating.loading")}</div>
          ) : reservations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 py-12 text-center text-sm text-stone-500">
              {getTranslation("manage.seating.empty")}
            </div>
          ) : (
            <>
            <table className="service-table w-full border-collapse text-[10.5px] leading-tight print:text-[9.5px]">
              <colgroup>
                <col className="w-[6mm]" />
                <col className="w-[12mm]" />
                <col className="w-[34mm]" />
                <col className="w-[24mm]" />
                <col className="w-[9mm]" />
                <col className="w-[14mm]" />
                <col className="w-[16mm]" />
                <col className="w-[16mm]" />
                <col />
              </colgroup>
              <thead>
                <tr className="border-y border-stone-950 bg-stone-100 text-[10px] uppercase tracking-[0.08em] text-stone-700">
                  <th className="px-1 py-1.5 text-left">{getTranslation("manage.seating.colNo")}</th>
                  <th className="px-1 py-1.5 text-left">{getTranslation("manage.seating.colTime")}</th>
                  <th className="px-1.5 py-2 text-left">{getTranslation("manage.seating.colName")}</th>
                  <th className="px-1 py-1.5 text-left">{getTranslation("manage.seating.colPhone")}</th>
                  <th className="px-1 py-1.5 text-center">{getTranslation("manage.seating.colPax")}</th>
                  <th className="px-1 py-1.5 text-left">{getTranslation("manage.seating.colTable")}</th>
                  <th className="px-1 py-1.5 text-left">{getTranslation("manage.seating.colType")}</th>
                  <th className="px-1 py-1.5 text-left">{getTranslation("manage.seating.colBookedBy")}</th>
                  <th className="px-1 py-1.5 text-left">{getTranslation("manage.seating.colNote")}</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation, index) => (
                  <tr key={reservation.id} className="border-b border-stone-200 align-top">
                    <td className="px-1 py-1.5 font-medium text-stone-500">{index + 1}</td>
                    <td className="px-1 py-1.5 font-semibold text-stone-950">{formatTime(reservation.reservation_time)}</td>
                    <td className="px-1.5 py-1.5 font-semibold text-stone-950">{reservation.customer_name}</td>
                    <td className="px-1 py-1.5 text-stone-700">{reservation.customer_phone || "-"}</td>
                    <td className="px-1 py-1.5 text-center font-semibold text-stone-950">{reservation.party_size}</td>
                    <td className="px-1 py-1.5 font-semibold text-stone-950">{reservation.table_number || "-"}</td>
                    <td className="px-1 py-1.5 text-stone-700">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[8.5px] font-semibold ${getReservationTypeBadgeClassName(reservation.reservation_type)}`}>
                        {getReservationTypeLabel(reservation.reservation_type, getTranslation)}
                      </span>
                    </td>
                    <td className="px-1 py-1.5 text-stone-700">{reservation.booked_by_name || "-"}</td>
                    <td className="whitespace-pre-wrap px-1 py-1.5 leading-tight text-stone-700">{reservation.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <footer className="mt-auto border-t-2 border-stone-950 bg-white pt-4">
              <div className="grid grid-cols-3 gap-3 bg-white">
                <div className="print-summary-card rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    {getTranslation("manage.seating.totalReservations")}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">{reservations.length}</p>
                </div>
                <div className="print-summary-card rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    {getTranslation("manage.seating.totalKuver")}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">{totalPax}</p>
                </div>
                <div className="print-summary-card rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    {getTranslation("manage.seating.totalDiningPax")}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">{totalDiningPax}</p>
                </div>
              </div>
            </footer>
            </>
          )}
        </div>
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
