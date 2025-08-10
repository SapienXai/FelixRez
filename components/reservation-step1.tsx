"use client"

import type React from "react"

import { useLanguage } from "@/context/language-context"
import Image from "next/image"

interface ReservationStep1Props {
  partySize: string
  setPartySize: (size: string) => void
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  selectedTime: string
  setSelectedTime: (time: string) => void
}

export function ReservationStep1({
  partySize,
  setPartySize,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
}: ReservationStep1Props) {
  const { getTranslation, currentLang } = useLanguage()


  // Generate party size options
  const partySizeOptions = () => {
    const options = []
    for (let i = 1; i <= 7; i++) {
      const translationKey = i === 1 ? "reserve.step1.partySizeOptions.one" : "reserve.step1.partySizeOptions.other"
      options.push({
        value: i.toString(),
        label: getTranslation(translationKey, { count: i.toString() }),
      })
    }
    options.push({
      value: "8",
      label: getTranslation("reserve.step1.partySizeOptions.other", { count: "8+" }),
    })
    return options
  }

  // Generate date options
  const dateOptions = () => {
    const options = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 15; i++) {
      const dateOption = new Date(today)
      dateOption.setDate(today.getDate() + i)

      let displayText
      if (i === 0) {
        displayText = `${getTranslation("reserve.step1.dateToday")} (${getDisplayDate(dateOption, false)})`
      } else if (i === 1) {
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

  // Generate time slots
  const generateTimeSlots = () => {
    const afternoonTimes: string[] = []
    const eveningTimes: string[] = []
    const afternoonCutoff = 17

    // Only generate times between 17:00 and 20:45
    for (let hour = 17; hour <= 20; hour++) {
      const maxMinute = hour === 20 ? 45 : 59; // Stop at 20:45
      for (let minute = 0; minute <= maxMinute; minute += 15) {
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
        if (hour < afternoonCutoff) {
          afternoonTimes.push(timeStr)
        } else {
          eveningTimes.push(timeStr)
        }
      }
    }

    return { afternoonTimes, eveningTimes }
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

  const { afternoonTimes, eveningTimes } = generateTimeSlots()

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
            <optgroup label={getTranslation("reserve.step1.afternoonPeriod")}>
              {afternoonTimes.map((time) => (
                <option key={`afternoon-${time}`} value={time}>
                  {time}
                </option>
              ))}
            </optgroup>
            <optgroup label={getTranslation("reserve.step1.eveningPeriod")}>
              {eveningTimes.map((time) => (
                <option key={`evening-${time}`} value={time}>
                  {time}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>



      <div className="time-slots-container">
        <div className="time-slots-grid" id="timeSlotsGrid">
          {eveningTimes.map((time) => (
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
