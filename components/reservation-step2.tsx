"use client"

import { useLanguage } from "@/context/language-context"
import { useEffect, useMemo, useState } from "react"
import { Users, Calendar } from "lucide-react"

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
  getDisplayDate: (date: Date, lang: string, includeDayName?: boolean) => string
  attemptedSubmit?: boolean
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
  getDisplayDate,
  attemptedSubmit = false,
}: ReservationStep2Props) {
  const { getTranslation, currentLang } = useLanguage()
  const [showContactFields, setShowContactFields] = useState(false)
  const [touched, setTouched] = useState<{ name: boolean; email: boolean; phone: boolean }>({
    name: false,
    email: false,
    phone: false,
  })

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
