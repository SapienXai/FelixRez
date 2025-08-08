"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { LayoutDashboard, CalendarClock, Store, Users, X } from "lucide-react"
import { useLanguage } from "@/context/language-context"

interface ManageSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function ManageSidebar({ isOpen, onClose }: ManageSidebarProps) {
  const pathname = usePathname()
  const { currentLang, getTranslation } = useLanguage()

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  const navigation = [
    {
      name: getTranslation("manage.sidebar.dashboard"),
      href: "/manage",
      icon: LayoutDashboard,
      current: isActive("/manage") && !isActive("/manage/reservations") && !isActive("/manage/restaurants") && !isActive("/manage/users"),
    },
    {
      name: getTranslation("manage.sidebar.reservations"),
      href: "/manage/reservations",
      icon: CalendarClock,
      current: isActive("/manage/reservations"),
    },
    {
      name: getTranslation("manage.sidebar.restaurants"),
      href: "/manage/restaurants",
      icon: Store,
      current: isActive("/manage/restaurants"),
    },
    {
      name: getTranslation("manage.sidebar.users"),
      href: "/manage/users",
      icon: Users,
      current: isActive("/manage/users"),
    },
  ]

  // For larger screens
  const sidebarContent = (
    <>
      <div className="flex h-16 items-center border-b px-4">
        <Link href={`/manage?lang=${currentLang}`} className="flex items-center">
          <span className="text-xl font-bold">Felix</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={`${item.href}?lang=${currentLang}`}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                item.current ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          ))}
        </nav>
      </ScrollArea>
    </>
  )

  // For mobile screens
  return (
    <>
      {/* Mobile sidebar */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-64 p-0 bg-white">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link href={`/manage?lang=${currentLang}`} className="flex items-center" onClick={onClose}>
              <span className="text-xl font-bold">Felix</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close sidebar</span>
            </Button>
          </div>
          <ScrollArea className="flex-1 px-2 py-4">
            <nav className="flex flex-col gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={`${item.href}?lang=${currentLang}`}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    item.current ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                  onClick={onClose}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden h-screen w-64 flex-col border-r bg-white md:flex">{sidebarContent}</div>
    </>
  )
}
