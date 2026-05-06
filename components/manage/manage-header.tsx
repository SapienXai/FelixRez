"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Bell, BellRing, CalendarDays, CheckCheck, Clock, LogOut, MapPin, Menu, Sparkles, Trash2, Users, X } from "lucide-react"
import { LanguageSelector } from "@/components/language-selector"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useState, useEffect, useMemo, useRef } from "react"
import { useLanguage } from "@/context/language-context"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface ManageHeaderProps {
  user: {
    email: string
    name: string
  }
  toggleSidebar: () => void
}

interface Notification {
  id: string
  reservation_id: string
  event_type: "created" | "updated"
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
  reservation_id: string
  event_type: "created" | "updated"
  customer_name: string
  restaurant_name: string
  reservation_area_name?: string | null
  party_size: number
  reservation_time: string
  reservation_date: string
  created_at: string
}

const READ_NOTIFICATIONS_STORAGE_KEY = "felix-read-notifications"
const DISMISSED_NOTIFICATIONS_STORAGE_KEY = "felix-dismissed-notifications"

type PushStatus = "checking" | "unsupported" | "unconfigured" | "denied" | "unsubscribed" | "subscribed" | "loading"

function readStoredIds(key: string) {
  if (typeof window === "undefined") {
    return new Set<string>()
  }

  try {
    const raw = window.localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [])
  } catch {
    return new Set<string>()
  }
}

function storeIds(key: string, ids: Set<string>) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(Array.from(ids).slice(-200)))
}

function clearSupabaseAuthStorage() {
  if (typeof window === "undefined") {
    return
  }

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index)
    if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
      window.localStorage.removeItem(key)
    }
  }

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index)
    if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
      window.sessionStorage.removeItem(key)
    }
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

function getNotificationId(reservation: any, eventType: "created" | "updated") {
  const timestamp = eventType === "updated" ? reservation.updated_at || new Date().toISOString() : reservation.created_at
  return `${reservation.id}-${eventType}-${timestamp}`
}

