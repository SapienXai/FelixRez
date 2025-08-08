"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { translations } from "@/lib/translations"

type LanguageContextType = {
  currentLang: string
  setLanguage: (lang: string) => void
  getTranslation: (key: string, replacements?: Record<string, string>) => string
}

// Create context with default values to prevent "undefined" errors
const defaultContextValue: LanguageContextType = {
  currentLang: "en",
  setLanguage: () => {},
  getTranslation: (key) => key,
}

const LanguageContext = createContext<LanguageContextType>(defaultContextValue)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
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
        document.cookie = `lang=${langParam}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
      } else {
        // Then check localStorage
        const storedLang = localStorage.getItem("selectedLanguage")
        if (storedLang && translations[storedLang]) {
          setCurrentLang(storedLang)
        } else {
          // Finally, check cookie
          const cookieMatch = document.cookie.match(/(?:^|; )lang=([^;]+)/)
          const cookieLang = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null
          if (cookieLang && translations[cookieLang]) {
            setCurrentLang(cookieLang)
            localStorage.setItem("selectedLanguage", cookieLang)
          }
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
    try {
      document.cookie = `lang=${currentLang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    } catch {}
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
        try {
          document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
        } catch {}
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

export function useLanguage() {
  const context = useContext(LanguageContext)
  return context
}
