import { NextRequest } from "next/server"
import { getSeatingReservations } from "@/app/manage/seating-actions"

type PdfReservation = {
  id: string
  reservation_time: string
  customer_name: string
  customer_phone: string | null
  party_size: number | null
  table_number: string | null
  reservation_type: string | null
  booked_by_name?: string | null
  notes: string | null
  restaurants?: { name?: string | null } | { name?: string | null }[] | null
}

type TextOptions = {
  size?: number
  font?: "F1" | "F2"
  color?: [number, number, number]
}

export const dynamic = "force-dynamic"

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 8
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2)
const TABLE_COLUMNS = [
  { key: "no", labelEn: "No", labelTr: "No", width: 18 },
  { key: "time", labelEn: "Time", labelTr: "Saat", width: 34 },
  { key: "name", labelEn: "Name", labelTr: "Isim", width: 88 },
  { key: "phone", labelEn: "Phone", labelTr: "Tel", width: 68 },
  { key: "pax", labelEn: "Pax", labelTr: "Pax", width: 24 },
  { key: "table", labelEn: "Table", labelTr: "Masa", width: 38 },
  { key: "type", labelEn: "Type", labelTr: "Tur", width: 42 },
  { key: "bookedBy", labelEn: "Booked By", labelTr: "Rez. Yapan", width: 48 },
  { key: "note", labelEn: "Note", labelTr: "Not", width: CONTENT_WIDTH - 360 },
] as const

function ascii(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
}

function pdfText(value: unknown) {
  return ascii(String(value ?? "-"))
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
}

function formatDateKey(date: string) {
  if (!date) return "-"
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return [
    String(parsed.getDate()).padStart(2, "0"),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    parsed.getFullYear(),
  ].join(".")
}

function formatFileDate(date: string) {
  if (!date) return "all"
  return date.replace(/[^0-9-]/g, "")
}

function formatTime(time: string) {
  return time?.slice(0, 5) || "-"
}

function getRestaurantName(reservation: PdfReservation) {
  const restaurant = reservation.restaurants
  if (Array.isArray(restaurant)) return restaurant[0]?.name || ""
  return restaurant?.name || ""
}

function getTypeLabel(type: string | null | undefined, lang: string) {
  if (type === "drinks") return lang === "tr" ? "Icecek" : "Drinks"
  return lang === "tr" ? "Yemek" : "Dining"
}

function wrapText(value: unknown, width: number, size: number) {
  const text = ascii(String(value ?? "-")).trim() || "-"
  const maxChars = Math.max(3, Math.floor(width / (size * 0.48)))
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current)
        current = ""
      }
      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars))
      }
      continue
    }

    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) lines.push(current)
  return lines.length > 0 ? lines : ["-"]
}

function colorCommand(color: [number, number, number]) {
  return `${color.map((part) => (part / 255).toFixed(3)).join(" ")} rg`
}

function drawText(x: number, y: number, text: unknown, options: TextOptions = {}) {
  const size = options.size ?? 8
  const font = options.font ?? "F1"
  const color = options.color ?? [28, 25, 23]
  return [
    "BT",
    `/${font} ${size} Tf`,
    colorCommand(color),
    `${x.toFixed(2)} ${y.toFixed(2)} Td`,
    `(${pdfText(text)}) Tj`,
    "ET",
  ].join("\n")
}

function rect(x: number, y: number, width: number, height: number, color: [number, number, number], stroke = false) {
  return [
    colorCommand(color),
    `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re ${stroke ? "B" : "f"}`,
  ].join("\n")
}

function line(x1: number, y1: number, x2: number, y2: number, color: [number, number, number] = [28, 25, 23]) {
  return [
    `${color.map((part) => (part / 255).toFixed(3)).join(" ")} RG`,
    "0.7 w",
    `${x1.toFixed(2)} ${y1.toFixed(2)} m`,
    `${x2.toFixed(2)} ${y2.toFixed(2)} l`,
    "S",
  ].join("\n")
}

