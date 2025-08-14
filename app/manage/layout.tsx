"use client"

import type React from "react"
import { usePathname } from "next/navigation"

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/manage/login' || pathname === '/manage/reset-password' || pathname === '/manage/update-password'
  
  if (isLoginPage) {
    return <>{children}</>
  }
  
  return <div className="flex min-h-screen bg-gray-50">{children}</div>
}
