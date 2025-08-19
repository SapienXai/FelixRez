"use client"

import { useLanguage } from "@/context/language-context"
import { useEffect, useMemo, useState } from "react"
import { Users, Calendar } from "lucide-react"

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
  const [touched, setTouched] = useState<{ name: boolean; email: boolean; phone: boolean }>({
    name: false,
    email: false,
    phone: false,
  })

  // Check if selected area is Terrace or Deck (dining only areas)
  const selectedArea = areas?.find(area => area.id === selectedAreaId)
  const isDiningOnlyArea = selectedArea && (selectedArea.name.toLowerCase().includes('terrace') || selectedArea.name.toLowerCase().includes('deck'))
  const effectiveMealOnlyReservations = mealOnlyReservations || isDiningOnlyArea

  // Force meal reservation type for dining-only areas
  useEffect(() => {
    if (isDiningOnlyArea && reservationType !== 'meal') {
      setReservationType('meal')
    }
  }, [isDiningOnlyArea, reservationType, setReservationType])

  // Basic validators
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const errors = useMemo(() => {
    const errs: { name?: string; email?: string; phone?: string } = {}
    if (!customerName || customerName.trim().length === 0) {
      errs.name = getTranslation("reserve.step2.errors.nameRequired")
    }
    if (!customerEmail || customerEmail.trim().length === 0) {
      errs.email = getTranslation("reserve.step2.errors.emailRequired")
    } else if (!emailRegex.test(customerEmail)) {
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

      <div className="contact-info-section">
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
          </div>
        )}
      </div>

      {/* Reservation Type Selection */}
      <div className="reservation-type-section mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">{getTranslation("reserve.step2.reservationTypeTitle")}</h3>
              <p className="text-xs text-blue-800 mb-3">{getTranslation("reserve.step2.reservationTypeDescription")}</p>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-blue-100 transition-colors">
                  <input
                    type="radio"
                    name="reservationType"
                    value="meal"
                    checked={reservationType === "meal"}
                    onChange={(e) => setReservationType(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-blue-900">{getTranslation("reserve.step2.reservationTypeMeal")}</span>
                </label>
                {!effectiveMealOnlyReservations && (
                  <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-blue-100 transition-colors">
                    <input
                      type="radio"
                      name="reservationType"
                      value="drinks"
                      checked={reservationType === "drinks"}
                      onChange={(e) => setReservationType(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-blue-900">{getTranslation("reserve.step2.reservationTypeDrinks")}</span>
                  </label>
                )}
              </div>
              
              {effectiveMealOnlyReservations && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-xs text-amber-800 font-medium">
                    {isDiningOnlyArea ? "This area only accepts dining reservations." : getTranslation("reserve.step2.mealOnlyNotice")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="special-request-section">
        <h2 className="section-title">{getTranslation("reserve.step2.specialRequestTitle")}</h2>
        <textarea
          id="specialRequests"
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