export function ManageHeader({ toggleSidebar }: ManageHeaderProps) {
  const supabase = getSupabaseBrowserClient()
  const { getTranslation } = useLanguage()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [popupNotifications, setPopupNotifications] = useState<PopupNotification[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const readNotificationIdsRef = useRef<Set<string>>(new Set())
  const dismissedNotificationIdsRef = useRef<Set<string>>(new Set())
  const knownNotificationIdsRef = useRef<Set<string>>(new Set())
  const [pushStatus, setPushStatus] = useState<PushStatus>("checking")

  const unreadCount = useMemo(
    () => notifications.reduce((count, notification) => count + (notification.read ? 0 : 1), 0),
    [notifications]
  )

  const unreadLabel = unreadCount > 9 ? "9+" : String(unreadCount)

  useEffect(() => {
    if (typeof window === "undefined") return

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushStatus("unsupported")
      return
    }

    if (Notification.permission === "denied") {
      setPushStatus("denied")
      return
    }

    fetch("/api/push-notifications/public-key")
      .then(async (response) => {
        if (!response.ok) {
          setPushStatus("unconfigured")
          return null
        }

        return navigator.serviceWorker.register("/sw.js")
      })
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => {
        if (subscription === undefined) {
          return
        }

        setPushStatus(subscription ? "subscribed" : "unsubscribed")
      })
      .catch((error) => {
        console.error("Failed to initialize push notifications:", error)
        setPushStatus("unsupported")
      })
  }, [])

  const enablePushNotifications = async () => {
    if (pushStatus === "loading") {
      return
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushStatus("unsupported")
      return
    }

    setPushStatus("loading")

    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setPushStatus(permission === "denied" ? "denied" : "unsubscribed")
        return
      }

      const keyResponse = await fetch("/api/push-notifications/public-key")
      const keyPayload = await keyResponse.json()
      if (!keyResponse.ok || !keyPayload.publicKey) {
        setPushStatus("unconfigured")
        return
      }

      const registration = await navigator.serviceWorker.register("/sw.js")
      const existingSubscription = await registration.pushManager.getSubscription()
      const subscription = existingSubscription || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyPayload.publicKey),
      })

      const saveResponse = await fetch("/api/push-notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      })

      if (!saveResponse.ok) {
        throw new Error("Failed to save push subscription")
      }

      setPushStatus("subscribed")
    } catch (error) {
      console.error("Failed to enable push notifications:", error)
      setPushStatus("unsubscribed")
    }
  }


  useEffect(() => {
    readNotificationIdsRef.current = readStoredIds(READ_NOTIFICATIONS_STORAGE_KEY)
    dismissedNotificationIdsRef.current = readStoredIds(DISMISSED_NOTIFICATIONS_STORAGE_KEY)

    // Initialize audio context
    if (typeof window !== 'undefined') {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch {
        audioContextRef.current = null
      }
    }

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
          const newReservation = payload.new as any
          
          // Get complete reservation data with restaurant info using join query
          let restaurantName = 'Unknown Restaurant'
          let areaName: string | null = null
          
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
                updated_at,
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
               areaName = (reservationWithRestaurant as any)?.reservation_areas?.name || null
               
               // If restaurantName is still not found, try direct fetch
               if (!restaurantName) {
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
            id: getNotificationId(newReservation, "created"),
            reservation_id: newReservation.id,
            event_type: "created",
            customer_name: newReservation.customer_name,
            restaurant_name: restaurantName,
            reservation_area_name: areaName,
            party_size: newReservation.party_size,
            reservation_time: newReservation.reservation_time,
            reservation_date: newReservation.reservation_date,
            created_at: newReservation.created_at,
            read: readNotificationIdsRef.current.has(newReservation.id)
          }

          if (dismissedNotificationIdsRef.current.has(notification.id)) {
            return
          }
          if (knownNotificationIdsRef.current.has(notification.id)) {
            return
          }

          knownNotificationIdsRef.current.add(notification.id)
          setNotifications(prev => {
            return [notification, ...prev]
          })
          
          // Create popup notification
          const popupNotification: PopupNotification = {
            id: notification.id,
            reservation_id: newReservation.id,
            event_type: "created",
            customer_name: newReservation.customer_name,
            restaurant_name: restaurantName,
            reservation_area_name: areaName,
            party_size: newReservation.party_size,
            reservation_time: newReservation.reservation_time,
            reservation_date: newReservation.reservation_date,
            created_at: newReservation.created_at
          }
          
          if (!notification.read) {
            setPopupNotifications(prev => {
              if (prev.some(item => item.id === popupNotification.id)) return prev
              return [...prev, popupNotification]
            })
            playNotificationSound()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservations'
        },
        async (payload) => {
          const updatedReservation = payload.new as any

          let restaurantName = 'Unknown Restaurant'
          let areaName: string | null = null

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
                updated_at,
                restaurants(name),
                reservation_areas(name)
              `)
              .eq('id', updatedReservation.id)
              .single()

            if (error) {
              console.error('Error fetching updated reservation with restaurant:', JSON.stringify(error, null, 2))
              const { data: restaurant } = await supabase
                .from('restaurants')
                .select('name')
                .eq('id', updatedReservation.restaurant_id)
                .single()

              restaurantName = restaurant?.name || 'Unknown Restaurant'
            } else {
              restaurantName = (reservationWithRestaurant.restaurants as any)?.name || 'Unknown Restaurant'
              areaName = (reservationWithRestaurant as any)?.reservation_areas?.name || null
            }
          } catch (fetchError) {
            console.error('Failed to fetch updated reservation name:', fetchError)
          }

          const notification: Notification = {
            id: getNotificationId(updatedReservation, "updated"),
            reservation_id: updatedReservation.id,
            event_type: "updated",
            customer_name: updatedReservation.customer_name,
            restaurant_name: restaurantName,
            reservation_area_name: areaName,
            party_size: updatedReservation.party_size,
            reservation_time: updatedReservation.reservation_time,
            reservation_date: updatedReservation.reservation_date,
            created_at: updatedReservation.updated_at || new Date().toISOString(),
            read: readNotificationIdsRef.current.has(getNotificationId(updatedReservation, "updated"))
          }

          if (dismissedNotificationIdsRef.current.has(notification.id)) {
            return
          }
          if (knownNotificationIdsRef.current.has(notification.id)) {
            return
          }

          knownNotificationIdsRef.current.add(notification.id)
          setNotifications(prev => [notification, ...prev])

          const popupNotification: PopupNotification = {
            id: notification.id,
            reservation_id: updatedReservation.id,
            event_type: "updated",
            customer_name: updatedReservation.customer_name,
            restaurant_name: restaurantName,
            reservation_area_name: areaName,
            party_size: updatedReservation.party_size,
            reservation_time: updatedReservation.reservation_time,
            reservation_date: updatedReservation.reservation_date,
            created_at: updatedReservation.updated_at || new Date().toISOString()
          }

          if (!notification.read) {
            setPopupNotifications(prev => {
              if (prev.some(item => item.id === popupNotification.id)) return prev
              return [...prev, popupNotification]
            })
            playNotificationSound()
          }
        }
      )
      .subscribe((status) => {
        // If real-time subscription fails, fall back to polling
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
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
                newReservations.forEach((reservation: any) => {
                  const restaurantName = reservation.restaurants?.name || 'Unknown Restaurant';
                  const isRead = readNotificationIdsRef.current.has(reservation.id)

                  const notification: Notification = {
                    id: getNotificationId(reservation, "created"),
                    reservation_id: reservation.id,
                    event_type: "created",
                    customer_name: reservation.customer_name,
                    restaurant_name: restaurantName,
                    reservation_area_name: (reservation as any)?.reservation_areas?.name || null,
                    party_size: reservation.party_size,
                    reservation_time: reservation.reservation_time,
                    reservation_date: reservation.reservation_date,
                    created_at: reservation.created_at,
                    read: isRead
                  }

                  if (dismissedNotificationIdsRef.current.has(notification.id)) {
                    return
                  }
                  if (knownNotificationIdsRef.current.has(notification.id)) {
                    return
                  }
                  
                  knownNotificationIdsRef.current.add(notification.id)
                  setNotifications(prev => {
                    return [notification, ...prev]
                  })
                  
                  // Create popup notification
                  const popupNotification: PopupNotification = {
                    id: notification.id,
                    reservation_id: reservation.id,
                    event_type: "created",
                    customer_name: reservation.customer_name,
                    restaurant_name: restaurantName,
                    reservation_area_name: (reservation as any)?.reservation_areas?.name || null,
                    party_size: reservation.party_size,
                    reservation_time: reservation.reservation_time,
                    reservation_date: reservation.reservation_date,
                    created_at: reservation.created_at
                  }
                  
                  if (!isRead) {
                    setPopupNotifications(prev => {
                      // Avoid duplicates
                      if (prev.some(p => p.id === popupNotification.id)) return prev
                      return [...prev, popupNotification]
                    })
                    playNotificationSound()
                  }
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
    readNotificationIdsRef.current.add(notificationId)
    storeIds(READ_NOTIFICATIONS_STORAGE_KEY, readNotificationIdsRef.current)
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => {
      const next = prev.map(notification => {
        readNotificationIdsRef.current.add(notification.id)
        return { ...notification, read: true }
      })

      storeIds(READ_NOTIFICATIONS_STORAGE_KEY, readNotificationIdsRef.current)
      return next
    })
  }

  const dismissNotification = (notificationId: string) => {
    dismissedNotificationIdsRef.current.add(notificationId)
    storeIds(DISMISSED_NOTIFICATIONS_STORAGE_KEY, dismissedNotificationIdsRef.current)
    setNotifications(prev => prev.filter(notification => notification.id !== notificationId))
  }

  const closePopupNotification = (notificationId: string) => {
    setPopupNotifications(prev => prev.filter(popup => popup.id !== notificationId))
  }

  const formatReservationDate = (date: string) => {
    return new Date(date).toLocaleDateString(getTranslation("common.locale") || "tr-TR", {
      day: "numeric",
      month: "short",
      weekday: "short",
    })
  }

  const formatCreatedTime = (date: string) => {
    return new Date(date).toLocaleTimeString(getTranslation("common.locale") || "tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleSignOut = async () => {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)

    try {
      const { error } = await supabase.auth.signOut({ scope: "local" })
      if (error) {
        console.warn("Supabase sign out failed:", error)
      }
    } catch (error) {
      console.warn("Supabase sign out failed:", error)
    }

    clearSupabaseAuthStorage()

    try {
      await fetch("/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "SIGNED_OUT", session: null }),
      })
    } catch (error) {
      console.warn("Failed to clear auth cookie:", error)
    }

    window.location.replace("/manage/login?logged_out=1")
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
            <span className="text-xl font-bold">Felix</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSelector />

          {pushStatus !== "subscribed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={enablePushNotifications}
              disabled={pushStatus === "loading" || pushStatus === "unsupported" || pushStatus === "unconfigured" || pushStatus === "denied"}
              title={
                pushStatus === "unsupported"
                  ? getTranslation('manage.notifications.pushUnsupported')
                  : pushStatus === "unconfigured"
                    ? getTranslation('manage.notifications.pushUnconfigured')
                  : pushStatus === "denied"
                    ? getTranslation('manage.notifications.pushBlocked')
                    : getTranslation('manage.notifications.pushEnable')
              }
              className="h-9 rounded-full border-slate-200 px-3 text-xs"
            >
              <BellRing className={cn("h-4 w-4 sm:mr-1.5", pushStatus === "loading" && "animate-pulse")} />
              <span className="hidden sm:inline">
                {pushStatus === "loading"
                  ? getTranslation('common.loading')
                  : getTranslation('manage.notifications.pushEnable')}
              </span>
            </Button>
          )}

          <div className="relative" ref={dropdownRef}>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
              className={cn(
                "relative rounded-full border border-transparent transition-all",
                showNotifications
                  ? "border-slate-200 bg-slate-950 text-white hover:bg-slate-900 hover:text-white"
                  : "hover:border-slate-200 hover:bg-slate-100"
              )}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                  {unreadLabel}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>

            {showNotifications && (
              <div className="fixed inset-x-3 top-[4.5rem] z-50 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[min(calc(100vw-1.5rem),26rem)]">
                <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-xl">
                  <div className="relative overflow-hidden border-b border-slate-200 bg-slate-950 px-4 py-4 text-white">
                    <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-cyan-400/25 blur-2xl" />
                    <div className="absolute -bottom-12 left-12 h-24 w-24 rounded-full bg-amber-300/20 blur-2xl" />
                    <div className="relative flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
                          <Sparkles className="h-3 w-3" />
                          Live
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <h2 className="text-base font-semibold tracking-tight">
                            {getTranslation('manage.notifications.title')}
                          </h2>
                          {unreadCount > 0 ? (
                            <Badge className="rounded-full bg-white text-slate-950 hover:bg-white">
                              {unreadLabel}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-white/60">
                          {unreadCount > 0
                            ? getTranslation('manage.notifications.unreadSummary', { count: String(unreadCount) })
                            : getTranslation('manage.notifications.noNotifications')}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                        onClick={() => setShowNotifications(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="text-xs font-medium text-slate-500">
                        {notifications.length} {getTranslation('manage.notifications.total')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                        className="h-7 rounded-full px-2 text-xs text-slate-600 hover:bg-white hover:text-slate-950 disabled:opacity-40"
                      >
                        <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                        {getTranslation('manage.notifications.markAllRead')}
                      </Button>
                    </div>
                    <div className="max-h-[calc(100vh-12rem)] overflow-y-auto bg-white sm:max-h-[24rem]">
                      {notifications.length === 0 ? (
                        <div className="px-6 py-10 text-center">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <Bell className="h-5 w-5" />
                          </div>
                          <p className="mt-3 text-sm font-medium text-slate-700">
                            {getTranslation('manage.notifications.noNotifications')}
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={cn(
                              "group border-b border-slate-100 p-3 transition-colors last:border-b-0",
                              notification.read
                                ? "bg-white hover:bg-slate-50"
                                : "bg-[linear-gradient(90deg,rgba(14,165,233,0.12),rgba(255,255,255,0))] hover:bg-sky-50/70"
                            )}
                            onClick={() => {
                              markAsRead(notification.id)
                              setSelectedNotification({ ...notification, read: true })
                              setShowConfirmDialog(true)
                              setShowNotifications(false)
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                                notification.read
                                  ? "border-slate-200 bg-slate-50 text-slate-500"
                                  : "border-sky-200 bg-sky-100 text-sky-700"
                              )}>
                                <CalendarDays className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="truncate text-sm font-semibold text-slate-950">
                                        {notification.customer_name}
                                      </p>
                                      {!notification.read ? (
                                        <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.12)]" />
                                      ) : null}
                                    </div>
                                    <p className="mt-0.5 truncate text-xs font-medium text-slate-600">
                                      {notification.restaurant_name}
                                      {notification.reservation_area_name ? ` • ${notification.reservation_area_name}` : ''}
                                    </p>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                    {formatCreatedTime(notification.created_at)}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                                    <Users className="h-3 w-3" />
                                    {notification.party_size}
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                                    <Clock className="h-3 w-3" />
                                    {notification.reservation_time.slice(0, 5)}
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                                    <MapPin className="h-3 w-3" />
                                    {formatReservationDate(notification.reservation_date)}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-full text-slate-400 opacity-100 hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  dismissNotification(notification.id)
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out" disabled={isSigningOut}>
            {isSigningOut ? <Clock className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
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
          className="fixed right-4 top-4 z-[9999] w-[min(calc(100vw-2rem),22rem)] animate-in slide-in-from-right-full fade-in-0 duration-300"
          style={{ transform: `translateY(${index * 126}px)` }}
        >
          <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.22)]">
            <div className="bg-slate-950 px-4 py-3 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100">
                    <Bell className="h-3 w-3" />
                    {popup.event_type === "updated"
                      ? getTranslation('manage.notifications.updatedReservation')
                      : getTranslation('manage.notifications.newReservation')}
                  </div>
                  <p className="mt-2 text-sm font-semibold">{popup.customer_name}</p>
                  <p className="text-xs text-white/60">
                    {popup.restaurant_name}{popup.reservation_area_name ? ` • ${popup.reservation_area_name}` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => closePopupNotification(popup.id)}
                  className="h-8 w-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardContent className="space-y-3 p-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-slate-50 p-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {getTranslation('manage.notifications.party')}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">{popup.party_size}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {getTranslation('manage.notifications.time')}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">{popup.reservation_time.slice(0, 5)}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-2">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {getTranslation('manage.notifications.date')}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">{formatReservationDate(popup.reservation_date)}</div>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <Button
                  onClick={() => closePopupNotification(popup.id)}
                  className="w-full rounded-full bg-slate-950 hover:bg-slate-800"
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
