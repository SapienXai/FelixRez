import { RestaurantGrid } from "@/components/restaurant-grid"
import { AppHeader } from "@/components/app-header"
import { Footer } from "@/components/footer"
import { RecentReservation } from "@/components/recent-reservation"

export default function Home() {
  return (
    <div className="index-page">
      <AppHeader isIndexPage />
      <div className="index-page-content-wrapper">
        <RecentReservation />
        <RestaurantGrid />
        <Footer />
      </div>
    </div>
  )
}
