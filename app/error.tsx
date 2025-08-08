"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  // Check if the error is related to the language context
  const isLanguageError = error.message?.includes("useLanguage") || error.message?.includes("LanguageProvider")

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-6xl font-bold text-gray-900">Error</h1>
      <h2 className="mt-4 text-2xl font-medium text-gray-700">Something went wrong</h2>
      <p className="mt-2 text-gray-500">We apologize for the inconvenience. Please try again later.</p>
      {isLanguageError && (
        <p className="mt-2 text-amber-600">
          There was an issue with the language system. Try refreshing the page or clearing your browser cache.
        </p>
      )}
      <div className="mt-8 flex gap-4">
        <button
          onClick={reset}
          className="px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
        <Link href="/" className="px-6 py-3 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors">
          Return Home
        </Link>
      </div>
    </div>
  )
}
