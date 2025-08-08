"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, Clock, Edit } from "lucide-react"
import type { Reservation } from "@/types/supabase"
import { updateReservationStatus } from "@/app/manage/actions"
import { toast } from "sonner"
import { ReservationForm } from "@/components/manage/reservation-form"
import { usePagination } from "@/hooks/use-pagination"
import { PaginationControls } from "@/components/ui/pagination-controls"

interface ReservationWithRestaurant extends Reservation {
  restaurants?: {
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
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean
    reservation: ReservationWithRestaurant | null
    action: "confirm" | "cancel" | null
  }>({ isOpen: false, reservation: null, action: null })
  const [editForm, setEditForm] = useState<{
    isOpen: boolean
    reservation: ReservationWithRestaurant | null
  }>({ isOpen: false, reservation: null })
  const [notes, setNotes] = useState("")
  const [sendEmail, setSendEmail] = useState(true)
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
        sendEmail
      )

      if (result.success) {
        toast.success(result.message)
        onStatusChange()
        setActionDialog({ isOpen: false, reservation: null, action: null })
        setNotes("")
        setSendEmail(true)
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
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirmed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
    }
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No reservations found</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Restaurant</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Party Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell className="font-medium">
                  {reservation.restaurants?.name || "Unknown Restaurant"}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{reservation.customer_name}</div>
                    <div className="text-sm text-gray-500">{reservation.customer_phone}</div>
                    {reservation.customer_email && (
                      <div className="text-sm text-gray-500">{reservation.customer_email}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div>{new Date(reservation.reservation_date).toLocaleDateString()}</div>
                    <div className="text-sm text-gray-500">{reservation.reservation_time}</div>
                  </div>
                </TableCell>
                <TableCell>{reservation.party_size}</TableCell>
                <TableCell>{getStatusBadge(reservation.status || "pending")}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditForm(reservation)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    {reservation.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openActionDialog(reservation, "confirm")}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Confirm
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openActionDialog(reservation, "cancel")}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "confirm" ? "Confirm Reservation" : "Cancel Reservation"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.reservation && (
                <div className="space-y-2">
                  <p>
                    <strong>Customer:</strong> {actionDialog.reservation.customer_name}
                  </p>
                  <p>
                    <strong>Restaurant:</strong> {actionDialog.reservation.restaurants?.name}
                  </p>
                  <p>
                    <strong>Date:</strong> {new Date(actionDialog.reservation.reservation_date).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Time:</strong> {actionDialog.reservation.reservation_time}
                  </p>
                  <p>
                    <strong>Party Size:</strong> {actionDialog.reservation.party_size}
                  </p>
                </div>
              )}
            </DialogDescription>
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
              Cancel
            </Button>
            <Button onClick={handleAction} disabled={loading}>
              {loading
                ? "Processing..."
                : actionDialog.action === "confirm"
                ? "Confirm Reservation"
                : "Cancel Reservation"}
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
