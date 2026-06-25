export function formatCustomerReservationTime(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return time

  const hour = Number(match[1])
  if (!Number.isFinite(hour) || hour >= 12) return time

  return `${match[1].padStart(2, "0")}:${match[2]} am`
}

export function formatCustomerReservationAreaLabel(
  areaName: string | null | undefined,
  restaurantName: string | null | undefined,
  fallbackLabel = "Restaurant",
  language: string | null | undefined = "en"
) {
  const label = areaName?.trim() || fallbackLabel
  const isFelixBeach = restaurantName?.trim().toLowerCase() === "felix beach"
  const isTurkish = language?.toLowerCase().startsWith("tr")

  if (isFelixBeach && (label.toLowerCase() === "beach area" || label.toLowerCase() === "beach")) {
    return isTurkish ? "Plaj" : "Beach"
  }

  if (["main hall", "restaurant", "ana salon", "restoran"].includes(label.toLowerCase())) {
    return isTurkish ? "Restoran" : "Restaurant"
  }

  return label
}
