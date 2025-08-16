"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, Clock, Edit, List, Grid, User, Phone, Mail, Calendar, MoreHorizontal, Utensils, Coffee, Trash2, Copy } from "lucide-react"
import type { Reservation } from "@/types/supabase"
import { updateReservationStatus, deleteReservation } from "@/app/manage/actions"
import { toast } from "sonner"
import { ReservationForm } from "@/components/manage/reservation-form"
import { usePagination } from "@/hooks/use-pagination"
import { PaginationControls } from "@/components/ui/pagination-controls"
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

interface ReservationListProps {
  reservations: ReservationWithRestaurant[]
  onStatusChange: () => void
  itemsPerPage?: number
}

export function ReservationList({ reservations, onStatusChange, itemsPerPage = 5 }: ReservationListProps) {
  const { getTranslation } = useLanguage()
  const [viewMode, setViewMode] = useState<"table" | "card">("card")
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean
    reservation: ReservationWithRestaurant | null
    action: "confirm" | "cancel" | null
  }>({ isOpen: false, reservation: null, action: null })
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    reservation: ReservationWithRestaurant | null
  }>({ isOpen: false, reservation: null })
  const [editForm, setEditForm] = useState<{
    isOpen: boolean
    reservation: ReservationWithRestaurant | null
  }>({ isOpen: false, reservation: null })
  const [notes, setNotes] = useState("")
  const [sendEmail, setSendEmail] = useState(true)
  const [emailLang, setEmailLang] = useState<'en' | 'tr'>('en')
  const [loading, setLoading] = useState(false)
  const [currentItemsPerPage, setCurrentItemsPerPage] = useState(itemsPerPage)

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
    if (!actionDialog.reservation || !actionDialog.action) return

    setLoading(true)
    try {
      const status = actionDialog.action === "confirm" ? "confirmed" : "cancelled"
      const result = await updateReservationStatus(
        actionDialog.reservation.id,
        status,
        notes,
        sendEmail,
        emailLang
      )

      if (result.success) {
        toast.success(result.message)
        onStatusChange()
        setActionDialog({ isOpen: false, reservation: null, action: null })
        setNotes("")
        setSendEmail(true)
        setEmailLang('en')
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const openActionDialog = (reservation: ReservationWithRestaurant, action: "confirm" | "cancel") => {
    setActionDialog({ isOpen: true, reservation, action })
  }

  const openDeleteDialog = (reservation: ReservationWithRestaurant) => {
    setDeleteDialog({ isOpen: true, reservation })
  }

  const handleDelete = async () => {
    if (!deleteDialog.reservation) return

    setLoading(true)
    try {
      const result = await deleteReservation(deleteDialog.reservation.id)

      if (result.success) {
        toast.success(getTranslation("manage.reservations.list.deleteSuccess"))
        onStatusChange()
        setDeleteDialog({ isOpen: false, reservation: null })
      } else {
        toast.error(getTranslation("manage.reservations.list.deleteError"))
      }
    } catch (error) {
      toast.error(getTranslation("manage.reservations.list.deleteError"))
    } finally {
      setLoading(false)
    }
  }

  const openEditForm = (reservation: ReservationWithRestaurant) => {
    setEditForm({ isOpen: true, reservation })
  }

  const closeEditForm = () => {
    setEditForm({ isOpen: false, reservation: null })
  }

  const handleEditSuccess = () => {
    onStatusChange()
    closeEditForm()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {getTranslation('common.status.confirmed')}
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            {getTranslation('common.status.cancelled')}
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {getTranslation('common.status.completed')}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            {getTranslation('common.status.pending')}
          </Badge>
        )
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
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => {
                     const reservationInfo = `${new Date(reservation.reservation_date).toLocaleDateString(getTranslation('common.locale') || 'tr-TR', {
                       day: 'numeric',
                       month: 'long',
                       weekday: 'long'
                     })} ${reservation.reservation_time}
${reservation.customer_name} - ${reservation.party_size} ${getTranslation('manage.reservations.card.people')}
${reservation.reservation_areas?.name || ''} ${reservation.reservation_type === 'drinks' ? `(${getTranslation('manage.reservations.card.drinks')})` : `(${getTranslation('manage.reservations.card.dining')})`}
${reservation.customer_phone}
${reservation.customer_email || ''}${reservation.table_number ? `
${getTranslation('manage.reservations.card.table')}: ${reservation.table_number}` : ''}${reservation.special_requests ? `
${getTranslation('manage.reservations.card.note')}: ${reservation.special_requests}` : ''}`;
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
                       onClick={() => openEditForm(reservation)}
                       className="text-blue-600"
                     >
                       <Edit className="mr-2 h-4 w-4" />
                       {getTranslation("manage.reservations.list.editReservation")}
                     </DropdownMenuItem>
                     <DropdownMenuItem
                       onClick={() => openActionDialog(reservation, "confirm")}
                       disabled={reservation.status === "confirmed" || reservation.status === "cancelled"}
                       className="text-green-600"
                     >
                       <CheckCircle className="mr-2 h-4 w-4" />
                       {getTranslation("manage.reservations.list.confirmReservation")}
                     </DropdownMenuItem>
                     <DropdownMenuItem
                       onClick={() => openActionDialog(reservation, "cancel")}
                       disabled={reservation.status === "cancelled"}
                       className="text-red-600"
                     >
                       <XCircle className="mr-2 h-4 w-4" />
                       {getTranslation("manage.reservations.list.cancelReservation")}
                     </DropdownMenuItem>
                     <DropdownMenuItem
                       onClick={() => openDeleteDialog(reservation)}
                       className="text-red-600"
                     >
                       <Trash2 className="mr-2 h-4 w-4" />
                       {getTranslation("manage.reservations.list.deleteReservation")}
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
                     {reservation.reservation_time}
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
                     <span>{reservation.party_size} {getTranslation('manage.reservations.card.people')}</span>
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
                  {reservation.customer_email && (
                    <div className="text-sm text-gray-600 truncate">{reservation.customer_email}</div>
                  )}
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
        <div className="overflow-x-auto rounded-md border">
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
                <React.Fragment key={reservation.id}>
                  <TableRow>
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
                      {reservation.customer_email && (
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Mail className="mr-1 h-3 w-3" />
                          {reservation.customer_email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span>{new Date(reservation.reservation_date).toLocaleDateString()}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span>{reservation.reservation_time}</span>
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
                            onClick={() => openEditForm(reservation)}
                            className="text-blue-600"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            {getTranslation("manage.reservations.list.editReservation")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openActionDialog(reservation, "confirm")}
                            disabled={reservation.status === "confirmed" || reservation.status === "cancelled"}
                            className="text-green-600"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {getTranslation("manage.reservations.list.confirmReservation")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openActionDialog(reservation, "cancel")}
                            disabled={reservation.status === "cancelled"}
                            className="text-red-600"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            {getTranslation("manage.reservations.list.cancelReservation")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(reservation)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {getTranslation("manage.reservations.list.deleteReservation")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                 </React.Fragment>
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

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({ isOpen: false, reservation: null, action: null })
            setNotes("")
            setSendEmail(true)
            setEmailLang('en')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "confirm" ? getTranslation("manage.reservations.list.confirmReservation") : getTranslation("manage.reservations.list.cancelReservation")}
            </DialogTitle>
            <div className="text-sm text-muted-foreground">
              {actionDialog.reservation && (
                <div className="space-y-2">
                  <div>
                    <strong>Customer:</strong> {actionDialog.reservation.customer_name}
                  </div>
                  <div>
                    <strong>Restaurant:</strong> {actionDialog.reservation.restaurants?.name}
                  </div>
                  <div>
                    <strong>Date:</strong> {new Date(actionDialog.reservation.reservation_date).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Time:</strong> {actionDialog.reservation.reservation_time}
                  </div>
                  <div>
                    <strong>Party Size:</strong> {actionDialog.reservation.party_size}
                  </div>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this action..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendEmail"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked as boolean)}
              />
              <Label htmlFor="sendEmail">Send email notification to customer</Label>
            </div>

            {sendEmail && (
              <div className="grid grid-cols-2 items-center gap-2">
                <Label htmlFor="emailLang">Email Language</Label>
                <select
                  id="emailLang"
                  className="border rounded px-2 py-1 text-sm"
                  value={emailLang}
                  onChange={(e) => setEmailLang(e.target.value as 'en' | 'tr')}
                >
                  <option value="en">English</option>
                  <option value="tr">Türkçe</option>
                </select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ isOpen: false, reservation: null, action: null })
                setNotes("")
                setSendEmail(true)
              }}
            >
              {getTranslation("manage.reservations.list.cancel")}
            </Button>
            <Button onClick={handleAction} disabled={loading}>
              {loading
                ? getTranslation("manage.reservations.list.processing")
                : actionDialog.action === "confirm"
                ? getTranslation("manage.reservations.list.confirmReservation")
                : getTranslation("manage.reservations.list.cancelReservation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ isOpen: false, reservation: null })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getTranslation("manage.reservations.list.deleteReservation")}</DialogTitle>
            <DialogDescription>
              {getTranslation("manage.reservations.list.deleteConfirmation")}
            </DialogDescription>
            {deleteDialog.reservation && (
              <div className="text-sm text-muted-foreground mt-2">
                <div className="space-y-1">
                  <div>
                    <strong>Customer:</strong> {deleteDialog.reservation.customer_name}
                  </div>
                  <div>
                    <strong>Restaurant:</strong> {deleteDialog.reservation.restaurants?.name}
                  </div>
                  <div>
                    <strong>Date:</strong> {new Date(deleteDialog.reservation.reservation_date).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Time:</strong> {deleteDialog.reservation.reservation_time}
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button
               variant="outline"
               onClick={() => setDeleteDialog({ isOpen: false, reservation: null })}
             >
               {getTranslation("manage.reservations.list.cancel")}
             </Button>
             <Button
               variant="destructive"
               onClick={handleDelete}
               disabled={loading}
             >
               {loading ? getTranslation("manage.reservations.list.deleting") : getTranslation("manage.reservations.list.deleteReservation")}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Form */}
      <ReservationForm
        isOpen={editForm.isOpen}
        onClose={closeEditForm}
        onSuccess={handleEditSuccess}
        reservation={editForm.reservation}
        mode="edit"
      />
    </>
  )
}
