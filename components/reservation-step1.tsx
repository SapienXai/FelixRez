"use client"

import type React from "react"
import { useEffect } from "react"

import { useLanguage } from "@/context/language-context"
import Image from "next/image"

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
  blocked_dates: string[] | null
  special_hours: any | null
}

interface ReservationStep1Props {
  partySize: string
  setPartySize: (size: string) => void
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  selectedTime: string
  setSelectedTime: (time: string) => void
  restaurant: Restaurant | null
}

export function ReservationStep1({
  partySize,
  setPartySize,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  restaurant,
}: ReservationStep1Props) {
  const { getTranslation, currentLang } = useLanguage()


  // Generate party size options based on restaurant settings
  const partySizeOptions = () => {
    const options = []
    const minSize = restaurant?.min_party_size || 1
    const maxSize = restaurant?.max_party_size || 8
    
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
    const openingTime = restaurant?.opening_time || "17:00"
    const closingTime = restaurant?.closing_time || "20:45"
    const slotDuration = restaurant?.time_slot_duration || 15
    
    // Parse opening and closing times
    const [openHour, openMinute] = openingTime.split(':').map(Number)
    const [closeHour, closeMinute] = closingTime.split(':').map(Number)
    
    // Convert to minutes for easier calculation
    const openMinutes = openHour * 60 + openMinute
    const closeMinutes = closeHour * 60 + closeMinute
    
    // If this is not today, all time slots are valid
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date.getTime() !== today.getTime()) {
      return true
    }
    
    // For today, check if any time slot is after the minimum advance time
    for (let minutes = openMinutes; minutes <= closeMinutes; minutes += slotDuration) {
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60
      
      // Skip if we've exceeded closing time
      if (hour > closeHour || (hour === closeHour && minute > closeMinute)) break
      
      // Create a datetime for this time slot
      const slotDateTime = new Date(date)
      slotDateTime.setHours(hour, minute, 0, 0)
      
      // If this slot is after the minimum advance time, the date is valid
      if (slotDateTime >= minDateTime) {
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
    
    const advanceBookingDays = restaurant?.advance_booking_days || 15
    const minAdvanceHours = restaurant?.min_advance_hours || 0
    const blockedDates = restaurant?.blocked_dates || []
    // Convert from database format (1=Monday, 7=Sunday) to JavaScript format (0=Sunday, 1=Monday)
    const dbAllowedDays = restaurant?.allowed_days_of_week || [1, 2, 3, 4, 5, 6, 7] // Default to all days
    const allowedDaysOfWeek = dbAllowedDays.map(day => day === 7 ? 0 : day) // Convert Sunday from 7 to 0
    
    // Calculate minimum datetime based on advance hours requirement
    const now = new Date()
    const minDateTime = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000)

    for (let i = 0; i < advanceBookingDays; i++) {
      const dateOption = new Date(today)
      dateOption.setDate(today.getDate() + i)
      
      // For today, check if there are any valid time slots after the minimum advance time
      if (i === 0) {
        // Check if today has any available time slots after the minimum advance time
        const hasValidTimeSlots = checkIfDateHasValidTimeSlots(dateOption, minDateTime)
        if (!hasValidTimeSlots) continue
      }
      
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

    const openingTime = restaurant?.opening_time || "17:00"
    const closingTime = restaurant?.closing_time || "20:45"
    const slotDuration = restaurant?.time_slot_duration || 15
    const minAdvanceHours = restaurant?.min_advance_hours || 0

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

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dateParts = e.target.value.split("-")
    const newDate = new Date(
      Number.parseInt(dateParts[0]),
      Number.parseInt(dateParts[1]) - 1,
      Number.parseInt(dateParts[2]),
    )
    newDate.setHours(0, 0, 0, 0)
    setSelectedDate(newDate)
  }

  const handleTimeSlotClick = (time: string) => {
    setSelectedTime(time)
  }

  const { times } = generateTimeSlots()

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
  }, [restaurant])

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
  }, [selectedDate, restaurant])

  return (
    <div id="step1">
      <div className="row g-3 step-1-selectors">
        <div className="col">
          <label htmlFor="partySize" className="form-label">
            {getTranslation("reserve.step1.partyLabel")}
          </label>
          <select
            className="form-select"
            id="partySize"
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
          >
            {partySizeOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col">
          <label htmlFor="reservationDay" className="form-label">
            {getTranslation("reserve.step1.dateLabel")}
          </label>
          <select
            className="form-select"
            id="reservationDay"
            value={formatDateToYYYYMMDD(selectedDate)}
            onChange={handleDateChange}
          >
            {dateOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col">
          <label htmlFor="reservationTimeMain" className="form-label">
            {getTranslation("reserve.step1.timeLabel")}
          </label>
          <select
            className="form-select"
            id="reservationTimeMain"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
          >
            <optgroup label={getTranslation("reserve.step1.availableTimesLabel")}>
              {times.map((time) => (
                <option key={`time-${time}`} value={time}>
                  {time}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>



      <div className="time-slots-container mt-3">
        <div className="mb-3">
          <h6 className="text-black mb-2">{getTranslation("reserve.step1.availableTimesLabel")}</h6>
          
          {times.length > 0 && (
            <div className="time-slots-grid">
              {times.map((time) => (
                <button
                  key={`slot-${time}`}
                  type="button"
                  className={`time-slot-btn ${selectedTime === time ? "selected" : ""}`}
                  data-time={time}
                  onClick={() => handleTimeSlotClick(time)}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="partnership-text mt-3">
        <a href="https://sapienx.app" target="_blank" rel="noopener noreferrer" aria-label="Visit SapienX AI">
          <Image src="/assets/sapienx.png" alt="SapienX AI Logo" width={50} height={50} />
        </a>
        <span>{getTranslation("reserve.step1.bookingEngineText")}</span>
      </div>
    </div>
  )
}
