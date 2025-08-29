"use client"

import { useLanguage } from "@/context/language-context"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, Edit, X, CheckCircle, XCircle } from "lucide-react"
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

export function RecentReservation() {
  const { getTranslation, currentLang } = useLanguage()
  const [reservations, setReservations] = useState<ReservationData[]>([])
  const [showPanel, setShowPanel] = useState(true)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<ReservationData | null>(null)
  const [editForm, setEditForm] = useState({
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
      const result = await updateReservation({
        id: selectedReservation.id,
        customer_name: editForm.customer_name,
        customer_email: editForm.customer_email,
        customer_phone: editForm.customer_phone,
        party_size: editForm.party_size,
        reservation_date: editForm.reservation_date,
        reservation_time: editForm.reservation_time,
        special_requests: editForm.special_requests || undefined
      })

      if (result.success) {
        // Update the selected reservation in state and cookie
        const updatedReservation: ReservationData = {
          ...selectedReservation,
          ...editForm,
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
  const statusConfig: Record<string, { card: string; border: string; badge: string; icon: JSX.Element }> = {
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
  const cfg = statusConfig[status] || { card: 'from-blue-50 to-indigo-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3.5 w-3.5 mr-1 text-blue-600" /> }

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
        <DialogContent className="sm:max-w-md w-[calc(100vw-1rem)] sm:w-auto p-4 sm:p-6 overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{getTranslation('recentReservation.dialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customer_name">{getTranslation('recentReservation.form.name')}</Label>
              <Input
                id="customer_name"
                value={editForm.customer_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, customer_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="customer_email">{getTranslation('recentReservation.form.email')}</Label>
              <Input
                id="customer_email"
                type="email"
                value={editForm.customer_email}
                onChange={(e) => setEditForm(prev => ({ ...prev, customer_email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="customer_phone">{getTranslation('recentReservation.form.phone')}</Label>
              <Input
                id="customer_phone"
                value={editForm.customer_phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, customer_phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="party_size">{getTranslation('recentReservation.form.partySize')}</Label>
              <Input
                id="party_size"
                type="number"
                min="1"
                max="20"
                value={editForm.party_size}
                onChange={(e) => setEditForm(prev => ({ ...prev, party_size: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <Label htmlFor="reservation_date">{getTranslation('recentReservation.form.date')}</Label>
              <Input
                id="reservation_date"
                type="date"
                value={editForm.reservation_date}
                onChange={(e) => setEditForm(prev => ({ ...prev, reservation_date: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="reservation_time">{getTranslation('recentReservation.form.time')}</Label>
              <Input
                id="reservation_time"
                type="time"
                value={editForm.reservation_time}
                onChange={(e) => setEditForm(prev => ({ ...prev, reservation_time: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="special_requests">{getTranslation('recentReservation.form.specialRequests')}</Label>
              <Textarea
                id="special_requests"
                value={editForm.special_requests}
                onChange={(e) => setEditForm(prev => ({ ...prev, special_requests: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4 sm:flex-row flex-col">
              <Button
                onClick={handleSaveEdit}
                disabled={isEditing}
                className="flex-1 w-full sm:w-auto"
              >
                {isEditing ? getTranslation('recentReservation.actions.saving') : getTranslation('recentReservation.actions.save')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isEditing}
                className="w-full sm:w-auto"
              >
                {getTranslation('recentReservation.actions.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