function drawHeader(date: string, status: string, lang: string, generatedAt: string) {
  const title = lang === "tr" ? "Servis Listesi" : "Service List"
  return [
    drawText(MARGIN, 812, "Felix", { size: 8, font: "F2", color: [120, 113, 108] }),
    drawText(MARGIN, 792, `${formatDateKey(date)} ${title}`, { size: 17, font: "F2" }),
    drawText(420, 805, lang === "tr" ? "Olusturulma" : "Generated", { size: 7, color: [120, 113, 108] }),
    drawText(420, 792, generatedAt, { size: 8, font: "F2" }),
    rect(MARGIN, 754, CONTENT_WIDTH, 26, [245, 245, 244]),
    drawText(MARGIN + 8, 764, `${lang === "tr" ? "Tarih" : "Date"}: ${formatDateKey(date)}`, { size: 8, font: "F2" }),
    drawText(190, 764, `${lang === "tr" ? "Durum" : "Status"}: ${status || "confirmed"}`, { size: 8, font: "F2" }),
    line(MARGIN, 742, PAGE_WIDTH - MARGIN, 742),
  ].join("\n")
}

function drawTableHeader(y: number, lang: string) {
  let x = MARGIN
  const parts = [
    rect(MARGIN, y - 4, CONTENT_WIDTH, 18, [231, 229, 228]),
    line(MARGIN, y + 14, PAGE_WIDTH - MARGIN, y + 14),
    line(MARGIN, y - 4, PAGE_WIDTH - MARGIN, y - 4),
  ]

  for (const column of TABLE_COLUMNS) {
    parts.push(drawText(x + 2, y + 2, lang === "tr" ? column.labelTr : column.labelEn, {
      size: 6.5,
      font: "F2",
      color: [68, 64, 60],
    }))
    x += column.width
  }

  return parts.join("\n")
}

function buildRow(reservation: PdfReservation, index: number, lang: string) {
  const restaurantName = getRestaurantName(reservation)
  const name = restaurantName ? `${reservation.customer_name} / ${restaurantName}` : reservation.customer_name
  return [
    String(index + 1),
    formatTime(reservation.reservation_time),
    name || "-",
    reservation.customer_phone || "-",
    String(reservation.party_size || 0),
    reservation.table_number || "-",
    getTypeLabel(reservation.reservation_type, lang),
    reservation.booked_by_name || "-",
    reservation.notes || "-",
  ]
}

function drawRow(y: number, row: string[], type: string | null | undefined) {
  const fontSize = 7
  const lineHeight = 8.2
  const wrapped = row.map((cell, index) => wrapText(cell, TABLE_COLUMNS[index].width - 4, fontSize))
  const rowHeight = Math.max(17, Math.max(...wrapped.map((lines) => lines.length)) * lineHeight + 7)
  const parts = [line(MARGIN, y - rowHeight + 2, PAGE_WIDTH - MARGIN, y - rowHeight + 2, [231, 229, 228])]
  let x = MARGIN

  wrapped.forEach((lines, cellIndex) => {
    const column = TABLE_COLUMNS[cellIndex]
    if (column.key === "type") {
      const isDrinks = type === "drinks"
      const badgeColor: [number, number, number] = isDrinks ? [15, 23, 42] : [136, 19, 55]
      const badgeWidth = Math.min(column.width - 4, isDrinks ? 28 : 30)
      parts.push(rect(x + 2, y - 9, badgeWidth, 10, badgeColor))
      parts.push(drawText(x + 5, y - 6.8, lines[0], { size: 5.8, font: "F2", color: [255, 255, 255] }))
    } else {
      lines.slice(0, 4).forEach((text, lineIndex) => {
        parts.push(drawText(x + 2, y - 6 - (lineIndex * lineHeight), text, {
          size: fontSize,
          font: cellIndex === 0 || cellIndex === 1 || cellIndex === 4 || cellIndex === 5 ? "F2" : "F1",
          color: cellIndex === 0 ? [120, 113, 108] : [28, 25, 23],
        }))
      })
    }
    x += column.width
  })

  return { content: parts.join("\n"), height: rowHeight }
}

