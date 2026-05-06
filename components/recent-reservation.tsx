"use client"

import { useLanguage } from "@/context/language-context"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Calendar, Clock, Users, Edit, X, CheckCircle, XCircle, Loader2, MapPin, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateReservation, getReservationStatus } from "@/app/actions/reservation-actions"
import { toast } from "@/hooks/use-toast"

interface ReservationData {
  id: string
  restaurant_name: string
  customer_name: string
  customer_email: string
  customer_phone: string
  party_size: number
  reservation_date: string
  reservation_time: string
  special_requests?: string
  status?: string | null
  notes?: string | null
  created_at: string
}

type EditReservationForm = {
  customer_name: string
  customer_email: string
  customer_phone: string
  party_size: number | ""
  reservation_date: string
  reservation_time: string
  special_requests: string
}

export function RecentReservation() {
  const { getTranslation, currentLang } = useLanguage()
  const [reservations, setReservations] = useState<ReservationData[]>([])
  const [showPanel, setShowPanel] = useState(true)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<ReservationData | null>(null)
  const [editForm, setEditForm] = useState<EditReservationForm>({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    party_size: 2,
    reservation_date: "",
    reservation_time: "",
    special_requests: ""
  })

  useEffect(() => {
    const parseDT = (d?: string, t?: string) => {
      const [yy, mm, dd] = String(d || '').split('-').map((n) => parseInt(n, 10) || 0)
      const [hh, mi] = String(t || '00:00').split(':').map((n) => parseInt(n, 10) || 0)
      const x = new Date()
      x.setFullYear(yy)
      x.setMonth((mm || 1) - 1)
      x.setDate(dd || 1)
      x.setHours(hh || 0, mi || 0, 0, 0)
      return x
    }

    const loadRecentReservations = () => {
      const cookies = document.cookie.split(';')
      const listCookie = cookies.find((c) => c.trim().startsWith('recent_reservations='))
      let items: ReservationData[] = []

      if (listCookie) {
        try {
          items = JSON.parse(decodeURIComponent(listCookie.split('=')[1])) || []
        } catch (e) {
          console.error('Error parsing recent_reservations cookie:', e)
        }
      } else {
        // fallback: old single cookie
        const single = cookies.find((c) => c.trim().startsWith('recent_reservation='))
        if (single) {
          try {
            const one = JSON.parse(decodeURIComponent(single.split('=')[1]))
            if (one && one.id) items = [one]
            // clear old cookie
            document.cookie = 'recent_reservation=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
          } catch {}
        }
      }

      // Filter out expired
      const now = Date.now()
      const valid = (items || []).filter((it) => parseDT(it.reservation_date, it.reservation_time).getTime() > now)

      if (valid.length) {
        setReservations(valid)
        // Respect previous hide choice
        try {
          const hidden = localStorage.getItem('recent_reservation_hidden') === '1'
          if (hidden) setShowPanel(false)
        } catch {}
        // fetch statuses
        valid.forEach((it) => {
          getReservationStatus(it.id)
            .then((res) => {
              if (res?.success && res.data) {
                setReservations((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: res.data.status, notes: res.data.notes } : p)))
              }
            })
            .catch((e) => console.error('Error fetching reservation status:', e))
        })

        // persist filtered list and expiry as max
        const maxExpiry = valid.reduce((acc, it) => Math.max(acc, parseDT(it.reservation_date, it.reservation_time).getTime()), 0)
        const expiryDate = maxExpiry > now ? new Date(maxExpiry) : (() => { const e = new Date(); e.setHours(e.getHours() + 3); return e })()
        document.cookie = `recent_reservations=${encodeURIComponent(JSON.stringify(valid))}; expires=${expiryDate.toUTCString()}; path=/`
      } else {
        // clear cookie if empty
        document.cookie = 'recent_reservations=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
      }
    }

    loadRecentReservations()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const locale = currentLang === 'tr' ? 'tr-TR' : 'en-US'
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    const locale = currentLang === 'tr' ? 'tr-TR' : 'en-US'
    const use12h = currentLang !== 'tr'
    return date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: use12h
    })
  }

  const handleEditClick = (res: ReservationData) => {
    if (res) {
      setSelectedReservation(res)
      setEditForm({
        customer_name: res.customer_name,
        customer_email: res.customer_email,
        customer_phone: res.customer_phone,
        party_size: res.party_size,
        reservation_date: res.reservation_date,
        reservation_time: res.reservation_time,
        special_requests: res.special_requests || ""
      })
      setShowEditDialog(true)
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedReservation) return
    
    setIsEditing(true)
    try {
      const normalizedPartySize = editForm.party_size === "" ? 1 : editForm.party_size
      const result = await updateReservation({
        id: selectedReservation.id,
        customer_name: editForm.customer_name,
        customer_email: editForm.customer_email,
        customer_phone: editForm.customer_phone,
        party_size: normalizedPartySize,
        reservation_date: editForm.reservation_date,
        reservation_time: editForm.reservation_time,
        special_requests: editForm.special_requests || undefined
      })

      if (result.success) {
        // Update the selected reservation in state and cookie
        const updatedReservation: ReservationData = {
          ...selectedReservation,
          ...editForm,
          party_size: normalizedPartySize,
          status: 'pending',
        }
        setReservations((prev) => prev.map((r) => (r.id === selectedReservation.id ? updatedReservation : r)))

        // Update list cookie with all active reservations and expiry at latest reservation time
        const parseDT = (d: string, t: string) => {
          const [yy, mm, dd] = d.split('-').map((n) => parseInt(n, 10) || 0)
          const [hh, mi] = t.split(':').map((n) => parseInt(n, 10) || 0)
          const x = new Date()
          x.setFullYear(yy)
          x.setMonth((mm || 1) - 1)
          x.setDate(dd || 1)
          x.setHours(hh || 0, mi || 0, 0, 0)
          return x
        }
        const active = reservations.map((r) => (r.id === selectedReservation.id ? updatedReservation : r))
          .filter((r) => parseDT(r.reservation_date, r.reservation_time).getTime() > Date.now())
        const maxExpiry = active.reduce((acc, it) => Math.max(acc, parseDT(it.reservation_date, it.reservation_time).getTime()), 0)
        const expiryDate = maxExpiry > Date.now() ? new Date(maxExpiry) : (() => { const e = new Date(); e.setHours(e.getHours() + 3); return e })()
        document.cookie = `recent_reservations=${encodeURIComponent(JSON.stringify(active))}; expires=${expiryDate.toUTCString()}; path=/`
        
        setShowEditDialog(false)
        toast({
          title: getTranslation('recentReservation.toast.successTitle'),
          description: getTranslation('recentReservation.toast.successDesc')
        })
      } else {
        toast({
          title: getTranslation('recentReservation.toast.errorTitle'),
          description: result.message || getTranslation('recentReservation.toast.errorDesc'),
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error updating reservation:', error)
      toast({
        title: getTranslation('recentReservation.toast.errorTitle'),
        description: getTranslation('recentReservation.toast.unexpected'),
        variant: "destructive"
      })
    } finally {
      setIsEditing(false)
    }
  }

  const handleDismiss = () => {
    // Hide panel but keep cookie so user can bring it back
    try {
      localStorage.setItem('recent_reservation_hidden', '1')
    } catch {}
    setShowPanel(false)
  }

  const handleShowPanel = () => {
    try {
      localStorage.removeItem('recent_reservation_hidden')
    } catch {}
    setShowPanel(true)
  }

  if (!reservations.length) {
    return null
  }

  if (!showPanel) {
    return (
      <div className="w-full max-w-4xl mx-auto mb-6">
        <Card className="bg-white border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-blue-900">
                {getTranslation('recentReservation.title')}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowPanel}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                <Calendar className="h-4 w-4 mr-1" />
                View reservations ({reservations.length})
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }
  const statusConfig: Record<string, { card: string; border: string; badge: string; icon: ReactNode }> = {
    pending: {
      card: 'from-yellow-50 to-amber-50',
      border: 'border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-800',
      icon: <Clock className="h-3.5 w-3.5 mr-1 text-yellow-600" />,
    },
    confirmed: {
      card: 'from-green-50 to-emerald-50',
      border: 'border-green-200',
      badge: 'bg-green-100 text-green-800',
      icon: <CheckCircle className="h-3.5 w-3.5 mr-1 text-green-600" />,
    },
    cancelled: {
      card: 'from-red-50 to-rose-50',
      border: 'border-red-200',
      badge: 'bg-red-100 text-red-800',
      icon: <XCircle className="h-3.5 w-3.5 mr-1 text-red-600" />,
    },
  }

  return (
    <>
      <div className="w-full max-w-4xl mx-auto mb-6 px-3 sm:px-0">
        {reservations.map((reservation) => {
          const status = (reservation.status || 'pending') as 'pending' | 'confirmed' | 'cancelled' | string
          const cfg = statusConfig[status] || { card: 'from-blue-50 to-indigo-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3.5 w-3.5 mr-1 text-blue-600" /> }
          const [y, m, d] = reservation.reservation_date.split('-').map((n) => parseInt(n, 10) || 0)
          const [hh, mm] = reservation.reservation_time.split(':').map((n) => parseInt(n, 10) || 0)
          const resDT = new Date()
          resDT.setFullYear(y)
          resDT.setMonth((m || 1) - 1)
          resDT.setDate(d || 1)
          resDT.setHours(hh || 0, mm || 0, 0, 0)
          const canEdit = new Date().getTime() < resDT.getTime() && status !== 'cancelled'

          return (
            <Card key={reservation.id} className={`mb-4 bg-gradient-to-r ${cfg.card} ${cfg.border}`}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base sm:text-lg text-gray-900 truncate">
                    {getTranslation('recentReservation.title')}
                  </CardTitle>
                  <div className="flex gap-2 flex-wrap items-center justify-end">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium shrink-0 ${cfg.badge}`}>
                      {cfg.icon}
                      {status === 'pending' && getTranslation('common.status.pending')}
                      {status === 'confirmed' && getTranslation('common.status.confirmed')}
                      {status === 'cancelled' && getTranslation('common.status.cancelled')}
                      {status !== 'pending' && status !== 'confirmed' && status !== 'cancelled' && String(status)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(reservation)}
                      disabled={!canEdit}
                      className={`text-blue-700 border-blue-300 hover:bg-blue-100 ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {getTranslation('recentReservation.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDismiss}
                      className="text-gray-500 hover:text-gray-700"
                      title="Hide panel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-blue-100 p-2 rounded-full shrink-0">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600">{getTranslation('recentReservation.date')}</p>
                      <p className="font-medium text-gray-900 truncate">{formatDate(reservation.reservation_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-blue-100 p-2 rounded-full shrink-0">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600">{getTranslation('recentReservation.time')}</p>
                      <p className="font-medium text-gray-900 truncate">{formatTime(reservation.reservation_time)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-blue-100 p-2 rounded-full shrink-0">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600">{getTranslation('recentReservation.party')}</p>
                      <p className="font-medium text-gray-900 truncate">{reservation.party_size} {getTranslation('recentReservation.guestsSuffix')}</p>
                    </div>
                  </div>
                </div>
                <div className={`mt-4 pt-4 border-t ${cfg.border}`}>
                  <p className="text-sm text-gray-600 flex flex-wrap gap-x-1 min-w-0">
                    <span className="font-medium truncate max-w-full sm:max-w-[50%]">{reservation.restaurant_name}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="truncate max-w-full sm:max-w-[40%]">{reservation.customer_name}</span>
                  </p>
                  {reservation.special_requests && (
                    <p className="text-sm text-gray-500 mt-1 break-words whitespace-pre-line">
                      {getTranslation('recentReservation.specialRequestsPrefix')} {reservation.special_requests}
                    </p>
                  )}
                  {(status === 'confirmed' || status === 'cancelled') && reservation.notes && (
                    <div
                      className={`mt-3 p-3 rounded-md border text-sm break-words whitespace-pre-line ${
                        status === 'confirmed'
                          ? 'border-green-300 bg-green-50 text-green-800'
                          : 'border-red-300 bg-red-50 text-red-800'
                      }`}
                    >
                      {reservation.notes}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[96vw] max-w-5xl overflow-hidden bg-[#eef3f8] p-0">
          <div className="flex max-h-[92vh] min-h-0 flex-col">
            <div className="border-b border-white/60 bg-white/65 px-4 pb-4 pt-6 shadow-sm backdrop-blur sm:px-5 sm:pt-4">
              <DialogHeader className="gap-3">
                <DialogTitle className="sr-only">{getTranslation('recentReservation.dialogTitle')}</DialogTitle>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white sm:tracking-[0.22em]">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="truncate">{getTranslation('recentReservation.dialogTitle')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full border-white/70 bg-white px-2.5 py-0.5 text-[11px] text-slate-700 shadow-sm">
                    {selectedReservation?.restaurant_name || getTranslation('recentReservation.title')}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/70 bg-white px-2.5 py-0.5 text-[11px] text-slate-700 shadow-sm">
                    <Calendar className="mr-1 h-3 w-3" />
                    {editForm.reservation_date ? formatDate(editForm.reservation_date) : getTranslation('recentReservation.form.date')}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/70 bg-white px-2.5 py-0.5 text-[11px] text-slate-700 shadow-sm">
                    <Clock className="mr-1 h-3 w-3" />
                    {editForm.reservation_time ? formatTime(editForm.reservation_time) : getTranslation('recentReservation.form.time')}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/70 bg-white px-2.5 py-0.5 text-[11px] text-slate-700 shadow-sm">
                    <Users className="mr-1 h-3 w-3" />
                    {editForm.party_size || 1} {getTranslation('recentReservation.guestsSuffix')}
                  </Badge>
                </div>
              </DialogHeader>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <form
                id="recent-reservation-edit-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleSaveEdit()
                }}
                className="px-4 py-4 sm:px-5"
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.08)] ring-1 ring-black/5">
                    <CardHeader className="border-b border-slate-100 bg-white/80 px-4 py-3">
                      <CardTitle className="text-sm font-semibold text-slate-950">
                        {getTranslation('recentReservation.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 p-4">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="customer_name" className="text-xs font-medium text-slate-700">
                          {getTranslation('recentReservation.form.name')}
                        </Label>
                        <Input
                          id="customer_name"
                          className="h-10 rounded-xl border-slate-200 bg-white shadow-sm transition-shadow focus-visible:shadow-md"
                          value={editForm.customer_name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, customer_name: e.target.value }))}
                          required
                        />
                      </div>

                      <Accordion type="single" collapsible className="rounded-xl border border-slate-100 bg-slate-50 px-3">
                        <AccordionItem value="contact" className="border-b-0">
                          <AccordionTrigger className="py-3 text-xs font-medium text-slate-700 hover:no-underline">
                            {getTranslation('recentReservation.form.email')} / {getTranslation('recentReservation.form.phone')}
                          </AccordionTrigger>
                          <AccordionContent className="grid gap-3 pb-3 pt-0 sm:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="customer_email" className="text-xs font-medium text-slate-700">
                                {getTranslation('recentReservation.form.email')}
                              </Label>
                              <Input
                                id="customer_email"
                                type="email"
                                className="h-10 rounded-xl border-slate-200 bg-white shadow-sm transition-shadow focus-visible:shadow-md"
                                value={editForm.customer_email}
                                onChange={(e) => setEditForm(prev => ({ ...prev, customer_email: e.target.value }))}
                                required
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="customer_phone" className="text-xs font-medium text-slate-700">
                                {getTranslation('recentReservation.form.phone')}
                              </Label>
                              <Input
                                id="customer_phone"
                                className="h-10 rounded-xl border-slate-200 bg-white shadow-sm transition-shadow focus-visible:shadow-md"
                                value={editForm.customer_phone}
                                onChange={(e) => setEditForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                                required
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.08)] ring-1 ring-black/5">
                    <CardHeader className="border-b border-slate-100 bg-white/80 px-4 py-3">
                      <CardTitle className="text-sm font-semibold text-slate-950">
                        {getTranslation('reserve.header.yourReservation')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 p-4">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-0.5 h-4 w-4 text-slate-500" />
                          <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                              {getTranslation('reserve.confirmation.restaurant')}
                            </div>
                            <div className="mt-1 truncate text-sm font-medium text-slate-900">
                              {selectedReservation?.restaurant_name}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="reservation_date" className="text-xs font-medium text-slate-700">
                            {getTranslation('recentReservation.form.date')}
                          </Label>
                          <Input
                            id="reservation_date"
                            type="date"
                            className="h-10 rounded-xl border-slate-200 bg-white shadow-sm transition-shadow focus-visible:shadow-md"
                            value={editForm.reservation_date}
                            onChange={(e) => setEditForm(prev => ({ ...prev, reservation_date: e.target.value }))}
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="reservation_time" className="text-xs font-medium text-slate-700">
                            {getTranslation('recentReservation.form.time')}
                          </Label>
                          <Input
                            id="reservation_time"
                            type="time"
                            className="h-10 rounded-xl border-slate-200 bg-white shadow-sm transition-shadow focus-visible:shadow-md"
                            value={editForm.reservation_time}
                            onChange={(e) => setEditForm(prev => ({ ...prev, reservation_time: e.target.value }))}
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="party_size" className="text-xs font-medium text-slate-700">
                            {getTranslation('recentReservation.form.partySize')}
                          </Label>
                          <Input
                            id="party_size"
                            type="number"
                            min="1"
                            max="20"
                            className="h-10 rounded-xl border-slate-200 bg-white shadow-sm transition-shadow focus-visible:shadow-md"
                            value={editForm.party_size}
                            onChange={(e) => {
                              const value = e.target.value
                              setEditForm(prev => ({
                                ...prev,
                                party_size: value === "" ? "" : parseInt(value, 10) || 1,
                              }))
                            }}
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.08)] ring-1 ring-black/5 xl:col-span-2">
                    <CardHeader className="border-b border-slate-100 bg-white/80 px-4 py-3">
                      <CardTitle className="text-sm font-semibold text-slate-950">
                        {getTranslation('recentReservation.form.specialRequests')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="special_requests" className="text-xs font-medium text-slate-700">
                          {getTranslation('recentReservation.form.specialRequests')}
                        </Label>
                        <Textarea
                          id="special_requests"
                          value={editForm.special_requests}
                          onChange={(e) => setEditForm(prev => ({ ...prev, special_requests: e.target.value }))}
                          rows={3}
                          className="min-h-[92px] rounded-xl border-slate-200 bg-white shadow-sm transition-shadow focus-visible:shadow-md"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </form>
            </ScrollArea>

            <div className="border-t border-white/60 bg-white/70 px-4 py-3 backdrop-blur sm:px-5">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  disabled={isEditing}
                  className="h-10 w-full rounded-xl sm:w-auto"
                >
                  {getTranslation('recentReservation.actions.cancel')}
                </Button>
                <Button
                  type="submit"
                  form="recent-reservation-edit-form"
                  disabled={isEditing}
                  className="h-10 w-full rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800 sm:w-auto"
                >
                  {isEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? getTranslation('recentReservation.actions.saving') : getTranslation('recentReservation.actions.save')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
