"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Loader2, MoreHorizontal, CheckCircle, XCircle, Clock, Calendar, Mail, Edit } from "lucide-react"
import type { Reservation } from "@/types/supabase"
import { updateReservationStatus } from "@/app/manage/actions"
import { ReservationForm } from "./reservation-form"

interface ReservationWithRestaurant extends Reservation {
  restaurants?: {
    id: string
    name: string
  }
}

interface ReservationTableProps {
  reservations: ReservationWithRestaurant[]
  onRefresh: () => void
}

export function ReservationTable({ reservations, onRefresh }: ReservationTableProps) {
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithRestaurant | null>(null)
  const [actionType, setActionType] = useState<"confirm" | "cancel" | null>(null)
  const [notes, setNotes] = useState("")
  const [sendEmail, setSendEmail] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [editingReservation, setEditingReservation] = useState<ReservationWithRestaurant | null>(null)

  const handleAction = async () => {
    if (!selectedReservation || !actionType) return

    setIsLoading(true)

    try {
      const status = actionType === "confirm" ? "confirmed" : "cancelled"
      await updateReservationStatus(selectedReservation.id, status, notes, sendEmail)
      onRefresh()
    } catch (error) {
      console.error(`Error ${actionType}ing reservation:`, error)
    } finally {
      setIsLoading(false)
      setSelectedReservation(null)
      setActionType(null)
      setNotes("")
      setSendEmail(true)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Confirmed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Completed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (reservations.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No reservations found</div>
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Restaurant</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Party Size</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((reservation) => (
            <TableRow key={reservation.id}>
              <TableCell className="font-medium">{reservation.restaurants?.name || "Unknown Restaurant"}</TableCell>
              <TableCell>
                <div className="font-medium">{reservation.customer_name}</div>
                <div className="text-sm text-muted-foreground">{reservation.customer_phone}</div>
                <div className="text-sm text-muted-foreground flex items-center">
                  <Mail className="mr-1 h-3 w-3" />
                  {reservation.customer_email}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{new Date(reservation.reservation_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4" />
                  <span>{reservation.reservation_time}</span>
                </div>
              </TableCell>
              <TableCell>{reservation.party_size}</TableCell>
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

      <Dialog
        open={!!selectedReservation && !!actionType}
        onOpenChange={() => {
          setSelectedReservation(null)
          setActionType(null)
          setNotes("")
          setSendEmail(true)
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