function drawSummary(y: number, reservations: PdfReservation[], lang: string) {
  const totalPax = reservations.reduce((sum, reservation) => sum + (reservation.party_size || 0), 0)
  const diningPax = reservations.reduce((sum, reservation) => (
    reservation.reservation_type === "drinks" ? sum : sum + (reservation.party_size || 0)
  ), 0)
  const labels = lang === "tr"
    ? ["Toplam Rezervasyon", "Toplam Pax", "Yemekli Pax"]
    : ["Total Reservations", "Total Pax", "Dining Pax"]
  const values = [reservations.length, totalPax, diningPax]
  const width = (CONTENT_WIDTH - 16) / 3
  const parts: string[] = []

  labels.forEach((label, index) => {
    const x = MARGIN + (index * (width + 8))
    parts.push(rect(x, y - 50, width, 48, [245, 245, 244]))
    parts.push(drawText(x + 8, y - 18, label, { size: 7, font: "F2", color: [120, 113, 108] }))
    parts.push(drawText(x + 8, y - 40, String(values[index]), { size: 18, font: "F2" }))
  })

  return parts.join("\n")
}

function buildPdf(reservations: PdfReservation[], options: { date: string; status: string; lang: string }) {
  const generatedAt = new Date().toLocaleString(options.lang === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  })
  const pages: string[] = []
  let current = [drawHeader(options.date, options.status, options.lang, generatedAt), drawTableHeader(720, options.lang)]
  let y = 696

  reservations.forEach((reservation, index) => {
    const row = buildRow(reservation, index, options.lang)
    const drawn = drawRow(y, row, reservation.reservation_type)

    if (y - drawn.height < 82) {
      pages.push(current.join("\n"))
      current = [drawHeader(options.date, options.status, options.lang, generatedAt), drawTableHeader(720, options.lang)]
      y = 696
    }

    const nextDrawn = drawRow(y, row, reservation.reservation_type)
    current.push(nextDrawn.content)
    y -= nextDrawn.height
  })

  if (y < 132) {
    pages.push(current.join("\n"))
    current = [drawHeader(options.date, options.status, options.lang, generatedAt), drawTableHeader(720, options.lang)]
    y = 696
  }

  current.push(line(MARGIN, y - 2, PAGE_WIDTH - MARGIN, y - 2))
  current.push(drawSummary(y - 14, reservations, options.lang))
  pages.push(current.join("\n"))

  return writePdf(pages)
}

function writePdf(pages: string[]) {
  const objects: string[] = []
  objects.push("<< /Type /Catalog /Pages 2 0 R >>")
  const pageObjectIds = pages.map((_, index) => 5 + (index * 2))
  objects.push(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`)
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

  pages.forEach((content, index) => {
    const pageId = 5 + (index * 2)
    const contentId = pageId + 1
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`)
    objects.push(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`)
  })

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(pdf, "latin1")
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += "0000000000 65535 f \n"
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return Buffer.from(pdf, "latin1")
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get("date") || ""
  const status = searchParams.get("status") || "confirmed"
  const lang = searchParams.get("lang") === "tr" ? "tr" : "en"
  const result = await getSeatingReservations({
    date,
    restaurantId: searchParams.get("restaurantId") || "all",
    status,
    searchQuery: searchParams.get("searchQuery") || "",
  })
  const reservations = (result.success ? result.data : []) as PdfReservation[]
  const pdf = buildPdf(reservations, { date, status, lang })
  const filename = `felix-service-list-${formatFileDate(date)}.pdf`

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
