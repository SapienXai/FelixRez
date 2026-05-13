type ReservationRow = {
  [key: string]: any
}

export type ReservationUpdateChange = {
  field: string
  label: string
  from: string | number | null
  to: string | number | null
}

export type ReservationUpdateSummary = {
  updatedAt: string
  updatedByUserId: string | null
  source: "customer" | "staff"
  changes: ReservationUpdateChange[]
}

const RESERVATION_UPDATE_FIELDS = [
  { field: "restaurant_id", label: "Restaurant" },
  { field: "reservation_area_id", label: "Area" },
  { field: "customer_name", label: "Guest" },
  { field: "customer_email", label: "Email" },
  { field: "customer_phone", label: "Phone" },
  { field: "party_size", label: "Party size" },
  { field: "reservation_date", label: "Date" },
  { field: "reservation_time", label: "Time" },
  { field: "reservation_type", label: "Type" },
  { field: "status", label: "Status" },
  { field: "table_number", label: "Table" },
  { field: "special_requests", label: "Note" },
] as const

const normalizeUpdateValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return null
  }

  return value
}

const displayReservationValue = (reservation: ReservationRow, field: string) => {
  const value = normalizeUpdateValue(reservation[field])

  if (field === "restaurant_id") {
    return reservation.restaurants?.name || value || null
  }

  if (field === "reservation_area_id") {
    return reservation.reservation_areas?.name || (value ? String(value) : "Main Hall")
  }

  if (field === "reservation_time" && typeof value === "string") {
    return value.slice(0, 5)
  }

  if (field === "reservation_type" && typeof value === "string") {
    return value === "drinks" ? "Drinks" : "Dining"
  }

  return typeof value === "number" || typeof value === "string" ? value : null
}

export const buildReservationUpdateSummary = (
  before: ReservationRow,
  after: ReservationRow,
  options: {
    updatedByUserId?: string | null
    source: "customer" | "staff"
  }
): ReservationUpdateSummary | null => {
  const changes = RESERVATION_UPDATE_FIELDS.flatMap(({ field, label }) => {
    const beforeValue = normalizeUpdateValue(before[field])
    const afterValue = normalizeUpdateValue(after[field])

    if (beforeValue === afterValue) {
      return []
    }

    return [{
      field,
      label,
      from: displayReservationValue(before, field),
      to: displayReservationValue(after, field),
    }]
  })

  if (changes.length === 0) {
    return null
  }

  return {
    updatedAt: new Date().toISOString(),
    updatedByUserId: options.updatedByUserId ?? null,
    source: options.source,
    changes,
  }
}
