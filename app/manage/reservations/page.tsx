"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Search, RefreshCw, Plus } from "lucide-react"
import { getReservations, getRestaurants } from "../actions"
import { ReservationTable } from "@/components/manage/reservation-table"
import { ReservationForm } from "@/components/manage/reservation-form"
import { ManageHeader } from "@/components/manage/manage-header"
import { ManageSidebar } from "@/components/manage/manage-sidebar"
import { useLanguage } from "@/context/language-context"
import type { Database } from "@/types/supabase"

type Reservation = Database['public']['Tables']['reservations']['Row']

export default function ReservationsPage() {
  const { getTranslation } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState({ email: "", name: "Admin User" })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [filters, setFilters] = useState({
    status: "all",
    restaurantId: "all",
    dateRange: "all",
    searchQuery: "",
  })
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setUser({
          email: data.session.user.email || "",
          name: data.session.user.user_metadata?.full_name || "Admin User",
        })
      }
      fetchReservations()
    }

    checkSession()
  }, [router, supabase])

  const fetchReservations = async () => {
    setIsLoading(true)
    try {
      const result = await getReservations(filters)
      if (result.success) {
        setReservations(result.data)
      }
    } catch (error) {
      console.error("Error fetching reservations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchReservations()
  }

  const handleRefresh = () => {
    fetchReservations()
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">{getTranslation("manage.common.loadingReservations")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <ManageSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ManageHeader user={user} toggleSidebar={toggleSidebar} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-semibold mb-6">{getTranslation("manage.reservations.title")}</h1>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{getTranslation("manage.reservations.filters.title")}</CardTitle>
                <CardDescription>{getTranslation("manage.reservations.filters.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{getTranslation("manage.reservations.filters.status")}</label>
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={getTranslation("manage.reservations.filters.statusPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{getTranslation("manage.reservations.filters.statusAll")}</SelectItem>
                        <SelectItem value="pending">{getTranslation("manage.reservations.filters.statusPending")}</SelectItem>
                        <SelectItem value="confirmed">{getTranslation("manage.reservations.filters.statusConfirmed")}</SelectItem>
                        <SelectItem value="cancelled">{getTranslation("manage.reservations.filters.statusCancelled")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">{getTranslation("manage.reservations.filters.dateRange")}</label>
                    <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange("dateRange", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={getTranslation("manage.reservations.filters.dateRangePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{getTranslation("manage.reservations.filters.dateAll")}</SelectItem>
                        <SelectItem value="today">{getTranslation("manage.reservations.filters.dateToday")}</SelectItem>
                        <SelectItem value="tomorrow">{getTranslation("manage.reservations.filters.dateTomorrow")}</SelectItem>
                        <SelectItem value="week">{getTranslation("manage.reservations.filters.dateWeek")}</SelectItem>
                        <SelectItem value="month">{getTranslation("manage.reservations.filters.dateMonth")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">{getTranslation("manage.reservations.filters.search")}</label>
                    <Input
                      placeholder={getTranslation("manage.reservations.filters.searchPlaceholder")}
                      value={filters.searchQuery}
                      onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button type="submit" className="mr-2">
                      {getTranslation("manage.reservations.filters.apply")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFilters({
                          status: "all",
                          restaurantId: "all",
                          dateRange: "all",
                          searchQuery: "",
                        })
                        setTimeout(fetchReservations, 0)
                      }}
                    >
                      {getTranslation("manage.reservations.filters.reset")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{getTranslation("manage.reservations.list.title")}</CardTitle>
                  <CardDescription>
                    {getTranslation("manage.reservations.list.showing", { count: String(reservations.length) })}
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Reservation
                </Button>
              </CardHeader>
              <CardContent>
                <ReservationTable reservations={reservations} onRefresh={handleRefresh} />
              </CardContent>
            </Card>

            {showCreateForm && (
              <ReservationForm
                isOpen={showCreateForm}
                mode="create"
                onClose={() => setShowCreateForm(false)}
                onSuccess={() => {
                  setShowCreateForm(false)
                  fetchReservations()
                }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
