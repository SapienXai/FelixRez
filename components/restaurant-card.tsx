/* eslint-disable @next/next/no-img-element */
"use client"

import { useLanguage } from "@/context/language-context"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

interface Restaurant {
  id: string
  name: string
  mediaType: "slideshow" | "video"
  media: string[]
  description: string
  cuisine: string
  hours: string
  atmosphere: string
  phone: string
  location: string
}

interface RestaurantCardProps {
  restaurant: Restaurant
}

const EVENTS_LINK =
  "https://www.instagram.com/s/aGlnaGxpZ2h0OjE3ODcyODAxNjc0NDc5MjIx?igsh=MTFhcmpkNHpudHpycw=="

const LOCATION_LINKS: Record<string, string> = {
  "Felix Beach": "https://maps.app.goo.gl/GZNW14ijyKa9kn4CA",
  "Felix Marina": "https://maps.app.goo.gl/RSio7uPmpb2TBCsn6",
  "Felix Selimiye": "https://maps.app.goo.gl/QKxgotppELsMr1y2A",
}

function getLocationHref(restaurant: Restaurant) {
  const customLink = LOCATION_LINKS[restaurant.name]
  if (customLink) return customLink

  if (restaurant.location.startsWith("http://") || restaurant.location.startsWith("https://")) {
    return restaurant.location
  }

  return `https://maps.google.com/?q=${encodeURIComponent(restaurant.location)}`
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const { getTranslation, currentLang } = useLanguage()
  const [currentSlide, setCurrentSlide] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (restaurant.mediaType === "slideshow" && restaurant.media.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % restaurant.media.length)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [restaurant.mediaType, restaurant.media.length])

  useEffect(() => {
    if (restaurant.mediaType === "video" && videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.warn("Video autoplay prevented:", error)
      })
    }
  }, [restaurant.mediaType])

  return (
    <div className="restaurant-card">
      <div className="card-background">
        {restaurant.mediaType === "slideshow" ? (
          restaurant.media.map((src, index) => (
            <img
              key={index}
              src={src || "/placeholder.svg"}
              alt={`${restaurant.name} slide ${index + 1}`}
              className={`slide ${index === currentSlide ? "active" : ""}`}
            />
          ))
        ) : (
          <video ref={videoRef} src={restaurant.media[0]} autoPlay loop muted playsInline poster="" />
        )}
      </div>
      
      {/* Call button in top-right corner */}
      <a href={`tel:${restaurant.phone}`} className="call-btn-corner">
        <i className="fas fa-phone"></i>
      </a>
      
      <div className="card-overlay">
        <div className="card-content">
          <div className="card-top">
            <h2>{restaurant.name}</h2>
            <p>{restaurant.description}</p>
          </div>
          <div className="card-bottom">
            <div className="info-row">
              <div className="info-item">
                <span className="info-label">{getTranslation("card.cuisine")}</span>
                <span className="info-value">{restaurant.cuisine}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{getTranslation("card.hours")}</span>
                <span className="info-value">{restaurant.hours}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{getTranslation("card.atmosphere")}</span>
                <span className="info-value">{restaurant.atmosphere}</span>
              </div>
            </div>
            <div className="action-row">
              <Link
                href={`/reserve?restaurant=${encodeURIComponent(restaurant.name)}&lang=${currentLang}`}
                className="reserve-btn"
              >
                {getTranslation("card.reserveButton")}
              </Link>
              <div className="button-group">
                <a
                  href={`https://wa.me/${restaurant.phone.replace("+", "")}`}
                  target="_blank"
                  className="contact-btn"
                  rel="noreferrer"
                >
                  <i className="fab fa-whatsapp"></i>
                  <span>{getTranslation("card.whatsappButton")}</span>
                </a>
                <a
                  href={getLocationHref(restaurant)}
                  target="_blank"
                  className="contact-btn"
                  rel="noreferrer noopener"
                >
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{getTranslation("card.locationButton")}</span>
                </a>
                <a
                  href={EVENTS_LINK}
                  target="_blank"
                  className="contact-btn events-btn"
                  rel="noreferrer"
                >
                  <i className="fas fa-calendar-alt"></i>
                  <span>{getTranslation("card.eventsButton")}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
