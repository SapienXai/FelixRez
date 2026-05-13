"use client"

import { useEffect, useState } from "react"

import { useLanguage } from "@/context/language-context"

type Step1Picker = "party" | "date" | "time" | "area" | null

interface ReservationBlockedInterval {
  date: string
  start_time: string
  end_time: string
  message?: string
}

interface Restaurant {
  id: string
  name: string
  reservation_enabled: boolean | null
  allowed_days_of_week: number[] | null
  opening_time: string | null
  closing_time: string | null
  time_slot_duration: number | null
  advance_booking_days: number | null
  min_advance_hours: number | null
  max_party_size: number | null
  min_party_size: number | null
  reservation_start_date: string | null
  reservation_blocked_intervals: unknown
  blocked_dates: string[] | null
  special_hours: any | null
}

interface ReservationArea {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  is_active: boolean
  display_order: number
  opening_time: string | null
  closing_time: string | null
  time_slot_duration: number | null
  max_party_size: number | null
  min_party_size: number | null
  advance_booking_days: number | null
  min_advance_hours: number | null
  allowed_days_of_week: number[] | null
  blocked_dates: string[] | null
  special_hours: any | null
  max_concurrent_reservations: number | null
  created_at: string
  updated_at: string
}

interface ReservationStep1Props {
  partySize: string
  setPartySize: (size: string) => void
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  selectedTime: string
  setSelectedTime: (time: string) => void
  restaurant: Restaurant | null
  areas: ReservationArea[]
  selectedAreaId: string | null
  setSelectedAreaId: (id: string | null) => void
}

