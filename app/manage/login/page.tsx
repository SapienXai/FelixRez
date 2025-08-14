"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { useLanguage } from "@/context/language-context"

export default function LoginPage() {
  const { getTranslation } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // If already logged in, redirect to dashboard
  useEffect(() => {
    let mounted = true
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (mounted && data.session) {
        router.replace("/manage")
      }
    }
    init()

    // Keep cookies in sync with middleware via auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        await fetch("/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event, session }),
        })
      } catch (err) {
        console.warn("Failed to sync auth cookie:", err)
      }
      if (event === "SIGNED_IN") {
        router.replace("/manage")
      }
    })

    return () => {
      mounted = false
      subscription?.subscription?.unsubscribe?.()
    }
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        throw error
      }
      // Ensure cookie is set for middleware immediately
      try {
        await fetch("/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "SIGNED_IN", session: data.session }),
        })
      } catch {}
      router.replace("/manage")
    } catch (error: any) {
      setError(error.message || getTranslation("manage.login.errorFallback"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
      <div className="absolute inset-0 bg-[url('/assets/felixBanner.jpeg')] bg-cover bg-center opacity-5"></div>
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 backdrop-blur-sm bg-white/95 animate-in fade-in-0 zoom-in-95 duration-500 slide-in-from-bottom-4">
        <CardHeader className="space-y-6 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center shadow-lg">
            <img src="/assets/felix.png" alt="Felix Logo" className="w-12 h-12 object-contain" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              {getTranslation("manage.login.title")}
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              {getTranslation("manage.login.description")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          {error && (
            <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50 animate-in slide-in-from-top-2 duration-300">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                {getTranslation("manage.login.email")}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50 focus:bg-white"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  {getTranslation("manage.login.password")}
                </Label>
                <Link 
                  href="/manage/reset-password" 
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200 font-medium"
                >
                  {getTranslation("manage.login.forgot")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-gray-50 focus:bg-white"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {getTranslation("manage.login.signingIn")}
                </>
              ) : (
                getTranslation("manage.login.submit")
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center px-8 pb-8 pt-4">
          <div className="text-center space-y-2">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
            <p className="text-sm text-gray-500 font-medium">{getTranslation("manage.login.restricted")}</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
