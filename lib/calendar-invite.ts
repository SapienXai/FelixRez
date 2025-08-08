export function generateICSFile({
  summary,
  description,
  location,
  startDate,
  endDate,
  organizerName,
  organizerEmail,
}: {
  summary: string
  description: string
  location: string
  startDate: Date
  endDate: Date
  organizerName: string
  organizerEmail: string
}) {
  // Format dates according to iCalendar spec
  const formatDate = (date: Date) => {
    return date
      .toISOString()
      .replace(/-/g, "")
      .replace(/:/g, "")
      .replace(/\.\d{3}/g, "")
  }

  const now = new Date()
  const uid = `${now.getTime()}-${Math.random().toString(36).substring(2, 11)}@felixsmile.com`

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Felix Restaurants//Reservation System//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDate(now)}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    `LOCATION:${location}`,
    `ORGANIZER;CN=${organizerName}:mailto:${organizerEmail}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "TRIGGER:-PT1H", // 1 hour before
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")

  return icsContent
}
