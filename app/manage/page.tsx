"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarClock, Clock, CheckCircle, XCircle, TrendingUp, Users, UtensilsCrossed, MapPin, ChevronDown, ChevronUp, Calendar } from "lucide-react"
import { getDashboardStats, getTodayReservations, getUpcomingReservations, getNewReservations } from "./dashboard-actions"
import { getRestaurants } from "./actions"
import { ReservationList } from "@/components/manage/reservation-list"
import { ManageHeader } from "@/components/manage/manage-header"
import { ManageSidebar } from "@/components/manage/manage-sidebar"
import { useLanguage } from "@/context/language-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TriangleLoader } from "@/components/ui/triangle-loader"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"

export default function ManageDashboard() {
  const { getTranslation } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [isStatsLoading, setIsStatsLoading] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    percentChange: 0,
    totalKuver: 0,
    totalMealReservations: 0,
    deckKuvers: 0,
    terraceKuvers: 0,
  })
  const [newReservations, setNewReservations] = useState<any[]>([])
  const [todayReservations, setTodayReservations] = useState<any[]>([])
  const [upcomingReservations, setUpcomingReservations] = useState<any[]>([])
  const [selectedDateReservations, setSelectedDateReservations] = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<string>("new")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [cardsExpanded, setCardsExpanded] = useState(false)
  const [user, setUser] = useState({ email: "", name: "Admin User" })
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const isInitialMount = useRef(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setUser({
          email: data.session.user.email || "",
          name: data.session.user.user_metadata?.full_name || "Admin User",
        })
        try {
          const res = await fetch('/api/me/role', { cache: 'no-store' })
          const json = await res.json()
          setIsSuperAdmin(Boolean(json?.isSuperAdmin))
        } catch {}
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

  // Fetch stats when restaurant filter or date changes
  useEffect(() => {
    const fetchStatsOnly = async () => {
      setIsStatsLoading(true)
      const restaurantFilter = selectedRestaurant === "all" || !selectedRestaurant ? undefined : selectedRestaurant
      const dateFilter = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined
      
      const [statsResult, todayResult] = await Promise.all([
        getDashboardStats(restaurantFilter, dateFilter),
        getTodayReservations(restaurantFilter, dateFilter)
      ])
      
      if (statsResult.success && statsResult.stats) {
         setStats({
           total: statsResult.stats.total,
           pending: statsResult.stats.pending,
           confirmed: statsResult.stats.confirmed,
           cancelled: statsResult.stats.cancelled,
           percentChange: statsResult.stats.percentChange,
           totalKuver: statsResult.stats.totalKuver,
           totalMealReservations: statsResult.stats.totalMealReservations,
           deckKuvers: statsResult.stats.deckKuvers,
           terraceKuvers: statsResult.stats.terraceKuvers,
         })
       }
       
       // Update reservations based on date selection
       if (todayResult.success && todayResult.data) {
         setTodayReservations(todayResult.data)
         if (selectedDate) {
           setSelectedDateReservations(todayResult.data)
         }
       }
       
       // Clear selected date reservations if no date is selected
       if (!selectedDate) {
         setSelectedDateReservations([])
       }
       
      setIsStatsLoading(false)
    }

    if (isInitialMount.current) {
      isInitialMount.current = false
    } else {
      if (restaurants.length > 0) {
        fetchStatsOnly()
      }
    }
  }, [selectedRestaurant, selectedDate])

  // Handle tab switching when date is cleared
  useEffect(() => {
    if (!selectedDate && activeTab === "selected-date") {
      setActiveTab("new")
    }
  }, [selectedDate, activeTab])

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
          const restaurantFilter = selectedRestaurant === 'all' ? undefined : selectedRestaurant
          const dateFilter = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined
          const statsResult = await getDashboardStats(restaurantFilter, dateFilter)
          if (statsResult.success && statsResult.stats) {
            setStats({
              total: statsResult.stats.total,
              pending: statsResult.stats.pending,
              confirmed: statsResult.stats.confirmed,
              cancelled: statsResult.stats.cancelled,
              percentChange: statsResult.stats.percentChange,
              totalKuver: statsResult.stats.totalKuver,
              totalMealReservations: statsResult.stats.totalMealReservations,
              deckKuvers: statsResult.stats.deckKuvers,
              terraceKuvers: statsResult.stats.terraceKuvers,
            })
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
        // Keep default "all" filter for all admin users
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error)
    }
  }

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const restaurantFilter = selectedRestaurant === 'all' || !selectedRestaurant ? undefined : selectedRestaurant
      const dateFilter = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined
      
      const [statsResult, newResult, todayResult, upcomingResult] = await Promise.all([
        getDashboardStats(restaurantFilter, dateFilter),
        getNewReservations(restaurantFilter),
        getTodayReservations(restaurantFilter, dateFilter),
        getUpcomingReservations(restaurantFilter, dateFilter),
      ])
      
      if (statsResult.success && statsResult.stats) {
        setStats({
          total: statsResult.stats.total,
          pending: statsResult.stats.pending,
          confirmed: statsResult.stats.confirmed,
          cancelled: statsResult.stats.cancelled,
          percentChange: statsResult.stats.percentChange,
          totalKuver: statsResult.stats.totalKuver,
          totalMealReservations: statsResult.stats.totalMealReservations,
          deckKuvers: statsResult.stats.deckKuvers,
          terraceKuvers: statsResult.stats.terraceKuvers,
        })
      }

      if (newResult.success && newResult.data) {
        setNewReservations(newResult.data)
      }

      if (todayResult.success && todayResult.data) {
        setTodayReservations(todayResult.data)
        // If a date is selected, use today's result for selected date reservations
        if (selectedDate) {
          setSelectedDateReservations(todayResult.data)
        }
      }

      if (upcomingResult.success && upcomingResult.data) {
        setUpcomingReservations(upcomingResult.data)
      }
      
      // Clear selected date reservations if no date is selected
      if (!selectedDate) {
        setSelectedDateReservations([])
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

  // Filter reservations based on status and restaurant
  const getFilteredReservations = (reservations: any[]) => {
    let filtered = reservations
    if (selectedRestaurant !== "all") {
      filtered = filtered.filter(r => r.restaurant_id === selectedRestaurant)
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(reservation => reservation.status === statusFilter)
    }
    return filtered
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">{getTranslation("manage.common.loadingDashboard")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 bg-gray-100">
      <ManageSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ManageHeader user={user} toggleSidebar={toggleSidebar} />

        <main className="flex-1 overflow-y-auto py-2 md:py-2">
          <div className="max-w-5xl lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-6">
              <h1 className="text-xl md:text-2xl font-semibold">{getTranslation("manage.dashboard.title")}</h1>
              
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={() => router.push('/manage/reservations?action=new')}
                  className="bg-black hover:bg-gray-800 text-white"
                  size="sm"
                >
                  + {getTranslation("manage.reservations.list.addReservation")}
                </Button>
                <div className="w-full sm:min-w-[200px]">
                  <Select value={selectedRestaurant} onValueChange={handleRestaurantChange}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={getTranslation("manage.dashboard.filter.allRestaurants")} />
                    </SelectTrigger>
                    <SelectContent>
                      {isSuperAdmin && (
                        <SelectItem value="all">{getTranslation("manage.dashboard.filter.allRestaurants")}</SelectItem>
                      )}
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

            <div className="mb-6">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 transition-all duration-300">
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
               
               {/* Additional Metrics Cards - Only show when expanded */}
               {cardsExpanded && (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-3 md:mt-4 transition-all duration-300">
                   <Card className="cursor-default transition-all hover:shadow-md">
                     <CardContent className="p-4 md:p-6">
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Kuver</p>
                           <p className="text-2xl md:text-3xl font-bold">{stats.totalKuver}</p>
                         </div>
                         <div className="rounded-full bg-purple-100 p-2 md:p-3 text-purple-600">
                           <Users className="h-4 w-4 md:h-6 md:w-6" />
                         </div>
                       </div>
                       <p className="text-xs text-muted-foreground mt-2">Customers served</p>
                     </CardContent>
                   </Card>

                   <Card className="cursor-default transition-all hover:shadow-md">
                     <CardContent className="p-4 md:p-6">
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="text-xs md:text-sm font-medium text-muted-foreground">Meal Reservations</p>
                           <p className="text-2xl md:text-3xl font-bold">{stats.totalMealReservations}</p>
                         </div>
                         <div className="rounded-full bg-orange-100 p-2 md:p-3 text-orange-600">
                           <UtensilsCrossed className="h-4 w-4 md:h-6 md:w-6" />
                         </div>
                       </div>
                       <p className="text-xs text-muted-foreground mt-2">Food reservations</p>
                     </CardContent>
                   </Card>

                   <Card className="cursor-default transition-all hover:shadow-md">
                     <CardContent className="p-4 md:p-6">
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="text-xs md:text-sm font-medium text-muted-foreground">Deck</p>
                           <p className="text-2xl md:text-3xl font-bold">{stats.deckKuvers}</p>
                         </div>
                         <div className="rounded-full bg-teal-100 p-2 md:p-3 text-teal-600">
                           <MapPin className="h-4 w-4 md:h-6 md:w-6" />
                         </div>
                       </div>
                       <p className="text-xs text-muted-foreground mt-2">Kuvers today</p>
                     </CardContent>
                   </Card>

                   <Card className="cursor-default transition-all hover:shadow-md">
                     <CardContent className="p-4 md:p-6">
                       <div className="flex items-center justify-between">
                         <div>
                           <p className="text-xs md:text-sm font-medium text-muted-foreground">Terrace</p>
                           <p className="text-2xl md:text-3xl font-bold">{stats.terraceKuvers}</p>
                         </div>
                         <div className="rounded-full bg-emerald-100 p-2 md:p-3 text-emerald-600">
                           <MapPin className="h-4 w-4 md:h-6 md:w-6" />
                         </div>
                       </div>
                       <p className="text-xs text-muted-foreground mt-2">Kuvers today</p>
                     </CardContent>
                   </Card>
                 </div>
               )}
               
               {/* Minimal expand/collapse indicator */}
               <div className="flex justify-center -mt-2">
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => setCardsExpanded(!cardsExpanded)}
                   className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                 >
                   {cardsExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                 </Button>
               </div>
            </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <TabsList className={`grid w-full ${selectedDate ? 'grid-cols-4' : 'grid-cols-4'} lg:w-auto lg:grid-cols-none lg:flex`}>
                    <TabsTrigger value="new" className="text-xs sm:text-sm">{getTranslation("manage.dashboard.tabs.new")}</TabsTrigger>
                    <TabsTrigger value="today" className="text-xs sm:text-sm">{getTranslation("manage.dashboard.tabs.today")}</TabsTrigger>
                    <TabsTrigger value="upcoming" className="text-xs sm:text-sm">{getTranslation("manage.dashboard.tabs.upcoming")}</TabsTrigger>
                    {selectedDate ? (
                      <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                        <PopoverTrigger asChild>
                          <TabsTrigger value="selected-date" className="text-xs sm:text-sm">
                            <Calendar className="mr-2 h-4 w-4" />
                            {format(selectedDate, 'MMM dd')} ({selectedDateReservations.length})
                          </TabsTrigger>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              setSelectedDate(date);
                              if (date) {
                                setActiveTab("selected-date");
                              }
                              setDatePopoverOpen(false);
                            }}
                            initialFocus
                          />
                          <div className="p-3 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDate(undefined);
                                setActiveTab("new");
                                setDatePopoverOpen(false);
                              }}
                              className="w-full"
                            >
                              {getTranslation("manage.dashboard.clearDate")}
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                        <PopoverTrigger asChild>
                          <TabsTrigger value="select-date" className="text-xs sm:text-sm">
                            <Calendar className="mr-2 h-4 w-4" />
                            {getTranslation("manage.dashboard.tabs.selectDate")}
                          </TabsTrigger>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              setSelectedDate(date);
                              if (date) {
                                setActiveTab("selected-date");
                              }
                              setDatePopoverOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </TabsList>
                </div>
              <div className="relative">
                {isStatsLoading && (
                  <div className="absolute inset-0 bg-gray-100/80 backdrop-blur-sm flex items-start justify-center z-10 rounded-lg pt-12">
                    <TriangleLoader />
                  </div>
                )}
                <TabsContent value="new" className="space-y-4">
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">{getTranslation("manage.dashboard.new.cardTitle")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getTranslation("manage.dashboard.new.cardDescription", { count: String(getFilteredReservations(newReservations).length) })}
                        {statusFilter !== "all" && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Filtered by: {statusFilter}
                          </span>
                        )}
                      </p>
                    </div>
                    <ReservationList reservations={getFilteredReservations(newReservations)} onStatusChange={handleStatusChange} itemsPerPage={10} />
                  </div>
                </TabsContent>
                <TabsContent value="today" className="space-y-4">
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">{getTranslation("manage.dashboard.today.cardTitle")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getTranslation("manage.dashboard.today.cardDescription", { count: String(getFilteredReservations(todayReservations).length) })}
                        {statusFilter !== "all" && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Filtered by: {statusFilter}
                          </span>
                        )}
                      </p>
                    </div>
                    <ReservationList reservations={getFilteredReservations(todayReservations)} onStatusChange={handleStatusChange} itemsPerPage={10} />
                  </div>
                </TabsContent>
                <TabsContent value="upcoming" className="space-y-4">
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">{getTranslation("manage.dashboard.upcoming.cardTitle")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getTranslation("manage.dashboard.upcoming.cardDescription", { count: String(getFilteredReservations(upcomingReservations).length) })}
                        {statusFilter !== "all" && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Filtered by: {statusFilter}
                          </span>
                        )}
                      </p>
                    </div>
                    <ReservationList reservations={getFilteredReservations(upcomingReservations)} onStatusChange={handleStatusChange} itemsPerPage={10} />
                  </div>
                </TabsContent>
                {selectedDate && (
                  <TabsContent value="selected-date" className="space-y-4">
                    <div>
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold">Reservations for {format(selectedDate, 'PPP')}</h3>
                        <p className="text-sm text-muted-foreground">
                          {getFilteredReservations(selectedDateReservations).length} reservations for the selected date
                          {statusFilter !== "all" && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              Filtered by: {statusFilter}
                            </span>
                          )}
                        </p>
                      </div>
                      <ReservationList reservations={getFilteredReservations(selectedDateReservations)} onStatusChange={handleStatusChange} itemsPerPage={10} />
                    </div>
                  </TabsContent>
                )}
              </div>
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
