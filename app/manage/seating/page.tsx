"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { getRestaurants } from "@/app/manage/actions"
import { assignReservationTable, getSeatingReservations } from "@/app/manage/seating-actions"
import { ReservationForm } from "@/components/manage/reservation-form"
import { useLanguage } from "@/context/language-context"
import { toast } from "sonner"

type SeatingReservation = {
  id: string
  reservation_date: string
  reservation_time: string
  customer_name: string
  customer_phone: string
  party_size: number
  table_number: string | null
  notes: string | null
  status: string | null
  booked_by_name?: string
  restaurants?: {
    id: string
    name: string
  } | null
}

type RestaurantOption = {
  id: string
  name: string
}

function todayAsYYYYMMDD() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export default function SeatingPage() {
  const { currentLang, getTranslation } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [reservations, setReservations] = useState<SeatingReservation[]>([])
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([])
  const [filters, setFilters] = useState({
    date: todayAsYYYYMMDD(),
    status: "all",
    restaurantId: "all",
    searchQuery: "",
  })
  const [selected, setSelected] = useState<SeatingReservation | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [tableNumber, setTableNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [bookedByText, setBookedByText] = useState("")

  const loadRestaurants = useCallback(async () => {
    const result = await getRestaurants()
    if (result.success) {
      const list = (result.data || []) as RestaurantOption[]
      setRestaurants(list)
      if (list.length === 1) {
        setFilters((prev) => ({ ...prev, restaurantId: list[0].id }))
      }
    }
  }, [])

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getSeatingReservations({
        date: filters.date,
        status: filters.status,
        restaurantId: filters.restaurantId,
        searchQuery: filters.searchQuery,
      })

      if (result.success) {
        setReservations(result.data as SeatingReservation[])
      } else {
        toast.error(result.message || "Failed to fetch seating list")
      }
    } catch {
      toast.error("Failed to fetch seating list")
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadRestaurants()
  }, [loadRestaurants])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openEdit = (reservation: SeatingReservation) => {
    setSelected(reservation)
    setTableNumber(reservation.table_number || "")
    setNotes(reservation.notes || "")
    setBookedByText(reservation.booked_by_name || getTranslation("manage.seating.online"))
  }

  const closeEdit = () => {
    setSelected(null)
    setTableNumber("")
    setNotes("")
    setBookedByText("")
  }

  const saveAssignment = async () => {
    if (!selected) return
    setIsSaving(true)
    try {
      const result = await assignReservationTable({
        reservationId: selected.id,
        tableNumber,
        notes,
        bookedByText,
      })
      if (result.success) {
        toast.success(getTranslation("manage.seating.updateSuccess"))
        closeEdit()
        fetchList()
      } else {
        toast.error(result.message || getTranslation("manage.seating.updateError"))
      }
    } catch {
      toast.error(getTranslation("manage.seating.updateError"))
    } finally {
      setIsSaving(false)
    }
  }

  const rowCountLabel = useMemo(
    () => getTranslation("manage.seating.listCount", { count: String(reservations.length) }),
    [getTranslation, reservations.length]
  )

  const handlePrintPdf = () => {
    const params = new URLSearchParams()
    if (filters.date) params.set("date", filters.date)
    if (filters.restaurantId) params.set("restaurantId", filters.restaurantId)
    if (filters.status) params.set("status", filters.status)
    if (filters.searchQuery) params.set("searchQuery", filters.searchQuery)
    if (currentLang) params.set("lang", currentLang)

    window.open(`/manage/seating/print?${params.toString()}`, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{getTranslation("manage.seating.title")}</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {getTranslation("manage.reservations.list.addReservation")}
          </Button>
          <Button variant="outline" onClick={handlePrintPdf}>
            {getTranslation("manage.seating.exportPdf")}
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{getTranslation("manage.seating.filtersTitle")}</CardTitle>
          <CardDescription>{getTranslation("manage.seating.filtersDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>{getTranslation("manage.seating.date")}</Label>
              <Input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>{getTranslation("manage.seating.restaurant")}</Label>
              <Select
                value={filters.restaurantId}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, restaurantId: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{getTranslation("manage.seating.allRestaurants")}</SelectItem>
                  {restaurants.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{getTranslation("manage.seating.status")}</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{getTranslation("manage.seating.statusAll")}</SelectItem>
                  <SelectItem value="pending">{getTranslation("manage.seating.statusPending")}</SelectItem>
                  <SelectItem value="confirmed">{getTranslation("manage.seating.statusConfirmed")}</SelectItem>
                  <SelectItem value="cancelled">{getTranslation("manage.seating.statusCancelled")}</SelectItem>
                  <SelectItem value="completed">{getTranslation("manage.seating.statusCompleted")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{getTranslation("manage.seating.search")}</Label>
              <Input
                placeholder={getTranslation("manage.seating.searchPlaceholder")}
                value={filters.searchQuery}
                onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{getTranslation("manage.seating.listTitle")}</CardTitle>
          <CardDescription>{rowCountLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {getTranslation("manage.seating.loading")}
            </div>
          ) : reservations.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {getTranslation("manage.seating.empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{getTranslation("manage.seating.colName")}</TableHead>
                    <TableHead>{getTranslation("manage.seating.colPhone")}</TableHead>
                    <TableHead>{getTranslation("manage.seating.colPax")}</TableHead>
                    <TableHead>{getTranslation("manage.seating.colTable")}</TableHead>
                    <TableHead>{getTranslation("manage.seating.colNote")}</TableHead>
                    <TableHead>{getTranslation("manage.seating.colBookedBy")}</TableHead>
                    <TableHead>{getTranslation("manage.seating.colTime")}</TableHead>
                    <TableHead className="text-right">{getTranslation("manage.seating.colActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">
                        <div>{reservation.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{reservation.restaurants?.name || "-"}</div>
                      </TableCell>
                      <TableCell>{reservation.customer_phone}</TableCell>
                      <TableCell>{reservation.party_size}</TableCell>
                      <TableCell>{reservation.table_number || "-"}</TableCell>
                      <TableCell className="max-w-64 truncate">{reservation.notes || "-"}</TableCell>
                      <TableCell>{reservation.booked_by_name || "-"}</TableCell>
                      <TableCell>{reservation.reservation_time.slice(0, 5)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openEdit(reservation)}>
                          {getTranslation("manage.seating.assignButton")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={() => closeEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getTranslation("manage.seating.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.customer_name} - ${selected.reservation_time.slice(0, 5)}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{getTranslation("manage.seating.colTable")}</Label>
              <Input
                placeholder={getTranslation("manage.seating.tablePlaceholder")}
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{getTranslation("manage.seating.colNote")}</Label>
              <Textarea
                placeholder={getTranslation("manage.seating.notePlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{getTranslation("manage.seating.colBookedBy")}</Label>
              <Input
                placeholder={getTranslation("manage.seating.bookedByPlaceholder")}
                value={bookedByText}
                onChange={(e) => setBookedByText(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEdit}>
              {getTranslation("manage.seating.cancel")}
            </Button>
            <Button onClick={saveAssignment} disabled={isSaving}>
              {isSaving ? getTranslation("manage.seating.saving") : getTranslation("manage.seating.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showCreateForm && (
        <ReservationForm
          isOpen={showCreateForm}
          mode="create"
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false)
            fetchList()
          }}
        />
      )}
    </div>
  )
}
