"use client"

import { useLanguage } from "@/context/language-context"
import { useEffect, useMemo, useRef, useState, type RefObject } from "react"
import { Calendar, Users } from "lucide-react"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GUEST_AGE_OPTIONS = Array.from({ length: 48 }, (_, index) => index + 18)

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

interface ReservationStep2Props {
  restaurantName: string
  partySize: string
  selectedDate: Date
  selectedTime: string
  customerName: string
  setCustomerName: (name: string) => void
  customerPhone: string
  setCustomerPhone: (phone: string) => void
  customerEmail: string
  setCustomerEmail: (email: string) => void
  specialRequests: string
  setSpecialRequests: (requests: string) => void
  minGuestAge: number
  setMinGuestAge: (age: number) => void
  maxGuestAge: number
  setMaxGuestAge: (age: number) => void
  reservationType: string
  setReservationType: (type: string) => void
  mealOnlyReservations: boolean
  getDisplayDate: (date: Date, lang: string, includeDayName?: boolean) => string
  attemptedSubmit?: boolean
  selectedAreaId?: string | null
  areas?: ReservationArea[]
}

export function ReservationStep2({
  restaurantName,
  partySize,
  selectedDate,
  selectedTime,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerEmail,
  setCustomerEmail,
  specialRequests,
  setSpecialRequests,
  minGuestAge,
  setMinGuestAge,
  maxGuestAge,
  setMaxGuestAge,
  reservationType,
  setReservationType,
  mealOnlyReservations,
  getDisplayDate,
  attemptedSubmit = false,
  selectedAreaId,
  areas,
}: ReservationStep2Props) {
  const { getTranslation, currentLang } = useLanguage()
  const [showContactFields, setShowContactFields] = useState(false)
  const [showAgeRangePicker, setShowAgeRangePicker] = useState(false)
  const [draftMinGuestAge, setDraftMinGuestAge] = useState(minGuestAge)
  const [draftMaxGuestAge, setDraftMaxGuestAge] = useState(maxGuestAge)
  const contactSectionRef = useRef<HTMLDivElement | null>(null)
  const minAgeListRef = useRef<HTMLDivElement | null>(null)
  const maxAgeListRef = useRef<HTMLDivElement | null>(null)
  const [touched, setTouched] = useState<{ name: boolean; email: boolean; phone: boolean }>({
    name: false,
    email: false,
    phone: false,
  })

  // Check if selected area is Terrace or Deck (dining only areas)
  // Exception: Felix Marina's Terrace area accepts drinks reservations
  const selectedArea = areas?.find(area => area.id === selectedAreaId)
  const isFelixMarinaTerraceArea = selectedArea && 
    restaurantName.toLowerCase().includes('felix') && 
    restaurantName.toLowerCase().includes('marina') && 
    selectedArea.name.toLowerCase().includes('terrace')
  const isFelixMarina = restaurantName.toLowerCase().includes('felix') && restaurantName.toLowerCase().includes('marina')
  const isDiningOnlyArea = selectedArea && 
    (selectedArea.name.toLowerCase().includes('terrace') || selectedArea.name.toLowerCase().includes('deck')) &&
    !isFelixMarinaTerraceArea
  const effectiveMealOnlyReservations = mealOnlyReservations || isDiningOnlyArea

  // Force meal reservation type for dining-only areas
  useEffect(() => {
    if (isDiningOnlyArea && reservationType !== 'meal') {
      setReservationType('meal')
    }
  }, [isDiningOnlyArea, reservationType, setReservationType])

  // Basic validators
  const errors = useMemo(() => {
    const errs: { name?: string; email?: string; phone?: string } = {}
    if (!customerName || customerName.trim().length === 0) {
      errs.name = getTranslation("reserve.step2.errors.nameRequired")
    }
    if (!customerEmail || customerEmail.trim().length === 0) {
      errs.email = getTranslation("reserve.step2.errors.emailRequired")
    } else if (!EMAIL_REGEX.test(customerEmail)) {
      errs.email = getTranslation("reserve.step2.errors.emailInvalid")
    }
    if (!customerPhone || customerPhone.trim().length === 0) {
      errs.phone = getTranslation("reserve.step2.errors.phoneRequired")
    }
    return errs
  }, [customerName, customerEmail, customerPhone, getTranslation])

  // Only auto-open the contact section when a submit attempt is made and there are errors
  useEffect(() => {
    if (attemptedSubmit && (errors.name || errors.email || errors.phone)) {
      setShowContactFields(true)
      // Mark all as touched to show errors inline
      setTouched({ name: true, email: true, phone: true })

      window.requestAnimationFrame(() => {
        contactSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
  }, [attemptedSubmit, errors.name, errors.email, errors.phone])

  const getTimezone = () => {
    if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      return getTranslation("reserve.messages.invalidTimezone")
    }
    const offset = -selectedDate.getTimezoneOffset() / 60
    if (!isNaN(offset)) {
      return `(GMT${offset >= 0 ? "+" : ""}${offset.toString().padStart(2, "0")}:00)`
    } else {
      return getTranslation("reserve.messages.invalidTimezone")
    }
  }

  const toggleContactFields = () => {
    setShowContactFields(!showContactFields)
  }

  const scrollAgeListToValue = (container: HTMLDivElement | null, age: number, behavior: ScrollBehavior = "smooth") => {
    const option = container?.querySelector<HTMLButtonElement>(`[data-age="${age}"]`)
    if (!container || !option) return

    const top = option.offsetTop - (container.clientHeight - option.clientHeight) / 2
    container.scrollTo({ top, behavior })
  }

  const openAgeRangePicker = () => {
    setDraftMinGuestAge(minGuestAge)
    setDraftMaxGuestAge(maxGuestAge)
    setShowAgeRangePicker(true)
  }

  const cancelAgeRangePicker = () => {
    setDraftMinGuestAge(minGuestAge)
    setDraftMaxGuestAge(maxGuestAge)
    setShowAgeRangePicker(false)
  }

  const confirmAgeRangePicker = () => {
    setMinGuestAge(draftMinGuestAge)
    setMaxGuestAge(draftMaxGuestAge)
    setShowAgeRangePicker(false)
  }

  const updateDraftMinGuestAge = (age: number) => {
    const nextAge = Math.min(65, Math.max(18, age))
    setDraftMinGuestAge(nextAge)
    if (draftMaxGuestAge < nextAge) {
      setDraftMaxGuestAge(nextAge)
    }
  }

  const updateDraftMaxGuestAge = (age: number) => {
    setDraftMaxGuestAge(Math.min(65, Math.max(18, draftMinGuestAge, age)))
  }

  useEffect(() => {
    if (!showAgeRangePicker) return

    window.requestAnimationFrame(() => {
      scrollAgeListToValue(minAgeListRef.current, draftMinGuestAge, "auto")
      scrollAgeListToValue(maxAgeListRef.current, draftMaxGuestAge, "auto")
    })
  }, [showAgeRangePicker, draftMinGuestAge, draftMaxGuestAge])

  const renderAgeList = (
    label: string,
    value: number,
    onChange: (age: number) => void,
    listRef: RefObject<HTMLDivElement | null>,
    isDisabled?: (age: number) => boolean
  ) => (
    <div className="age-list-column" role="group" aria-label={label}>
      <div className="age-list-label">{label}</div>
      <div className="age-scroll-list" ref={listRef}>
        {GUEST_AGE_OPTIONS.map((age) => {
          const disabled = isDisabled?.(age) || false
          return (
            <button
              key={`${label}-${age}`}
              type="button"
              className={`age-option ${value === age ? "selected" : ""}`}
              onClick={() => onChange(age)}
              disabled={disabled}
              aria-pressed={value === age}
              data-age={age}
            >
              {age}
            </button>
          )
        })}
      </div>
    </div>
  )

  const renderReservationTypeMealLabel = () => {
    const label = getTranslation("reserve.step2.reservationTypeMeal")
    const match = label.match(/^(.*?)(\s*\(.*\))$/)

    if (!match) {
      return <span>{label}</span>
    }

    return (
      <span className="reservation-type-label">
        <span>{match[1].trim()}</span>
        <span className="reservation-type-label-sub">{match[2].trim()}</span>
      </span>
    )
  }

  return (
    <div id="step2">
      <div className="summary-section">
        <div className="summary-item">
          <Users className="w-6 h-6 text-muted-foreground" />
          <div className="summary-item-details">
            <div className="main-text" id="summaryParty">
              {getTranslation("reserve.step2.summaryPartyOf", {
                count: partySize === "8" ? "8+" : partySize,
              })}
            </div>
            <div className="sub-text" id="summaryRestaurantName">
              {restaurantName}
            </div>
          </div>
        </div>
        <div className="summary-item">
          <Calendar className="w-6 h-6 text-muted-foreground" />
          <div className="summary-item-details">
            <div className="main-text" id="summaryDateTime">
              {getDisplayDate(selectedDate, currentLang, true)}, {selectedTime}
            </div>
            <div className="sub-text" id="summaryTimezone">
              {getTimezone()}
            </div>
          </div>
        </div>
      </div>

      <div className="contact-info-section" ref={contactSectionRef}>
        <h2 className="section-title">{getTranslation("reserve.step2.contactInfoTitle")}</h2>
        {!showContactFields ? (
          <button className="add-info-button" id="addContactInfoBtn" onClick={toggleContactFields}>
            <span>{getTranslation("reserve.step2.addContactInfoButton")}</span>
            <i className="bi bi-chevron-right"></i>
          </button>
        ) : (
          <div className="contact-fields mt-3" id="contactFields">
            <div className="mb-2">
              <label htmlFor="customerName" className="form-label">
                {getTranslation("reserve.step2.fullNameLabel")}
              </label>
              <input
                type="text"
                className={`form-control ${touched.name && errors.name ? 'border-red-500' : ''}`}
                id="customerName"
                placeholder={getTranslation("reserve.step2.requiredPlaceholder")}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
              />
              {(touched.name || attemptedSubmit) && errors.name && (
                <p className="text-red-600 text-xs mt-1">{errors.name}</p>
              )}
            </div>
            <div className="mb-2">
              <label htmlFor="customerPhone" className="form-label">
                {getTranslation("reserve.step2.phoneLabel")}
              </label>
              <input
                type="tel"
                className={`form-control ${touched.phone && errors.phone ? 'border-red-500' : ''}`}
                id="customerPhone"
                placeholder={getTranslation("reserve.step2.requiredPlaceholder")}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
              />
              {(touched.phone || attemptedSubmit) && errors.phone && (
                <p className="text-red-600 text-xs mt-1">{errors.phone}</p>
              )}
            </div>
            <div className="mb-2">
              <label htmlFor="customerEmail" className="form-label">
                {getTranslation("reserve.step2.emailLabel")} *
              </label>
              <input
                type="email"
                className={`form-control ${touched.email && errors.email ? 'border-red-500' : ''}`}
                id="customerEmail"
                placeholder={getTranslation("reserve.step2.requiredPlaceholder")}
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              />
              {(touched.email || attemptedSubmit) && errors.email && (
                <p className="text-red-600 text-xs mt-1">{errors.email}</p>
              )}
            </div>
            <div className="mb-2">
              <label htmlFor="guestAgeRange" className="form-label">
                {getTranslation("reserve.step2.guestAgeRangeTitle")}
              </label>
              <button
                id="guestAgeRange"
                type="button"
                className={`age-range-field ${showAgeRangePicker ? "open" : ""}`}
                onClick={openAgeRangePicker}
                aria-expanded={showAgeRangePicker}
                aria-controls="guestAgeRangeSheet"
              >
                <span>{minGuestAge} - {maxGuestAge}</span>
                <i className="bi bi-chevron-down"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {showAgeRangePicker && (
        <div className="age-picker-overlay" role="dialog" aria-modal="true" aria-labelledby="guestAgeRangeTitle">
          <button
            type="button"
            className="age-picker-backdrop"
            aria-label={getTranslation("reserve.step2.guestAgeCancel")}
            onClick={cancelAgeRangePicker}
          />
          <div className="age-picker-sheet" id="guestAgeRangeSheet">
            <div className="age-picker-handle" aria-hidden="true" />
            <div className="age-picker-toolbar">
              <button type="button" className="age-picker-action" onClick={cancelAgeRangePicker}>
                {getTranslation("reserve.step2.guestAgeCancel")}
              </button>
              <h3 id="guestAgeRangeTitle">{getTranslation("reserve.step2.guestAgeRangeTitle")}</h3>
              <button type="button" className="age-picker-action strong" onClick={confirmAgeRangePicker}>
                {getTranslation("reserve.step2.guestAgeSet")}
              </button>
            </div>
            <p className="age-picker-description">{getTranslation("reserve.step2.guestAgeRangeDescription")}</p>
            <div className="age-wheel-frame">
              <div className="age-wheel-selection" aria-hidden="true" />
              <div className="guest-age-grid">
                {renderAgeList(
                  getTranslation("reserve.step2.guestAgeMinLabel"),
                  draftMinGuestAge,
                  updateDraftMinGuestAge,
                  minAgeListRef
                )}
                {renderAgeList(
                  getTranslation("reserve.step2.guestAgeMaxLabel"),
                  draftMaxGuestAge,
                  updateDraftMaxGuestAge,
                  maxAgeListRef,
                  (age) => age < draftMinGuestAge
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="reservation-type-section">
        <div className="booking-panel-header compact">
          <p>{getTranslation("reserve.step2.reservationTypeTitle")}</p>
          <h2>{getTranslation("reserve.step2.reservationTypeDescription")}</h2>
        </div>
        <div className="reservation-type-segment">
          <label className={`reservation-type-option ${reservationType === "meal" ? "selected" : ""}`}>
            <input
              type="radio"
              name="reservationType"
              value="meal"
              checked={reservationType === "meal"}
              onChange={(e) => setReservationType(e.target.value)}
            />
            {renderReservationTypeMealLabel()}
          </label>
          {!effectiveMealOnlyReservations && (
            <label className={`reservation-type-option ${reservationType === "drinks" ? "selected" : ""}`}>
              <input
                type="radio"
                name="reservationType"
                value="drinks"
                checked={reservationType === "drinks"}
                onChange={(e) => setReservationType(e.target.value)}
              />
              <span>{getTranslation("reserve.step2.reservationTypeDrinks")}</span>
            </label>
          )}
        </div>

        {isFelixMarina && reservationType === 'meal' && (
          <p className="reservation-notice">{getTranslation('reserve.step2.marinaDiningNotice')}</p>
        )}

        {effectiveMealOnlyReservations && (
          <p className="reservation-notice">
            {isDiningOnlyArea ? getTranslation("reserve.step2.areaOnlyDiningNotice") : getTranslation("reserve.step2.mealOnlyNotice")}
          </p>
        )}
      </section>

      <div className="special-request-section">
        <h2 className="special-request-title">{getTranslation("reserve.step2.specialRequestTitle")}</h2>
        <textarea
          id="specialRequests"
          className="special-request-input"
          placeholder={getTranslation("reserve.step2.specialRequestPlaceholder")}
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
        ></textarea>
      </div>

      <div className="rules-restrictions-section mt-4">
        <h3 className="section-title text-sm font-semibold mb-3">{getTranslation("reserve.step2.rulesTitle")}</h3>
        <div className="rules-list space-y-2">
          <div className="rule-item flex items-start gap-2">
            <span className="text-red-500 mt-1">•</span>
            <span className="text-sm text-gray-600">{getTranslation("reserve.step2.ruleCancel")}</span>
          </div>
          <div className="rule-item flex items-start gap-2">
            <span className="text-blue-500 mt-1">•</span>
            <span className="text-sm text-gray-600">{getTranslation("reserve.step2.ruleEditWindow")}</span>
          </div>
        </div>

        <div className="terms-notice mt-4 p-3 bg-gray-50 rounded-md border">
          <p className="text-xs text-gray-600">
            {getTranslation("reserve.step2.termsNoticePrefix")} {" "}
            <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
              {getTranslation("reserve.step2.termsLink")}
            </a>{" "}
            {getTranslation("reserve.step2.termsNoticeAnd")} {" "}
            <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
              {getTranslation("reserve.step2.privacyLink")}
            </a>{" "}
            {getTranslation("reserve.step2.termsNoticeSuffix")}
          </p>
        </div>
      </div>
    </div>
  )
}
