"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { translations } from "@/lib/translations"

type LanguageContextType = {
  currentLang: string
  setLanguage: (lang: string) => void
  getTranslation: (key: string, replacements?: Record<string, string>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function SimpleLanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLang, setCurrentLang] = useState<string>("en")
  const [isClient, setIsClient] = useState(false)

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Initialize language from localStorage and URL on first render
  useEffect(() => {
    if (!isClient) return

    try {
      // First check URL for language parameter
      const urlParams = new URLSearchParams(window.location.search)
      const langParam = urlParams.get("lang")

      if (langParam && translations[langParam]) {
        setCurrentLang(langParam)
        localStorage.setItem("selectedLanguage", langParam)
      } else {
        // Then check localStorage
        const storedLang = localStorage.getItem("selectedLanguage")
        if (storedLang && translations[storedLang]) {
          setCurrentLang(storedLang)
        }
      }
    } catch (e) {
      console.error("Error initializing language:", e)
    }
  }, [isClient])

  // Update HTML lang attribute when language changes
  useEffect(() => {
    if (!isClient) return

    document.documentElement.lang = currentLang
    localStorage.setItem("selectedLanguage", currentLang)
  }, [currentLang, isClient])

  const handleSetLanguage = (lang: string) => {
    if (translations[lang]) {
      setCurrentLang(lang)

      if (isClient) {
        localStorage.setItem("selectedLanguage", lang)

        try {
          // Update URL with new language
          const params = new URLSearchParams(window.location.search)
          params.set("lang", lang)
          const newUrl = `${window.location.pathname}?${params.toString()}`
          window.history.replaceState({ path: newUrl }, "", newUrl)
        } catch (e) {
          console.error("Error updating URL:", e)
        }
      }
    }
  }

  const getTranslation = (key: string, replacements: Record<string, string> = {}) => {
    const keys = key.split(".")
    let result = translations[currentLang]

    for (const k of keys) {
      if (result && typeof result === "object" && k in result) {
        result = result[k]
      } else {
        if (currentLang !== "en") {
          // Fallback to English for missing keys
          const fallbackKeys = key.split(".")
          let fallbackResult = translations["en"]

          for (const fk of fallbackKeys) {
            if (fallbackResult && typeof fallbackResult === "object" && fk in fallbackResult) {
              fallbackResult = fallbackResult[fk]
            } else {
              return key
            }
          }

          if (typeof fallbackResult === "string") {
            for (const placeholder in replacements) {
              fallbackResult = fallbackResult.replace(new RegExp(`{${placeholder}}`, "g"), replacements[placeholder])
            }
            return fallbackResult
          }
          return key
        }
        return key
      }
    }

    if (typeof result === "string") {
      for (const placeholder in replacements) {
        result = result.replace(new RegExp(`{${placeholder}}`, "g"), replacements[placeholder])
      }
    }

    return result
  }

  return (
    <LanguageContext.Provider value={{ currentLang, setLanguage: handleSetLanguage, getTranslation }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useSimpleLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useSimpleLanguage must be used within a SimpleLanguageProvider")
  }
  return context
}
