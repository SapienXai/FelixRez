"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, User, LogOut, Bell, X } from "lucide-react"
import { LanguageSelector } from "@/components/language-selector"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { useLanguage } from "@/context/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ManageHeaderProps {
  user: {
    email: string
    name: string
  }
  toggleSidebar: () => void
}

interface Notification {
  id: string
  customer_name: string
  restaurant_name: string
  reservation_area_name?: string | null
  party_size: number
  reservation_time: string
  reservation_date: string
  created_at: string
  read: boolean
}

interface PopupNotification {
  id: string
  customer_name: string
  restaurant_name: string
  reservation_area_name?: string | null
  party_size: number
  reservation_time: string
  reservation_date: string
  created_at: string
}

export function ManageHeader({ user, toggleSidebar }: ManageHeaderProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { getTranslation, currentLang } = useLanguage()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [popupNotifications, setPopupNotifications] = useState<PopupNotification[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)


  useEffect(() => {
    // Initialize audio context
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    console.log('Setting up real-time subscription for reservations...')
    let lastCheckedTime = new Date().toISOString()
    let pollInterval: NodeJS.Timeout

    // Subscribe to real-time changes
    const channel = supabase
      .channel('reservations-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations'
        },
        async (payload) => {
          console.log('New reservation received via real-time:', payload)
          const newReservation = payload.new as any
          
          // Get complete reservation data with restaurant info using join query
          let restaurantName = 'Unknown Restaurant'
          
          try {
            const { data: reservationWithRestaurant, error } = await supabase
              .from('reservations')
              .select(`
                id,
                customer_name,
                party_size,
                reservation_time,
                reservation_date,
                created_at,
                restaurants(name),
                reservation_areas(name)
              `)
              .eq('id', newReservation.id)
              .single()
            
            if (error) {
              console.error('Error fetching reservation with restaurant:', JSON.stringify(error, null, 2))
              // Fallback: try direct restaurant fetch
              const { data: restaurant } = await supabase
                .from('restaurants')
                .select('name')
                .eq('id', newReservation.restaurant_id)
                .single()
              
              restaurantName = restaurant?.name || 'Unknown Restaurant'
            } else {
               restaurantName = (reservationWithRestaurant.restaurants as any)?.name
               
               // If restaurantName is still not found, try direct fetch
               if (!restaurantName) {
                 console.log('Restaurant not found via join, trying direct fetch for restaurant_id:', newReservation.restaurant_id)
                 const { data: restaurant } = await supabase
                   .from('restaurants')
                   .select('name')
                   .eq('id', newReservation.restaurant_id)
                   .single()
                 
                 restaurantName = restaurant?.name || 'Unknown Restaurant'
               }
             }
          } catch (fetchError) {
            console.error('Failed to fetch restaurant name:', fetchError)
            // Keep default 'Unknown Restaurant'
          }

          const notification: Notification = {
            id: newReservation.id,
            customer_name: newReservation.customer_name,
            restaurant_name: restaurantName,
            reservation_area_name: (reservationWithRestaurant as any)?.reservation_areas?.name || null,
            party_size: newReservation.party_size,
            reservation_time: newReservation.reservation_time,
            reservation_date: newReservation.reservation_date,
            created_at: newReservation.created_at,
            read: false
          }

          console.log('Adding notification:', notification)
          setNotifications(prev => [notification, ...prev])
          setUnreadCount(prev => prev + 1)
          
          // Create popup notification
          const popupNotification: PopupNotification = {
            id: newReservation.id,
            customer_name: newReservation.customer_name,
            restaurant_name: restaurantName,
            reservation_area_name: (reservationWithRestaurant as any)?.reservation_areas?.name || null,
            party_size: newReservation.party_size,
            reservation_time: newReservation.reservation_time,
            reservation_date: newReservation.reservation_date,
            created_at: newReservation.created_at
          }
          
          setPopupNotifications(prev => [...prev, popupNotification])
          playNotificationSound()
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        
        // If real-time subscription fails, fall back to polling
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.log('Real-time subscription failed, falling back to polling...')
          
          // Poll for new reservations every 10 seconds
          pollInterval = setInterval(async () => {
            try {
              const { data: newReservations } = await supabase
                .from('reservations')
                .select(`
                  *,
                  restaurants(name),
                  reservation_areas(name)
                `)
                .gte('created_at', lastCheckedTime)
                .order('created_at', { ascending: false })
              
              if (newReservations && newReservations.length > 0) {
                console.log('Found new reservations via polling:', newReservations)
                
                newReservations.forEach((reservation: any) => {
                  const restaurantName = reservation.restaurants?.name || 'Unknown Restaurant';

                  const notification: Notification = {
                    id: reservation.id,
                    customer_name: reservation.customer_name,
                    restaurant_name: restaurantName,
                    reservation_area_name: (reservation as any)?.reservation_areas?.name || null,
                    party_size: reservation.party_size,
                    reservation_time: reservation.reservation_time,
                    reservation_date: reservation.reservation_date,
                    created_at: reservation.created_at,
                    read: false
                  }
                  
                  setNotifications(prev => {
                    // Avoid duplicates
                    if (prev.some(n => n.id === notification.id)) return prev
                    return [notification, ...prev]
                  })
                  setUnreadCount(prev => prev + 1)
                  
                  // Create popup notification
                  const popupNotification: PopupNotification = {
                    id: reservation.id,
                    customer_name: reservation.customer_name,
                    restaurant_name: restaurantName,
                    reservation_area_name: (reservation as any)?.reservation_areas?.name || null,
                    party_size: reservation.party_size,
                    reservation_time: reservation.reservation_time,
                    reservation_date: reservation.reservation_date,
                    created_at: reservation.created_at
                  }
                  
                  setPopupNotifications(prev => {
                    // Avoid duplicates
                    if (prev.some(p => p.id === popupNotification.id)) return prev
                    return [...prev, popupNotification]
                  })
                  playNotificationSound()
                })
                
                lastCheckedTime = new Date().toISOString()
              }
            } catch (error) {
              console.error('Error polling for new reservations:', error)
            }
          }, 10000) // Poll every 10 seconds
        }
      })

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      channel.unsubscribe()
      document.removeEventListener('mousedown', handleClickOutside)
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [supabase])

  const playNotificationSound = () => {
    if (audioContextRef.current) {
      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)
      
      oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime)
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5)
      
      oscillator.start(audioContextRef.current.currentTime)
      oscillator.stop(audioContextRef.current.currentTime + 0.5)
    }
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== notificationId))
    setUnreadCount(prev => {
      const notification = notifications.find(n => n.id === notificationId)
      return notification && !notification.read ? Math.max(0, prev - 1) : prev
    })
  }

  const closePopupNotification = (notificationId: string) => {
    setPopupNotifications(prev => prev.filter(popup => popup.id !== notificationId))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    try {
      await fetch("/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "SIGNED_OUT", session: null }),
      })
    } catch {}
    router.replace("/manage/login")
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <Link href="/manage" className="flex items-center">
            <span className="text-xl font-bold">Felix Management</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSelector />


          <div className="relative" ref={dropdownRef}>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 z-50">
                <Card className="shadow-lg border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {getTranslation('manage.notifications.title')}
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {unreadCount}
                          </Badge>
                        )}
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => setShowNotifications(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          {getTranslation('manage.notifications.noNotifications')}
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b border-border hover:bg-muted/50 cursor-pointer ${
                              !notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                            }`}
                            onClick={() => {
                              markAsRead(notification.id)
                              setSelectedNotification(notification)
                              setShowConfirmDialog(true)
                              setShowNotifications(false)
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {notification.customer_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {notification.restaurant_name}
                                  {notification.reservation_area_name ? ` • ${notification.reservation_area_name}` : ''} • {getTranslation('manage.notifications.party')} {notification.party_size} • {notification.reservation_time}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(notification.reservation_date).toLocaleDateString()}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  dismissNotification(notification.id)
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Sign out</span>
          </Button>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getTranslation('manage.notifications.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {selectedNotification && (
                <div className="space-y-2">
                  <p><strong>{getTranslation('manage.notifications.customer')}:</strong> {selectedNotification.customer_name}</p>
                  <p><strong>{getTranslation('manage.notifications.restaurant')}:</strong> {selectedNotification.restaurant_name}{selectedNotification.reservation_area_name ? ` • ${selectedNotification.reservation_area_name}` : ''}</p>
                  <p><strong>{getTranslation('manage.notifications.party')}:</strong> {selectedNotification.party_size}</p>
                  <p><strong>{getTranslation('manage.notifications.time')}:</strong> {selectedNotification.reservation_time}</p>
                   <p><strong>{getTranslation('manage.notifications.date')}:</strong> {new Date(selectedNotification.reservation_date).toLocaleDateString()}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              {getTranslation('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Popup Notifications */}
      {popupNotifications.map((popup, index) => (
        <div
          key={popup.id}
          className="fixed top-4 right-4 z-[9999] w-80 animate-in slide-in-from-right-full duration-300"
          style={{ transform: `translateY(${index * 100}px)` }}
        >
          <Card className="shadow-lg border-2 border-blue-500 bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-blue-600">
                  {getTranslation('manage.notifications.newReservation')}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => closePopupNotification(popup.id)}
                  className="h-6 w-6 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    {getTranslation('manage.notifications.customer')}:
                  </span>
                  <span className="text-sm font-semibold">{popup.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    {getTranslation('manage.notifications.restaurant')}:
                  </span>
                  <span className="text-sm">{popup.restaurant_name}{popup.reservation_area_name ? ` • ${popup.reservation_area_name}` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    {getTranslation('manage.notifications.party')}:
                  </span>
                  <span className="text-sm">{popup.party_size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    {getTranslation('manage.notifications.time')}:
                  </span>
                  <span className="text-sm">{popup.reservation_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    {getTranslation('manage.notifications.date')}:
                  </span>
                  <span className="text-sm">
                    {new Date(popup.reservation_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t">
                <Button
                  onClick={() => closePopupNotification(popup.id)}
                  className="w-full"
                  size="sm"
                >
                  {getTranslation('common.close')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </header>
  )
}
