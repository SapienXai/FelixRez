"use client"

import { useLanguage } from "@/context/language-context"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { LanguageSelector } from "./language-selector"

interface AppHeaderProps {
  isIndexPage?: boolean
  restaurantName?: string
  subtitle?: string
  showBackButton?: boolean
  currentStep?: number
}

export function AppHeader({
  isIndexPage = false,
  restaurantName,
  subtitle,
  showBackButton = false,
  currentStep = 1,
}: AppHeaderProps) {
  const { getTranslation } = useLanguage()
  const router = useRouter()

  const handleBack = () => {
    if (currentStep === 2) {
      // Go back to step 1 (handled by parent component)
      window.history.back()
    } else {
      // Go back to index page
      router.push(`/`)
    }
  }

  const headerClass = isIndexPage ? "app-header index-page-app-header" : "app-header"
  const titleClass = isIndexPage ? "main-title" : "main-title"

  return (
    <div className={headerClass}>
      {showBackButton ? (
        <button type="button" className="app-header-action-btn" aria-label="Back" onClick={handleBack}>
          <ArrowLeft size={24} />
        </button>
      ) : (
        <div className="app-header-logo-wrapper">
          <Image src="/assets/felix.png" alt="Felix Logo" width={32} height={32} />
        </div>
      )}

      <div className="title-section">
        <h1 className={titleClass}>
          {isIndexPage ? getTranslation("header.title") : restaurantName || getTranslation("header.title")}
        </h1>
        {subtitle && <p className="sub-title">{subtitle}</p>}
      </div>

      {isIndexPage ? (
        <div className="language-switcher">
          <LanguageSelector />
        </div>
      ) : (
        <div />
      )}
    </div>
  )
}
