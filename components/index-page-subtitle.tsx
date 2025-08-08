"use client"

import { useLanguage } from "@/context/language-context"

export function IndexPageSubtitle() {
  const { getTranslation } = useLanguage()

  return (
    <div className="index-page-subtitle-container">
      <p>{getTranslation("header.subtitle")}</p>
    </div>
  )
}
