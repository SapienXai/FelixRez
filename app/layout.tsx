import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "../styles/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/context/language-context"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Felix Reservations",
  description: "Premium Dining & Table Reservations: Experience culinary excellence at Felix Restaurants. Book your table at our stunning locations with waterfront views and exceptional cuisine.",
  keywords: "Felix Restaurants, table reservation, fine dining, restaurant booking, waterfront dining, luxury restaurants, Turkish cuisine, seafood restaurant, beach dining, marina restaurant, garden restaurant, Marmaris restaurants, premium dining, culinary excellence",
  authors: [{ name: "Felix Restaurants" }],
  creator: "Felix Restaurants",
  publisher: "Felix Restaurants",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://reserve.felixsmile.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en-US',
      'tr-TR': '/tr-TR',
    },
  },
  openGraph: {
    title: "Felix Reservations",
    description: "Premium Dining & Table Reservations: Experience culinary excellence at Felix Restaurants. Book your table at our stunning locations with waterfront views and exceptional cuisine.",
    url: 'https://reserve.felixsmile.com',
    siteName: 'Felix Restaurants',
    images: [
      {
        url: '/assets/felixBanner.jpeg',
        width: 1200,
        height: 630,
        alt: 'Felix Restaurants - Premium Dining Experience',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Felix Reservations",
    description: "Premium Dining & Table Reservations: Experience culinary excellence at Felix Restaurants. Book your table at our stunning locations with waterfront views and exceptional cuisine.",
    images: ['/assets/felixBanner.jpeg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
  category: 'restaurant',
  generator: 'Next.js'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#1e40af" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Felix Restaurants" />
        <link rel="apple-touch-icon" href="/assets/felix.png" />
        <link rel="icon" type="image/png" href="/assets/felix.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Restaurant",
              "name": "Felix Restaurants",
              "description": "Experience culinary excellence at Felix Restaurants. Premium dining with waterfront views and exceptional cuisine.",
              "url": "https://reserve.felixsmile.com",
              "logo": "https://reserve.felixsmile.com/assets/felix.png",
              "image": "https://reserve.felixsmile.com/assets/felixBanner.jpeg",
              "telephone": "+90-252-XXX-XXXX",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "Marmaris",
                "addressLocality": "Marmaris",
                "addressRegion": "Muğla",
                "addressCountry": "Turkey"
              },
              "servesCuisine": ["Turkish", "Seafood", "Mediterranean", "International"],
              "priceRange": "$$$",
              "acceptsReservations": true,
              "hasMenu": true,
              "openingHours": "Mo-Su 17:00-23:00",
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "reviewCount": "150"
              }
            })
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <LanguageProvider>{children}</LanguageProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
