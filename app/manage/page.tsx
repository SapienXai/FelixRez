"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarClock, Clock, CheckCircle, XCircle, TrendingUp } from "lucide-react"
import { getDashboardStats, getTodayReservations, getUpcomingReservations, getNewReservations } from "./dashboard-actions"
import { getRestaurants } from "./actions"
import { ReservationList } from "@/components/manage/reservation-list"
import { ManageHeader } from "@/components/manage/manage-header"
import { ManageSidebar } from "@/components/manage/manage-sidebar"
import { useLanguage } from "@/context/language-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ManageDashboard() {
  const { getTranslation } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    percentChange: 0,
  })
  const [newReservations, setNewReservations] = useState<any[]>([])
  const [todayReservations, setTodayReservations] = useState<any[]>([])
  const [upcomingReservations, setUpcomingReservations] = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState({ email: "", name: "Admin User" })
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
      await fetchRestaurants()
      fetchDashboardData()
    }

    checkSession()

    // Keep cookie/session synced while on dashboard
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        await fetch("/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event, session }),
        })
      } catch {}
      if (event === "SIGNED_OUT") {
        router.replace("/manage/login")
      }
    })

    return () => subscription?.subscription?.unsubscribe?.()
  }, [router, supabase])

  // Fetch dashboard data when restaurant filter changes
  useEffect(() => {
    if (restaurants.length > 0) {
      fetchDashboardData()
    }
  }, [selectedRestaurant])

  // Real-time subscription for new reservations (updates all tabs)
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('new-reservations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations',
        },
        async (payload) => {
          console.log('New reservation detected:', payload)

          // Fetch the complete reservation with restaurant data
          const { data: newReservation, error } = await supabase
            .from('reservations')
            .select(`
              *,
              restaurants (id, name)
            `)
            .eq('id', payload.new.id)
            .single()

          if (error || !newReservation) return

          // Respect current restaurant filter
          if (selectedRestaurant && selectedRestaurant !== 'all' && newReservation.restaurant_id !== selectedRestaurant) {
            // Not in current filter; still refresh stats only
            const statsResult = await getDashboardStats(selectedRestaurant)
            if (statsResult.success && statsResult.stats) setStats(statsResult.stats)
            return
          }

          // Helper to avoid duplicates in lists
          const notIn = (arr: any[]) => !arr.some((r) => r.id === newReservation.id)

          // Always prepend to New tab (if not already present)
          setNewReservations((prev) => (notIn(prev) ? [newReservation, ...prev] : prev))

          // Compute date buckets for Today and Upcoming
          const today = new Date()
          const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const todayStr = fmt(today)
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          const nextWeek = new Date(today)
          nextWeek.setDate(nextWeek.getDate() + 7)
          const tomorrowStr = fmt(tomorrow)
          const nextWeekStr = fmt(nextWeek)

          // Update Today tab
          if (newReservation.reservation_date === todayStr) {
            setTodayReservations((prev) => (notIn(prev) ? [newReservation, ...prev] : prev))
          }

          // Update Upcoming tab (tomorrow <= date < nextWeek)
          if (
            newReservation.reservation_date >= tomorrowStr &&
            newReservation.reservation_date < nextWeekStr
          ) {
            setUpcomingReservations((prev) => (notIn(prev) ? [newReservation, ...prev] : prev))
          }

          // Refresh stats to keep counters in sync
          const statsResult = await getDashboardStats(selectedRestaurant === 'all' ? undefined : selectedRestaurant)
          if (statsResult.success && statsResult.stats) {
            setStats(statsResult.stats)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedRestaurant])

  const fetchRestaurants = async () => {
    try {
      const result = await getRestaurants()
      if (result.success && result.data) {
        setRestaurants(result.data)
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error)
    }
  }

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const restaurantFilter = selectedRestaurant === 'all' || !selectedRestaurant ? undefined : selectedRestaurant
      const [statsResult, newResult, todayResult, upcomingResult] = await Promise.all([
        getDashboardStats(restaurantFilter),
        getNewReservations(restaurantFilter),
        getTodayReservations(restaurantFilter),
        getUpcomingReservations(restaurantFilter),
      ])

      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats)
      }

      if (newResult.success && newResult.data) {
        setNewReservations(newResult.data)
      }

      if (todayResult.success && todayResult.data) {
        setTodayReservations(todayResult.data)
      }

      if (upcomingResult.success && upcomingResult.data) {
        setUpcomingReservations(upcomingResult.data)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleStatusChange = () => {
    fetchDashboardData()
  }

  const handleRestaurantChange = (value: string) => {
    setSelectedRestaurant(value)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
  }

  // Filter reservations based on status
  const getFilteredReservations = (reservations: any[]) => {
    if (statusFilter === "all") return reservations
    return reservations.filter(reservation => reservation.status === statusFilter)
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">{getTranslation("manage.common.loadingDashboard")}</p>
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
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-6">
              <h1 className="text-xl md:text-2xl font-semibold">{getTranslation("manage.dashboard.title")}</h1>
              
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={() => router.push('/manage/reservations?action=new')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  + Add
                </Button>
                <div className="w-full sm:min-w-[200px]">
                  <Select value={selectedRestaurant} onValueChange={handleRestaurantChange}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={getTranslation("manage.dashboard.filter.allRestaurants")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{getTranslation("manage.dashboard.filter.allRestaurants")}</SelectItem>
                      {restaurants.map((restaurant) => (
                        <SelectItem key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
              <Card className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "all" ? "ring-2 ring-blue-500" : ""}`} onClick={() => handleStatusFilter("all")}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-muted-foreground">{getTranslation("manage.dashboard.stats.total")}</p>
                      <p className="text-2xl md:text-3xl font-bold">{stats.total}</p>
                    </div>
                    <div className="rounded-full bg-blue-100 p-2 md:p-3 text-blue-600">
                      <CalendarClock className="h-4 w-4 md:h-6 md:w-6" />
                    </div>
                  </div>
                  <div className="mt-2 md:mt-4 flex items-center text-xs md:text-sm">
                    <TrendingUp
                      className={`mr-1 h-3 w-3 md:h-4 md:w-4 ${stats.percentChange >= 0 ? "text-green-500" : "text-red-500"}`}
                    />
                    <span className={stats.percentChange >= 0 ? "text-green-500" : "text-red-500"}>
                      {getTranslation("manage.dashboard.stats.percentChange", { percent: String(stats.percentChange) })}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "pending" ? "ring-2 ring-yellow-500" : ""}`} onClick={() => handleStatusFilter("pending")}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-muted-foreground">{getTranslation("manage.dashboard.stats.pending")}</p>
                      <p className="text-2xl md:text-3xl font-bold">{stats.pending}</p>
                    </div>
                    <div className="rounded-full bg-yellow-100 p-2 md:p-3 text-yellow-600">
                      <Clock className="h-4 w-4 md:h-6 md:w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "confirmed" ? "ring-2 ring-green-500" : ""}`} onClick={() => handleStatusFilter("confirmed")}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-muted-foreground">{getTranslation("manage.dashboard.stats.confirmed")}</p>
                      <p className="text-2xl md:text-3xl font-bold">{stats.confirmed}</p>
                    </div>
                    <div className="rounded-full bg-green-100 p-2 md:p-3 text-green-600">
                      <CheckCircle className="h-4 w-4 md:h-6 md:w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "cancelled" ? "ring-2 ring-red-500" : ""}`} onClick={() => handleStatusFilter("cancelled")}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-muted-foreground">{getTranslation("manage.dashboard.stats.cancelled")}</p>
                      <p className="text-2xl md:text-3xl font-bold">{stats.cancelled}</p>
                    </div>
                    <div className="rounded-full bg-red-100 p-2 md:p-3 text-red-600">
                      <XCircle className="h-4 w-4 md:h-6 md:w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="new" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:flex">
                <TabsTrigger value="new" className="text-xs sm:text-sm">{getTranslation("manage.dashboard.tabs.new")}</TabsTrigger>
                <TabsTrigger value="today" className="text-xs sm:text-sm">{getTranslation("manage.dashboard.tabs.today")}</TabsTrigger>
                <TabsTrigger value="upcoming" className="text-xs sm:text-sm">{getTranslation("manage.dashboard.tabs.upcoming")}</TabsTrigger>
              </TabsList>
              <TabsContent value="new" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{getTranslation("manage.dashboard.new.cardTitle")}</CardTitle>
                    <CardDescription>
                      {getTranslation("manage.dashboard.new.cardDescription", { count: String(getFilteredReservations(newReservations).length) })}
                      {statusFilter !== "all" && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Filtered by: {statusFilter}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ReservationList reservations={getFilteredReservations(newReservations)} onStatusChange={handleStatusChange} itemsPerPage={10} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="today" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{getTranslation("manage.dashboard.today.cardTitle")}</CardTitle>
                    <CardDescription>
                      {getTranslation("manage.dashboard.today.cardDescription", { count: String(getFilteredReservations(todayReservations).length) })}
                      {statusFilter !== "all" && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Filtered by: {statusFilter}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ReservationList reservations={getFilteredReservations(todayReservations)} onStatusChange={handleStatusChange} itemsPerPage={10} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="upcoming" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{getTranslation("manage.dashboard.upcoming.cardTitle")}</CardTitle>
                    <CardDescription>
                      {getTranslation("manage.dashboard.upcoming.cardDescription", { count: String(getFilteredReservations(upcomingReservations).length) })}
                      {statusFilter !== "all" && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Filtered by: {statusFilter}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ReservationList reservations={getFilteredReservations(upcomingReservations)} onStatusChange={handleStatusChange} itemsPerPage={10} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <Button onClick={fetchDashboardData} variant="outline">
                {getTranslation("manage.common.refreshData")}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
