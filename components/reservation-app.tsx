"use client"

import { useLanguage } from "@/context/language-context"
import { useEffect, useState } from "react"
import { AppHeader } from "./app-header"
import { ReservationStep1 } from "./reservation-step1"
import { ReservationStep2 } from "./reservation-step2"
import { useRouter } from "next/navigation"
import { createReservation, getRestaurantByName } from "@/app/actions/reservation-actions"
// Server actions are used for data access to avoid client RLS issues
import type { Restaurant } from "@/types/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2 } from 'lucide-react'
import { ReservationConfirmation } from "./reservation-confirmation"
import { translations } from "@/lib/translations"
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
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [specialRequests, setSpecialRequests] = useState("")
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reservationComplete, setReservationComplete] = useState(false)
  const [isClient, setIsClient] = useState(false)
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

  // Defer fetching restaurant to server during submit to avoid client-side RLS/policy issues

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
    } else {
      await handleSubmitReservation()
    }
  }

  const handleSubmitReservation = async () => {
    if (!customerName || !customerPhone || !customerEmail) {
      setMessage(getTranslation("reserve.messages.namePhoneEmailRequired"))
      setIsSuccess(false)
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail)) {
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
      // Format date for database (YYYY-MM-DD)
      const formattedDate = selectedDate.toISOString().split("T")[0]

      const result = await createReservation({
        restaurantId: effectiveRestaurant!.id,
        partySize: Number.parseInt(partySize),
        reservationDate: formattedDate,
        reservationTime: selectedTime,
        customerName,
        customerPhone,
        customerEmail,
        specialRequests: specialRequests || undefined,
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
              getDisplayDate={getDisplayDate}
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
