"use client"

import { useLanguage } from "@/context/language-context"
import { useEffect, useRef, useState } from "react"
import { AppHeader } from "./app-header"
import { ReservationStep1 } from "./reservation-step1"
import { ReservationStep2 } from "./reservation-step2"
import { createReservation, getRestaurantByName, getActiveReservationAreas } from "@/app/actions/reservation-actions"
// Server actions are used for data access to avoid client RLS issues
import type { Restaurant, ReservationArea } from "@/types/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, XCircle } from 'lucide-react'
import { ReservationConfirmation } from "./reservation-confirmation"
import { translations } from "@/lib/translations"
import Link from "next/link"
import Image from "next/image"
interface ReservationAppProps {
  initialRestaurant: string
  initialLang: string
}

export function ReservationApp({ initialRestaurant, initialLang }: ReservationAppProps) {
  // Initialize language context with fallback
  const fallbackTranslation = (key: string) => {
    const parts = key.split(".")
    const langKey = (initialLang || "en") as keyof typeof translations
    if (!(langKey in translations)) {
      return key
    }
    let result: any = translations[langKey]
    for (const part of parts) {
      if (result && typeof result === "object" && part in result) {
        result = result[part]
      } else {
        return key
      }
    }
    return typeof result === "string" ? result : key
  }

  let languageContext = {
    currentLang: initialLang || "en",
    setLanguage: (lang: string) => console.log("Language set to:", lang),
    getTranslation: fallbackTranslation,
  }

  // Attempt to use the actual language context, but fall back if it fails
  try {
    const actualLanguageContext = useLanguage()
    languageContext = actualLanguageContext
  } catch (error) {
    console.error("Error using language context:", error)
    // Fallback is already set above
  }

  const { currentLang, setLanguage, getTranslation } = languageContext
  const [currentStep, setCurrentStep] = useState(1)
  const restaurantName = initialRestaurant
  const [restaurantData, setRestaurantData] = useState<Restaurant | null>(null)
  const [partySize, setPartySize] = useState("2")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTime, setSelectedTime] = useState("17:00")
  const [reservationAreas, setReservationAreas] = useState<ReservationArea[]>([])
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [specialRequests, setSpecialRequests] = useState("")
  const [minGuestAge, setMinGuestAge] = useState(18)
  const [maxGuestAge, setMaxGuestAge] = useState(18)
  const [reservationType, setReservationType] = useState("meal")
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reservationComplete, setReservationComplete] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [showStep2Errors, setShowStep2Errors] = useState(false)
  const appContentRef = useRef<HTMLDivElement | null>(null)

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Set initial language from props
  useEffect(() => {
    if (initialLang && translations[initialLang as keyof typeof translations] && setLanguage) {
      setLanguage(initialLang)
    }
  }, [initialLang, setLanguage])

  useEffect(() => {
    if (!isClient) return

    const container = appContentRef.current
    window.requestAnimationFrame(() => {
      container?.scrollTo({ top: 0, behavior: "auto" })
      window.scrollTo({ top: 0, behavior: "auto" })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    })
  }, [currentStep, isClient])

  // Fetch restaurant data early to get reservation settings
  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (!restaurantData && restaurantName) {
        try {
          const fetched = await getRestaurantByName(restaurantName)
          if (fetched) {
            setRestaurantData(fetched as unknown as Restaurant)
          }
        } catch (error) {
          console.error("Error fetching restaurant data:", error)
        }
      }
    }
    
    fetchRestaurantData()
  }, [restaurantName, restaurantData])

  // Fetch active reservation areas when we have a restaurant
  useEffect(() => {
    const fetchAreas = async () => {
      if (restaurantData?.id) {
        try {
          const areas = await getActiveReservationAreas(restaurantData.id)
          setReservationAreas(areas as unknown as ReservationArea[])
          // Do not auto-select an area; keep it optional
          // If previously selected area no longer exists, clear selection
          if (selectedAreaId && !(areas || []).some((a: any) => a.id === selectedAreaId)) {
            setSelectedAreaId(null)
          }
        } catch (e) {
          console.error("Error fetching reservation areas:", e)
          setReservationAreas([])
          setSelectedAreaId(null)
        }
      } else {
        setReservationAreas([])
        setSelectedAreaId(null)
      }
    }
    fetchAreas()
  }, [restaurantData?.id, selectedAreaId])

  // No alternative fetching; show a simple message and a Home button when closed

  const getHeaderTitle = () => {
    return currentStep === 1 ? restaurantName : getTranslation("reserve.header.yourReservation")
  }

  const getHeaderSubtitle = () => {
    return currentStep === 1 ? getTranslation("reserve.header.subTitleRestaurant") : restaurantName
  }

  const handleContinue = async () => {
    if (currentStep === 1) {
      if (!selectedTime) {
        setMessage(getTranslation("reserve.messages.selectTime"))
        setIsSuccess(false)
        return
      }
      setCurrentStep(2)
      setMessage("")
      setShowStep2Errors(false)
    } else {
      await handleSubmitReservation()
    }
  }

  const handleSubmitReservation = async () => {
    if (!customerName || !customerPhone || !customerEmail) {
      setShowStep2Errors(true)
      // setMessage(getTranslation("reserve.messages.namePhoneEmailRequired"))
      setIsSuccess(false)
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail)) {
      setShowStep2Errors(true)
      setMessage("Please enter a valid email address.")
      setIsSuccess(false)
      return
    }

    let effectiveRestaurant = restaurantData
    if (!effectiveRestaurant) {
      try {
        // Fallback: fetch on the server by name right before submit
        const fetched = await getRestaurantByName(restaurantName)
        if (fetched) {
          setRestaurantData(fetched)
          effectiveRestaurant = fetched as unknown as Restaurant
        } else {
          setMessage("Restaurant information not found. Please check the restaurant name or your database policies.")
          setIsSuccess(false)
          return
        }
      } catch (e) {
        console.error("Server lookup failed for restaurant:", restaurantName, e)
        setMessage("Could not access restaurant data. Please verify Supabase configuration and RLS policies.")
        setIsSuccess(false)
        return
      }
    }

    setIsLoading(true)

    try {
      // Format date for database (YYYY-MM-DD) - avoid timezone issues
      const formatDateToYYYYMMDD = (date: Date) => {
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const day = date.getDate().toString().padStart(2, "0")
        return `${year}-${month}-${day}`
      }
      const formattedDate = formatDateToYYYYMMDD(selectedDate)
      const ageRangeLabel =
        currentLang === "tr"
          ? `Misafir yaş aralığı: ${minGuestAge}-${maxGuestAge}`
          : `Guest age range: ${minGuestAge}-${maxGuestAge}`
      const specialRequestsWithAgeRange = [ageRangeLabel, specialRequests.trim()].filter(Boolean).join("\n")

      const result = await createReservation({
        restaurantId: effectiveRestaurant!.id,
        reservationAreaId: selectedAreaId || null,
        partySize: Number.parseInt(partySize),
        reservationDate: formattedDate,
        reservationTime: selectedTime,
        customerName,
        customerPhone,
        customerEmail,
        specialRequests: specialRequestsWithAgeRange || undefined,
        reservationType,
        lang: currentLang,
      })

      if (result.success) {
        setMessage(result.message)
        setIsSuccess(true)
        setReservationComplete(true)
        
        // Save reservation to cookie for 3 hours
        if (result.data) {
          const reservationData = {
            id: result.data.id,
            restaurant_name: restaurantName,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            party_size: Number.parseInt(partySize),
            reservation_date: formattedDate,
            reservation_time: selectedTime,
            special_requests: specialRequestsWithAgeRange || undefined,
            status: "pending" as const,
            notes: null as string | null,
            created_at: new Date().toISOString()
          }
          
          // Merge into recent_reservations list cookie (array)
          const parseDT = (d: string, t: string) => {
            const [yy, mm, dd] = d.split('-').map((n) => parseInt(n, 10) || 0)
            const [hh, mi] = t.split(':').map((n) => parseInt(n, 10) || 0)
            const x = new Date()
            x.setFullYear(yy)
            x.setMonth((mm || 1) - 1)
            x.setDate(dd || 1)
            x.setHours(hh || 0, mi || 0, 0, 0)
            return x
          }

          const cookies = document.cookie.split(';')
          const listCookie = cookies.find((c) => c.trim().startsWith('recent_reservations='))
          let items: any[] = []
          if (listCookie) {
            try {
              items = JSON.parse(decodeURIComponent(listCookie.split('=')[1])) || []
            } catch {}
          } else {
            // migrate from single cookie if present
            const single = cookies.find((c) => c.trim().startsWith('recent_reservation='))
            if (single) {
              try {
                const one = JSON.parse(decodeURIComponent(single.split('=')[1]))
                if (one && one.id) items = [one]
                // clear old single cookie
                document.cookie = 'recent_reservation=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
              } catch {}
            }
          }

          // add/replace by id
          const without = items.filter((it) => it.id !== reservationData.id)
          const nextItems = [...without, reservationData]

          // remove expired entries and compute max expiry
          const now = Date.now()
          const validItems = nextItems.filter((it) => {
            const dt = parseDT(it.reservation_date, it.reservation_time)
            return dt.getTime() > now
          })
          const maxExpiry = validItems.reduce((acc: number, it: any) => {
            const dt = parseDT(it.reservation_date, it.reservation_time).getTime()
            return Math.max(acc, dt)
          }, 0)

          // safety fallback
          const expiryDate = maxExpiry > now ? new Date(maxExpiry) : (() => { const e = new Date(); e.setHours(e.getHours() + 3); return e })()

          const cookieValue = encodeURIComponent(JSON.stringify(validItems))
          document.cookie = `recent_reservations=${cookieValue}; expires=${expiryDate.toUTCString()}; path=/`
        }
      } else {
        setMessage(result.message)
        setIsSuccess(false)
      }
    } catch (error) {
      console.error("Error submitting reservation:", error)
      setMessage("An unexpected error occurred. Please try again.")
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  const getDisplayDate = (dateObj: Date, langParam: string, includeDayName = true) => {
    const effectiveLang = langParam || currentLang
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return getTranslation("reserve.messages.invalidDateShort")
    }
    const langCode = effectiveLang === "tr" ? "tr-TR" : "en-US"
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
    if (includeDayName) {
      options.weekday = "short"
    }
    return dateObj.toLocaleDateString(langCode, options)
  }

  if (!isClient) {
    return <div className="p-8">Loading reservation form...</div>
  }

  if (reservationComplete) {
    return (
      <div className="reservation-app">
        <AppHeader
          restaurantName={getTranslation("reserve.header.yourReservation")}
          subtitle={restaurantName}
          showBackButton={false}
        />
        <div className="app-content" ref={appContentRef}>
          <ReservationConfirmation
            restaurantName={restaurantName}
            date={getDisplayDate(selectedDate, currentLang, true)}
            time={selectedTime}
          />
        </div>
      </div>
    )
  }

  // If this restaurant is closed for reservations, show friendly message and a Home button
  const isClosed = restaurantData && restaurantData.reservation_enabled === false
  if (isClosed) {
    return (
      <div className="reservation-app">
        <AppHeader
          restaurantName={restaurantName}
          subtitle={restaurantName}
          showBackButton={true}
          currentStep={1}
        />

        <div className="app-content" ref={appContentRef}>
          <div className="max-w-xl mx-auto">
            <Alert className="bg-white text-center">
              <XCircle className="inline-block mr-2 h-5 w-5" />
              <AlertTitle className="text-lg font-semibold">
                {getTranslation("reserve.messages.fullyBooked")}
              </AlertTitle>
              <AlertDescription className="mt-1 mb-4 text-gray-700">
                {getTranslation("reserve.messages.chooseAnotherLocation")}
              </AlertDescription>
              <div className="d-flex justify-content-center">
                <Link href="/" className="btn btn-primary">
                  {getTranslation("reserve.messages.backToHome")}
                </Link>
              </div>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main>
      <div className="reservation-app">
        <AppHeader
          restaurantName={getHeaderTitle()}
          subtitle={getHeaderSubtitle()}
          showBackButton={true}
          currentStep={currentStep}
        />

        <div className="app-content">
          {currentStep === 1 ? (
            <ReservationStep1
              partySize={partySize}
              setPartySize={setPartySize}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              restaurant={restaurantData}
              areas={reservationAreas}
              selectedAreaId={selectedAreaId}
              setSelectedAreaId={setSelectedAreaId}
            />
          ) : (
            <ReservationStep2
              restaurantName={restaurantName}
              partySize={partySize}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              customerEmail={customerEmail}
              setCustomerEmail={setCustomerEmail}
              specialRequests={specialRequests}
              setSpecialRequests={setSpecialRequests}
              minGuestAge={minGuestAge}
              setMinGuestAge={setMinGuestAge}
              maxGuestAge={maxGuestAge}
              setMaxGuestAge={setMaxGuestAge}
              reservationType={reservationType}
              setReservationType={setReservationType}
              mealOnlyReservations={restaurantData?.meal_only_reservations || false}
              getDisplayDate={getDisplayDate}
              attemptedSubmit={showStep2Errors}
              selectedAreaId={selectedAreaId}
              areas={reservationAreas}
            />
          )}

          {message && (
            <div className="mt-4">
              <Alert variant={isSuccess ? "default" : "destructive"}>
                <AlertTitle>{isSuccess ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <div className="app-footer">
          <button className="btn btn-primary" onClick={handleContinue} disabled={isLoading || isSuccess}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {getTranslation("reserve.footer.preparingEmailButton")}
              </>
            ) : isSuccess ? (
              getTranslation("reserve.footer.emailOpenedButton")
            ) : currentStep === 1 ? (
              getTranslation("reserve.footer.continueButton")
            ) : (
              getTranslation("reserve.footer.confirmButton")
            )}
          </button>
          {currentStep === 1 && (
            <div className="partnership-text partnership-text-footer">
              <a href="https://sapienx.app" target="_blank" rel="noopener noreferrer" aria-label="Visit SapienX AI">
                <Image src="/assets/sapienx.png" alt="SapienX AI Logo" width={32} height={32} />
              </a>
              <span>{getTranslation("reserve.step1.bookingEngineText")}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
