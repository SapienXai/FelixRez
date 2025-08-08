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
        <CardTitle className="text-2xl">Reservation Received</CardTitle>
        <CardDescription>Your reservation request has been submitted</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-b pb-4">
          <p className="text-center text-muted-foreground">
            The team at {restaurantName} will confirm your reservation shortly.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Restaurant:</span>
            <span>{restaurantName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Date:</span>
            <span>{date}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Time:</span>
            <span>{time}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => router.push("/")}>
          Return to Home
        </Button>
      </CardFooter>
    </Card>
  )
}
