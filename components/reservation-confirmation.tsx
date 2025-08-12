"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/language-context"

interface ReservationConfirmationProps {
  restaurantName: string
  date: string
  time: string
}

export function ReservationConfirmation({ restaurantName, date, time }: ReservationConfirmationProps) {
  const router = useRouter()
  const { getTranslation } = useLanguage()

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <CardTitle className="text-2xl">{getTranslation("reserve.confirmation.title")}</CardTitle>
        <CardDescription>{getTranslation("reserve.confirmation.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-b pb-4">
          <p className="text-center text-muted-foreground">
            {getTranslation("reserve.confirmation.note", { restaurant: restaurantName })}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">{getTranslation("reserve.confirmation.restaurant")}:</span>
            <span>{restaurantName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">{getTranslation("reserve.confirmation.date")}:</span>
            <span>{date}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">{getTranslation("reserve.confirmation.time")}:</span>
            <span>{time}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => router.push("/")}>{getTranslation("reserve.confirmation.homeButton")}</Button>
      </CardFooter>
    </Card>
  )
}
