"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { ManageProvider } from "@/context/manage-context"
import { ManageShell } from "@/components/manage/manage-shell"

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage =
    pathname === "/manage/login" || pathname === "/manage/reset-password" || pathname === "/manage/update-password"
  const isPrintPage = pathname.startsWith("/manage/seating/print")
  
  if (isLoginPage || isPrintPage) {
    return <>{children}</>
  }

  return (
    <ManageProvider>
      <ManageShell>{children}</ManageShell>
    </ManageProvider>
  )
}
