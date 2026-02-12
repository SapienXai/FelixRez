"use client"

import type React from "react"
import { useState } from "react"
import { ManageHeader } from "@/components/manage/manage-header"
import { ManageSidebar } from "@/components/manage/manage-sidebar"
import { useManageContext } from "@/context/manage-context"

export function ManageShell({ children }: { children: React.ReactNode }) {
  const { user } = useManageContext()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev)
  }

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <ManageSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ManageHeader user={user} toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto px-2 pt-3 pb-5 md:p-6">{children}</main>
      </div>
    </div>
  )
}
