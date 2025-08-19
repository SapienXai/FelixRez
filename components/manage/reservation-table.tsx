"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2, MoreHorizontal, CheckCircle, XCircle, Clock, Calendar, Mail, Edit, Grid, List, Phone, User, Utensils, Coffee, Copy } from "lucide-react"
import type { Reservation } from "@/types/supabase"
import { updateReservationStatus } from "@/app/manage/actions"
import { ReservationForm } from "./reservation-form"
import { usePagination } from "@/hooks/use-pagination"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { toast } from "sonner"
import { useLanguage } from "@/context/language-context"

interface ReservationWithRestaurant extends Reservation {
  restaurants?: {
    id: string
    name: string
  }
  reservation_areas?: {
    id: string
    name: string
  }
}

interface ReservationTableProps {
  reservations: ReservationWithRestaurant[]
  onRefresh: () => void
  itemsPerPage?: number
}

export function ReservationTable({ reservations, onRefresh, itemsPerPage = 10 }: ReservationTableProps) {
  const { getTranslation } = useLanguage()
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithRestaurant | null>(null)
  const [actionType, setActionType] = useState<"confirm" | "cancel" | null>(null)
  const [notes, setNotes] = useState("")
  const [sendEmail, setSendEmail] = useState(true)
  const [emailLang, setEmailLang] = useState<'en' | 'tr'>('en')
  const [isLoading, setIsLoading] = useState(false)
  const [editingReservation, setEditingReservation] = useState<ReservationWithRestaurant | null>(null)
  const [currentItemsPerPage, setCurrentItemsPerPage] = useState(itemsPerPage)
  const [viewMode, setViewMode] = useState<"table" | "card">("card")

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    canGoNext,
    canGoPrevious,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination({ data: reservations, itemsPerPage: currentItemsPerPage })

  const handleAction = async () => {
    if (!selectedReservation || !actionType) return

    setIsLoading(true)

    try {
      const status = actionType === "confirm" ? "confirmed" : "cancelled"
      await updateReservationStatus(selectedReservation.id, status, notes, sendEmail, emailLang)
      onRefresh()
    } catch (error) {
      console.error(`Error ${actionType}ing reservation:`, error)
    } finally {
      setIsLoading(false)
      setSelectedReservation(null)
      setActionType(null)
      setNotes("")
      setSendEmail(true)
      setEmailLang('en')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            {getTranslation('common.status.pending')}
          </Badge>
        )
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            {getTranslation('common.status.confirmed')}
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            {getTranslation('common.status.cancelled')}
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {getTranslation('common.status.completed')}
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {paginatedData.map((reservation) => (
        <Card key={reservation.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg text-gray-900">{reservation.restaurants?.name || "Unknown Restaurant"}</CardTitle>
                <div className="flex items-center gap-2">
                  {getStatusBadge(reservation.status || "pending")}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="text-xs text-gray-500 mr-2">
                  {new Date(reservation.created_at).toLocaleDateString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })} {new Date(reservation.created_at).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const areaFirstWord = reservation.reservation_areas?.name?.split(' ')[0];
                     const isMainHall = !areaFirstWord || areaFirstWord.toLowerCase() === 'main';
                     const areaText = isMainHall ? '' : `${areaFirstWord} - `;
                     const reservationInfo = `${new Date(reservation.reservation_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
${reservation.customer_name}
${reservation.party_size} people - ${areaText}${reservation.reservation_type === 'drinks' ? 'Drinks Only' : 'Dining'}
${reservation.reservation_time.substring(0, 5)}
${reservation.customer_phone}${reservation.special_requests ? `
${reservation.special_requests}` : ''}`;
                    navigator.clipboard.writeText(reservationInfo);
                     toast.success(getTranslation('manage.reservations.card.copySuccess'));
                  }}
                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                  title={getTranslation('manage.reservations.card.copyTooltip')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setEditingReservation(reservation)}
                      className="text-blue-600"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Reservation
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedReservation(reservation)
                        setActionType("confirm")
                      }}
                      disabled={reservation.status === "confirmed" || reservation.status === "cancelled"}
                      className="text-green-600"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirm Reservation
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedReservation(reservation)
                        setActionType("cancel")
                      }}
                      disabled={reservation.status === "cancelled"}
                      className="text-red-600"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel Reservation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tarih ve Saat */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {new Date(reservation.reservation_date).toLocaleDateString(getTranslation('common.locale') || 'tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      weekday: 'long'
                    })}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                     <Clock className="h-3 w-3" />
                     {reservation.reservation_time.substring(0, 5)}
                   </div>
                </div>
              </div>
            </div>
            
            {/* Müşteri Bilgileri */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{reservation.customer_name}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{reservation.party_size} Kişi</span>
                    {reservation.reservation_areas?.name && (
                      <Badge variant="outline" className="bg-white text-xs">{reservation.reservation_areas.name}</Badge>
                    )}
                    <Badge variant={reservation.reservation_type === 'drinks' ? 'secondary' : 'default'} className="flex items-center gap-1 text-xs">
                      {reservation.reservation_type === 'drinks' ? (
                        <><Coffee className="h-2 w-2" /> {getTranslation('manage.reservations.card.drinks')}</>
                      ) : (
                        <><Utensils className="h-2 w-2" /> {getTranslation('manage.reservations.card.dining')}</>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            
            {/* İletişim */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Phone className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{reservation.customer_phone}</div>
                  <div className="text-sm text-gray-600 truncate">{reservation.customer_email}</div>
                </div>
              </div>
            </div>
            
            {/* Ek Bilgiler */}
            {(reservation.table_number || reservation.special_requests) && (
              <div className="border-t pt-3 space-y-2">
                {reservation.table_number && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{getTranslation('manage.reservations.card.table')}:</span> {reservation.table_number}
                  </div>
                )}
                {reservation.special_requests && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{getTranslation('manage.reservations.card.note')}:</span> {reservation.special_requests}
                  </div>
                )}
              </div>
            )}
            

          </CardContent>
        </Card>
      ))}
    </div>
  )

  if (reservations.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No reservations found</div>
  }

  return (
    <>
      {/* View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="flex items-center space-x-2"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Table</span>
          </Button>
          <Button
            variant={viewMode === "card" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("card")}
            className="flex items-center space-x-2"
          >
            <Grid className="h-4 w-4" />
            <span className="hidden sm:inline">Cards</span>
          </Button>
        </div>
      </div>

      {/* Table View */}
       {viewMode === "table" && (
         <div className="overflow-x-auto">
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Restaurant</TableHead>
                 <TableHead className="hidden md:table-cell">Customer</TableHead>
                 <TableHead>Date & Time</TableHead>
                 <TableHead className="hidden md:table-cell">Area</TableHead>
                 <TableHead className="hidden sm:table-cell">Party Size</TableHead>
                 <TableHead className="hidden lg:table-cell">Type</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead className="text-right">Actions</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {paginatedData.map((reservation) => (
                 <TableRow key={reservation.id}>
                   <TableCell className="font-medium">
                     <div>{reservation.restaurants?.name || "Unknown Restaurant"}</div>
                     <div className="text-sm text-muted-foreground mt-1">
                       {reservation.customer_name}
                     </div>
                     {reservation.reservation_areas?.name && (
                       <div className="mt-1 md:hidden">
                         <Badge variant="secondary">{reservation.reservation_areas.name}</Badge>
                       </div>
                     )}
                     {reservation.table_number && (
                       <div className="text-xs text-muted-foreground">Table: {reservation.table_number}</div>
                     )}
                     {reservation.special_requests && (
                       <div className="text-xs text-muted-foreground mt-1 italic">
                         Note: {reservation.special_requests}
                       </div>
                     )}
                   </TableCell>
                   <TableCell className="hidden md:table-cell">
                     <div className="font-medium">Party: {reservation.party_size}</div>
                     <div className="text-sm text-muted-foreground">{reservation.customer_phone}</div>
                     <div className="text-sm text-muted-foreground flex items-center">
                       <Mail className="mr-1 h-3 w-3" />
                       {reservation.customer_email}
                     </div>
                   </TableCell>
                   <TableCell>
                     <div className="flex items-center">
                       <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                       <span className="text-sm">{new Date(reservation.reservation_date).toLocaleDateString()}</span>
                     </div>
                     <div className="flex items-center text-sm text-muted-foreground">
                       <Clock className="mr-2 h-4 w-4" />
                       <span>{reservation.reservation_time.substring(0, 5)}</span>
                     </div>
                     <div className="sm:hidden text-xs text-muted-foreground mt-1">
                       Party: {reservation.party_size}
                     </div>
                   </TableCell>
                  <TableCell className="hidden md:table-cell">{reservation.reservation_areas?.name ? (
                    <Badge variant="outline">{reservation.reservation_areas.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}</TableCell>
                   <TableCell className="hidden sm:table-cell">{reservation.party_size}</TableCell>
                   <TableCell className="hidden lg:table-cell">
                     <Badge variant={reservation.reservation_type === 'drinks' ? 'secondary' : 'default'} className="flex items-center gap-1 w-fit">
                       {reservation.reservation_type === 'drinks' ? (
                         <><Coffee className="h-3 w-3" /> Drinks</>
                       ) : (
                         <><Utensils className="h-3 w-3" /> Dining</>
                       )}
                     </Badge>
                   </TableCell>
                   <TableCell>{getStatusBadge(reservation.status || "pending")}</TableCell>
                   <TableCell className="text-right">
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon">
                           <MoreHorizontal className="h-4 w-4" />
                           <span className="sr-only">Open menu</span>
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                         <DropdownMenuItem
                           onClick={() => setEditingReservation(reservation)}
                           className="text-blue-600"
                         >
                           <Edit className="mr-2 h-4 w-4" />
                           Edit Reservation
                         </DropdownMenuItem>
                         <DropdownMenuItem
                           onClick={() => {
                             setSelectedReservation(reservation)
                             setActionType("confirm")
                           }}
                           disabled={reservation.status === "confirmed" || reservation.status === "cancelled"}
                           className="text-green-600"
                         >
                           <CheckCircle className="mr-2 h-4 w-4" />
                           Confirm Reservation
                         </DropdownMenuItem>
                         <DropdownMenuItem
                           onClick={() => {
                             setSelectedReservation(reservation)
                             setActionType("cancel")
                           }}
                           disabled={reservation.status === "cancelled"}
                           className="text-red-600"
                         >
                           <XCircle className="mr-2 h-4 w-4" />
                           Cancel Reservation
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         </div>
       )}

       {/* Card View */}
       {viewMode === "card" && renderCardView()}

      {/* Pagination Controls */}
      <div className="mt-4">
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          canGoNext={canGoNext}
          canGoPrevious={canGoPrevious}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={totalItems}
          itemsPerPage={currentItemsPerPage}
          onItemsPerPageChange={setCurrentItemsPerPage}
          showItemsPerPage={true}
        />
      </div>

      <Dialog
        open={!!selectedReservation && !!actionType}
        onOpenChange={() => {
          setSelectedReservation(null)
          setActionType(null)
          setNotes("")
          setSendEmail(true)
          setEmailLang('en')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === "confirm" ? "Confirm Reservation" : "Cancel Reservation"}</DialogTitle>
            <DialogDescription>
              {actionType === "confirm"
                ? "Are you sure you want to confirm this reservation?"
                : "Are you sure you want to cancel this reservation?"}
            </DialogDescription>
          </DialogHeader>

          {selectedReservation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Customer:</span> {selectedReservation.customer_name}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {selectedReservation.customer_phone}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {selectedReservation.customer_email}
                </div>
                <div>
                  <span className="font-medium">Date:</span>{" "}
                  {new Date(selectedReservation.reservation_date).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Time:</span> {selectedReservation.reservation_time}
                </div>
                <div>
                  <span className="font-medium">Party Size:</span> {selectedReservation.party_size}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this reservation..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="sendEmail" checked={sendEmail} onCheckedChange={(checked) => setSendEmail(!!checked)} />
                <Label htmlFor="sendEmail" className="text-sm font-normal">
                  Send notification email to customer
                </Label>
              </div>

              {sendEmail && (
                <div className="grid grid-cols-2 items-center gap-2">
                  <Label htmlFor="emailLang">Email Language</Label>
                  <select
                    id="emailLang"
                    className="border rounded px-2 py-1 text-sm"
                    value={emailLang}
                    onChange={(e) => setEmailLang((e.target.value as 'en' | 'tr'))}
                  >
                    <option value="en">English</option>
                    <option value="tr">Türkçe</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedReservation(null)
                setActionType(null)
                setNotes("")
                setSendEmail(true)
              }}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === "confirm" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {actionType === "confirm" ? "Confirming..." : "Cancelling..."}
                </>
              ) : actionType === "confirm" ? (
                "Confirm Reservation"
              ) : (
                "Cancel Reservation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingReservation && (
        <ReservationForm
          isOpen={!!editingReservation}
          mode="edit"
          reservation={editingReservation}
          onClose={() => setEditingReservation(null)}
          onSuccess={() => {
            setEditingReservation(null)
            onRefresh()
          }}
        />
      )}
    </>
  )
}
