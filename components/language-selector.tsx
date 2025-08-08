"use client"

import { useLanguage } from "@/context/language-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"
import { useEffect, useState } from "react"
import ClientOnly from "./client-only"

export function LanguageSelector() {
  const { currentLang, setLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang)
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full">
        <Globe className="h-5 w-5" />
        <span className="sr-only">Select language</span>
      </Button>
    )
  }

  return (
    <ClientOnly>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full flex items-center justify-center">
            <Globe className="h-5 w-5" />
            <span className="sr-only">Select language</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="!bg-white !text-gray-900">
          <DropdownMenuItem
            className={currentLang === "en" ? "bg-muted" : ""}
            onClick={() => handleLanguageChange("en")}
          >
            <span className="mr-2">🇬🇧</span>
            <span>English</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className={currentLang === "tr" ? "bg-muted" : ""}
            onClick={() => handleLanguageChange("tr")}
          >
            <span className="mr-2">🇹🇷</span>
            <span>Türkçe</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ClientOnly>
  )
}