export function ReservationStep1({
  partySize,
  setPartySize,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  restaurant,
  areas,
  selectedAreaId,
  setSelectedAreaId,
}: ReservationStep1Props) {
  const { getTranslation, currentLang } = useLanguage()
  const [activePicker, setActivePicker] = useState<Step1Picker>(null)


  const selectedArea: ReservationArea | undefined = areas?.find(a => a.id === selectedAreaId || "")

  // Helpers to compute effective setting using area override else restaurant fallback
  const eff = {
    opening_time: selectedArea?.opening_time || restaurant?.opening_time || "17:00",
    closing_time: selectedArea?.closing_time || restaurant?.closing_time || "20:45",
    time_slot_duration: selectedArea?.time_slot_duration ?? (restaurant?.time_slot_duration ?? 15),
    advance_booking_days: selectedArea?.advance_booking_days ?? (restaurant?.advance_booking_days ?? 15),
    min_advance_hours: selectedArea?.min_advance_hours ?? (restaurant?.min_advance_hours ?? 0),
    max_party_size: selectedArea?.max_party_size ?? (restaurant?.max_party_size ?? 8),
    min_party_size: selectedArea?.min_party_size ?? (restaurant?.min_party_size ?? 1),
    reservation_start_date: restaurant?.reservation_start_date || null,
    reservation_blocked_intervals: normalizeBlockedIntervals(restaurant?.reservation_blocked_intervals),
    allowed_days_of_week: selectedArea?.allowed_days_of_week || restaurant?.allowed_days_of_week || [1,2,3,4,5,6,7],
    blocked_dates: selectedArea?.blocked_dates || restaurant?.blocked_dates || [],
  }

  // Generate party size options based on effective settings
  const partySizeOptions = () => {
    const options = []
    const minSize = eff.min_party_size
    const maxSize = eff.max_party_size
    
    for (let i = minSize; i <= maxSize; i++) {
      const translationKey = i === 1 ? "reserve.step1.partySizeOptions.one" : "reserve.step1.partySizeOptions.other"
      options.push({
        value: i.toString(),
        label: getTranslation(translationKey, { count: i.toString() }),
      })
    }
    
    // Add "X+" option if max size is reached and we want to show a plus option
    if (maxSize >= 8 && maxSize < 20) {
      options.push({
        value: `${maxSize + 1}`,
        label: getTranslation("reserve.step1.partySizeOptions.other", { count: `${maxSize}+` }),
      })
    }
    
    return options
  }

  // Helper function to check if a date has valid time slots after minimum advance time
  const checkIfDateHasValidTimeSlots = (date: Date, minDateTime: Date) => {
    const openingTime = eff.opening_time
    const closingTime = eff.closing_time
    const slotDuration = eff.time_slot_duration
    
    // Parse opening and closing times
    const [openHour, openMinute] = openingTime.split(':').map(Number)
    const [closeHour, closeMinute] = closingTime.split(':').map(Number)
    
    // Convert to minutes for easier calculation
    const openMinutes = openHour * 60 + openMinute
    const closeMinutes = closeHour * 60 + closeMinute
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let minutes = openMinutes; minutes <= closeMinutes; minutes += slotDuration) {
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60
      
      // Skip if we've exceeded closing time
      if (hour > closeHour || (hour === closeHour && minute > closeMinute)) break
      
      // Create a datetime for this time slot
      const slotDateTime = new Date(date)
      slotDateTime.setHours(hour, minute, 0, 0)
      
      if (date.getTime() === today.getTime() && slotDateTime < minDateTime) {
        continue
      }

      if (!isTimeBlocked(date, timeFromMinutes(minutes))) {
        return true
      }
    }
    
    return false
  }

  // Generate date options based on restaurant settings
  const dateOptions = () => {
    const options = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const reservationStartDate = parseYYYYMMDD(eff.reservation_start_date)
    
    const advanceBookingDays = eff.advance_booking_days
    const minAdvanceHours = eff.min_advance_hours
    const blockedDates = eff.blocked_dates
    // Convert from database format (1=Monday, 7=Sunday) to JavaScript format (0=Sunday, 1=Monday)
    const dbAllowedDays = eff.allowed_days_of_week // Default to all days done in eff
    const allowedDaysOfWeek = dbAllowedDays.map(day => day === 7 ? 0 : day) // Convert Sunday from 7 to 0
    
    // Calculate minimum datetime based on advance hours requirement
    const now = new Date()
    const minDateTime = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000)

    for (let i = 0; i < advanceBookingDays; i++) {
      const dateOption = new Date(today)
      dateOption.setDate(today.getDate() + i)

      if (reservationStartDate && dateOption < reservationStartDate) continue
      
      const hasValidTimeSlots = checkIfDateHasValidTimeSlots(dateOption, minDateTime)
      if (!hasValidTimeSlots) continue
      
      // Skip if day of week is not allowed (0 = Sunday, 1 = Monday, etc.)
      if (!allowedDaysOfWeek.includes(dateOption.getDay())) continue
      
      // Skip if date is in blocked dates
      const dateStr = formatDateToYYYYMMDD(dateOption)
      if (blockedDates.includes(dateStr)) continue

      let displayText
      if (i === 0 && dateOption.getTime() === today.getTime()) {
        displayText = `${getTranslation("reserve.step1.dateToday")} (${getDisplayDate(dateOption, false)})`
      } else if (i === 1 || (i === 0 && dateOption.getTime() === new Date(today.getTime() + 24 * 60 * 60 * 1000).getTime())) {
        displayText = `${getTranslation("reserve.step1.dateTomorrow")} (${getDisplayDate(dateOption, false)})`
      } else {
        displayText = getDisplayDate(dateOption, true)
      }

      options.push({
        value: formatDateToYYYYMMDD(dateOption),
        label: displayText,
        date: dateOption,
      })
    }

    return options
  }

  // Generate time slots based on restaurant settings (single combined list)
  const generateTimeSlots = () => {
    const times: string[] = []

    const openingTime = eff.opening_time
    const closingTime = eff.closing_time
    const slotDuration = eff.time_slot_duration
    const minAdvanceHours = eff.min_advance_hours
    const reservationStartDate = parseYYYYMMDD(eff.reservation_start_date)

    if (reservationStartDate && selectedDate < reservationStartDate) {
      return { times }
    }

    // Parse opening and closing times
    const [openHour, openMinute] = openingTime.split(":").map(Number)
    const [closeHour, closeMinute] = closingTime.split(":").map(Number)

    // Convert to minutes for easier calculation
    const openMinutes = openHour * 60 + openMinute
    const closeMinutes = closeHour * 60 + closeMinute

    // Calculate minimum datetime based on advance hours requirement
    const now = new Date()
    const minDateTime = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000)

    // Generate time slots
    for (let minutes = openMinutes; minutes <= closeMinutes; minutes += slotDuration) {
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60

      // Skip if we've exceeded closing time
      if (hour > closeHour || (hour === closeHour && minute > closeMinute)) break

      // Check if the time slot is after the minimum advance time (applies to all dates)
      const slotDateTime = new Date(selectedDate)
      slotDateTime.setHours(hour, minute, 0, 0)
      if (slotDateTime < minDateTime) continue

      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      if (isTimeBlocked(selectedDate, timeStr)) continue
      times.push(timeStr)
    }

    return { times }
  }

  const getDisplayDate = (dateObj: Date, includeDayName = true) => {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return getTranslation("reserve.messages.invalidDateShort")
    }
    const langCode = currentLang === "tr" ? "tr-TR" : "en-US"
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
    if (includeDayName) {
      options.weekday = "short"
    }
    return dateObj.toLocaleDateString(langCode, options)
  }

  const formatDateToYYYYMMDD = (date: Date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return ""
    }
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const parseYYYYMMDD = (value: string | null | undefined) => {
    if (!value) return null
    const [year, month, day] = value.split("-").map(Number)
    if (!year || !month || !day) return null

    const parsed = new Date(year, month - 1, day)
    parsed.setHours(0, 0, 0, 0)
    return parsed
  }

  function normalizeBlockedIntervals(value: unknown): ReservationBlockedInterval[] {
    if (!Array.isArray(value)) return []

    return value
      .filter((interval): interval is ReservationBlockedInterval => (
        Boolean(interval) &&
        typeof interval === "object" &&
        typeof (interval as ReservationBlockedInterval).date === "string" &&
        typeof (interval as ReservationBlockedInterval).start_time === "string" &&
        typeof (interval as ReservationBlockedInterval).end_time === "string"
      ))
  }

  function parseTimeToMinutes(value: string | null | undefined) {
    if (!value) return null
    const [hour, minute = 0] = value.split(":").map(Number)
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
    if (hour === 24 && minute === 0) return 24 * 60
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
    return hour * 60 + minute
  }

  function timeFromMinutes(minutes: number) {
    const hour = Math.floor(minutes / 60)
    const minute = minutes % 60
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
  }

  function getBlockedIntervalsForDate(date: Date) {
    const dateStr = formatDateToYYYYMMDD(date)
    return eff.reservation_blocked_intervals.filter((interval) => interval.date === dateStr)
  }

  function isTimeBlocked(date: Date, time: string) {
    const slotMinutes = parseTimeToMinutes(time)
    if (slotMinutes === null) return false

    return getBlockedIntervalsForDate(date).some((interval) => {
      const startMinutes = parseTimeToMinutes(interval.start_time)
      const endMinutes = parseTimeToMinutes(interval.end_time)
      if (startMinutes === null || endMinutes === null) return false
      return slotMinutes >= startMinutes && slotMinutes < endMinutes
    })
  }

  function formatBlockedInterval(interval: ReservationBlockedInterval) {
    return `${interval.start_time} - ${interval.end_time}`
  }

  function getBlockedIntervalsMessage(date: Date) {
    const intervals = getBlockedIntervalsForDate(date)
    if (intervals.length === 0) return null

    const customMessages = intervals.map((interval) => interval.message?.trim()).filter(Boolean)
    if (customMessages.length > 0) return customMessages.join(" ")

    const ranges = intervals.map(formatBlockedInterval).join(", ")
    return currentLang === "tr"
      ? `${ranges} saatleri arasında doluyuz.`
      : `We are fully booked between ${ranges}.`
  }

  const handleDateSelect = (value: string) => {
    const dateParts = value.split("-")
    const newDate = new Date(
      Number.parseInt(dateParts[0]),
      Number.parseInt(dateParts[1]) - 1,
      Number.parseInt(dateParts[2]),
    )
    newDate.setHours(0, 0, 0, 0)
    setSelectedDate(newDate)
  }

  const partyOptions = partySizeOptions()
  const availableDates = dateOptions()
  const { times } = generateTimeSlots()
  const blockedIntervalsMessage = getBlockedIntervalsMessage(selectedDate)
  const selectedDateValue = formatDateToYYYYMMDD(selectedDate)
  const selectedPartyLabel = partyOptions.find((option) => option.value === partySize)?.label || partySize
  const selectedDateLabel = availableDates.find((option) => option.value === selectedDateValue)?.label || getDisplayDate(selectedDate, true)
  const selectedAreaLabel = areas?.find((area) => area.id === selectedAreaId)?.name || getTranslation("reserve.step1.anyArea") || "Any area"
  const areaOptions = [
    { value: "", label: getTranslation("reserve.step1.anyArea") || "Any area" },
    ...(areas || []).map((area) => ({ value: area.id, label: area.name })),
  ]

  const closePicker = () => setActivePicker(null)

  const renderPickerSheet = () => {
    if (!activePicker) return null

    const pickerTitle = activePicker === "party"
      ? getTranslation("reserve.step1.partyLabel")
      : activePicker === "date"
        ? getTranslation("reserve.step1.dateLabel")
        : activePicker === "time"
          ? getTranslation("reserve.step1.timeLabel")
          : getTranslation("reserve.step1.areaLabel") || "Area"

    const options = activePicker === "party"
      ? partyOptions.map((option) => ({
          value: option.value,
          label: option.label,
          selected: option.value === partySize,
          onSelect: () => setPartySize(option.value),
        }))
      : activePicker === "date"
        ? availableDates.map((option) => ({
            value: option.value,
            label: option.label,
            selected: option.value === selectedDateValue,
            onSelect: () => handleDateSelect(option.value),
          }))
        : activePicker === "time"
          ? times.map((time) => ({
              value: time,
              label: time,
              selected: time === selectedTime,
              onSelect: () => setSelectedTime(time),
            }))
          : areaOptions.map((option) => ({
              value: option.value,
              label: option.label,
              selected: option.value === (selectedAreaId || ""),
              onSelect: () => setSelectedAreaId(option.value || null),
            }))

    return (
      <div className="reservation-picker-overlay" role="dialog" aria-modal="true" aria-labelledby="reservationPickerTitle">
        <button
          type="button"
          className="reservation-picker-backdrop"
          aria-label={getTranslation("reserve.step1.pickerCancel")}
          onClick={closePicker}
        />
        <div className="reservation-picker-sheet">
          <div className="reservation-picker-handle" aria-hidden="true" />
          <h3 className="reservation-picker-title" id="reservationPickerTitle">{pickerTitle}</h3>
          <div className="reservation-picker-options">
            {options.map((option) => (
              <button
                key={`${activePicker}-${option.value}`}
                type="button"
                className={`reservation-picker-option ${option.selected ? "selected" : ""}`}
                onClick={() => {
                  option.onSelect()
                  closePicker()
                }}
              >
                <span>{option.label}</span>
                {option.selected && <i className="bi bi-check-lg" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // If current selectedDate is not in the available date options (e.g., today has no slots),
  // automatically move to the first available date and clear the selected time.
  useEffect(() => {
    const options = dateOptions()
    const currentVal = formatDateToYYYYMMDD(selectedDate)
    const hasCurrent = options.some((o) => o.value === currentVal)
    if (!hasCurrent && options.length > 0) {
      const first = options[0]
      if (first?.date instanceof Date) {
        const d = new Date(first.date)
        d.setHours(0, 0, 0, 0)
        setSelectedDate(d)
        setSelectedTime("")
      }
    }
    // Re-evaluate when restaurant settings change (which affects options)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant, selectedAreaId, areas])

  // When date changes, ensure a valid time is selected; pick the first available time if needed.
  useEffect(() => {
    const available = generateTimeSlots().times
    if (!available || available.length === 0) {
      setSelectedTime("")
      return
    }
    if (!selectedTime || !available.includes(selectedTime)) {
      setSelectedTime(available[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, restaurant, selectedAreaId, areas])

  // If areas list changes and the selected area disappears, clear selection (keep optional)
  useEffect(() => {
    if (selectedAreaId && !(areas || []).some(a => a.id === selectedAreaId)) {
      setSelectedAreaId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas])

  return (
    <div id="step1" className="reservation-step reservation-step-one">
      <section className="booking-panel">
        <div className="booking-panel-header">
          <p>{getTranslation("reserve.step1.planTitle")}</p>
          <h2>{getTranslation("reserve.step1.planHeading")}</h2>
        </div>
        <div className="booking-field-grid">
          <button type="button" className="booking-field" onClick={() => setActivePicker("party")}>
            <span>{getTranslation("reserve.step1.partyLabel")}</span>
            <strong>{selectedPartyLabel}</strong>
            <i className="bi bi-chevron-down" aria-hidden="true" />
          </button>
          <button type="button" className="booking-field" onClick={() => setActivePicker("date")}>
            <span>{getTranslation("reserve.step1.dateLabel")}</span>
            <strong>{selectedDateLabel}</strong>
            <i className="bi bi-chevron-down" aria-hidden="true" />
          </button>
          <button type="button" className="booking-field" onClick={() => setActivePicker("time")}>
            <span>{getTranslation("reserve.step1.timeLabel")}</span>
            <strong>{selectedTime || "-"}</strong>
            <i className="bi bi-chevron-down" aria-hidden="true" />
          </button>
          {areas && areas.length > 0 && (
            <button type="button" className="booking-field" onClick={() => setActivePicker("area")}>
              <span>{getTranslation("reserve.step1.areaLabel") || "Area"}</span>
              <strong>{selectedAreaLabel}</strong>
              <i className="bi bi-chevron-down" aria-hidden="true" />
            </button>
          )}
        </div>
      </section>

      {blockedIntervalsMessage && (
        <div className="alert alert-warning mt-3" role="alert">
          {blockedIntervalsMessage}
        </div>
      )}
      {renderPickerSheet()}
    </div>
  )
}
