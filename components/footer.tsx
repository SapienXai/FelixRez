"use client"

import { useLanguage } from "@/context/language-context"

export function Footer() {
  const { getTranslation } = useLanguage()

  return (
    <footer>
      <p>{getTranslation("footer.copyright")}</p>
    </footer>
  )
}
