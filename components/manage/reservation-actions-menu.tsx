"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { CheckCircle, Edit, MoreHorizontal, Trash2, XCircle } from "lucide-react"
import { useLanguage } from "@/context/language-context"

interface ReservationActionsMenuProps {
  onEdit: () => void
  onConfirm: () => void
  onCancel: () => void
  onDelete?: () => void
  confirmDisabled?: boolean
  cancelDisabled?: boolean
  showDelete?: boolean
}

export function ReservationActionsMenu({
  onEdit,
  onConfirm,
  onCancel,
  onDelete,
  confirmDisabled,
  cancelDisabled,
  showDelete = false,
}: ReservationActionsMenuProps) {
  const { getTranslation } = useLanguage()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)")
    const updateIsMobile = () => setIsMobile(mediaQuery.matches)

    updateIsMobile()
    mediaQuery.addEventListener("change", updateIsMobile)

    return () => {
      mediaQuery.removeEventListener("change", updateIsMobile)
    }
  }, [])

  const handleAction = (callback: () => void) => {
    setMobileOpen(false)
    callback()
  }

  const actionButtonClass =
    "w-full justify-start gap-3 rounded-xl border border-border px-4 py-3.5 text-left text-sm font-medium"

  const actionIconClass = "h-4 w-4 shrink-0"
  const triggerClassName = isMobile
    ? "h-10 w-10 p-0 text-gray-500 hover:text-gray-700"
    : "h-8 w-8 p-0 text-gray-500 hover:text-gray-700"

  return (
    <>
      {isMobile ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(true)}
            className={triggerClassName}
            aria-label={getTranslation("manage.reservations.actions.title")}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl px-4 pb-6 pt-4">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
              <SheetHeader className="text-left">
                <SheetTitle>{getTranslation("manage.reservations.actions.title")}</SheetTitle>
                <SheetDescription>{getTranslation("manage.reservations.actions.description")}</SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-3">
                <Button variant="outline" className={actionButtonClass} onClick={() => handleAction(onEdit)}>
                  <Edit className={actionIconClass} />
                  {getTranslation("manage.reservations.list.editReservation")}
                </Button>
                <Button
                  variant="outline"
                  className={actionButtonClass}
                  onClick={() => handleAction(onConfirm)}
                  disabled={confirmDisabled}
                >
                  <CheckCircle className={actionIconClass} />
                  {getTranslation("manage.reservations.list.confirmReservation")}
                </Button>
                <Button
                  variant="outline"
                  className={actionButtonClass}
                  onClick={() => handleAction(onCancel)}
                  disabled={cancelDisabled}
                >
                  <XCircle className={actionIconClass} />
                  {getTranslation("manage.reservations.list.cancelReservation")}
                </Button>
                {showDelete && onDelete && (
                  <>
                    <div className="border-t pt-3" />
                    <Button
                      variant="destructive"
                      className={actionButtonClass}
                      onClick={() => handleAction(onDelete)}
                    >
                      <Trash2 className={actionIconClass} />
                      {getTranslation("manage.reservations.list.deleteReservation")}
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={triggerClassName}>
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-56">
            <DropdownMenuItem onClick={onEdit} className="text-blue-600">
              <Edit className="mr-2 h-4 w-4" />
              {getTranslation("manage.reservations.list.editReservation")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onConfirm}
              disabled={confirmDisabled}
              className="text-green-600"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {getTranslation("manage.reservations.list.confirmReservation")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onCancel}
              disabled={cancelDisabled}
              className="text-red-600"
            >
              <XCircle className="mr-2 h-4 w-4" />
              {getTranslation("manage.reservations.list.cancelReservation")}
            </DropdownMenuItem>
            {showDelete && onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {getTranslation("manage.reservations.list.deleteReservation")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  )
}
