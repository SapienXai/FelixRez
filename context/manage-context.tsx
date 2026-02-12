"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"

type ManageUser = {
  email: string
  name: string
}

type ManageContextType = {
  user: ManageUser
  role: string | null
  isSuperAdmin: boolean
  loading: boolean
  refreshRole: () => Promise<void>
}

const defaultValue: ManageContextType = {
  user: { email: "", name: "Admin User" },
  role: null,
  isSuperAdmin: false,
  loading: true,
  refreshRole: async () => {},
}

const ManageContext = createContext<ManageContextType>(defaultValue)

export function ManageProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseBrowserClient()
  const [user, setUser] = useState<ManageUser>({ email: "", name: "Admin User" })
  const [role, setRole] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshRole = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase.auth.getSession()
      const sessionUser = data.session?.user
      if (sessionUser) {
        setUser({
          email: sessionUser.email || "",
          name: sessionUser.user_metadata?.full_name || "Admin User",
        })
      }
      if (!sessionUser) {
        setRole(null)
        setIsSuperAdmin(false)
        return
      }
      const res = await fetch("/api/me/role", { cache: "no-store" })
      const json = await res.json()
      setRole(json?.role ?? null)
      setIsSuperAdmin(Boolean(json?.isSuperAdmin))
    } catch {
      setRole(null)
      setIsSuperAdmin(false)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    refreshRole()
  }, [refreshRole])

  const value = useMemo(
    () => ({ user, role, isSuperAdmin, loading, refreshRole }),
    [user, role, isSuperAdmin, loading, refreshRole]
  )

  return <ManageContext.Provider value={value}>{children}</ManageContext.Provider>
}

export function useManageContext() {
  return useContext(ManageContext)
}
