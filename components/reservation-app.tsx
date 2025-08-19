"use client"

import { useLanguage } from "@/context/language-context"
import { useEffect, useState } from "react"
import { AppHeader } from "./app-header"
import { ReservationStep1 } from "./reservation-step1"
import { ReservationStep2 } from "./reservation-step2"
import { useRouter } from "next/navigation"
import { createReservation, getRestaurantByName, getActiveReservationAreas } from "@/app/actions/reservation-actions"
// Server actions are used for data access to avoid client RLS issues
import type { Restaurant, ReservationArea } from "@/types/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, XCircle } from 'lucide-react'
import { ReservationConfirmation } from "./reservation-confirmation"
import { translations } from "@/lib/translations"
import Link from "next/link"
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
  const [restaurantName, setRestaurantName] = useState(initialRestaurant)
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
  const [reservationType, setReservationType] = useState("meal")
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reservationComplete, setReservationComplete] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [showStep2Errors, setShowStep2Errors] = useState(false)
  const router = useRouter()

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
  }, [restaurantData?.id])

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

      const result = await createReservation({
        restaurantId: effectiveRestaurant!.id,
        reservationAreaId: selectedAreaId || null,
        partySize: Number.parseInt(partySize),
        reservationDate: formattedDate,
        reservationTime: selectedTime,
        customerName,
        customerPhone,
        customerEmail,
        specialRequests: specialRequests || undefined,
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
            special_requests: specialRequests || undefined,
            created_at: new Date().toISOString()
          }
          
          const cookieValue = encodeURIComponent(JSON.stringify(reservationData))
          const expiryDate = new Date()
          expiryDate.setHours(expiryDate.getHours() + 3)
          document.cookie = `recent_reservation=${cookieValue}; expires=${expiryDate.toUTCString()}; path=/`
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
        <div className="app-content">
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

        <div className="app-content">
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
    <main className="px-4 pb-8">
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
        </div>
      </div>
    </main>
  )
}
