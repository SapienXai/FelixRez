"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react"
import { useLanguage } from "@/context/language-context"
import Image from "next/image"

function getPostLoginRedirectPath() {
  if (typeof window === "undefined") {
    return "/manage"
  }

  const redirect = new URLSearchParams(window.location.search).get("redirect")
  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//") && redirect !== "/manage/login") {
    return redirect
  }

  return "/manage"
}

async function syncAuthCookie(event: string, session: unknown) {
  await fetch("/auth/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, session }),
  })
}

export default function LoginPage() {
  const { getTranslation } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // If already logged in, redirect to dashboard
  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        const loggedOut = new URLSearchParams(window.location.search).get("logged_out") === "1"
        if (loggedOut) {
          await supabase.auth.signOut({ scope: "local" })
          if (mounted) {
            setIsCheckingSession(false)
          }
          return
        }

        const { data } = await supabase.auth.getSession()
        if (!mounted) {
          return
        }

        if (data.session) {
          await syncAuthCookie("SIGNED_IN", data.session)
          if (mounted) {
            router.replace(getPostLoginRedirectPath())
          }
          return
        }

        setIsCheckingSession(false)
      } catch (err) {
        console.warn("Failed to check existing session:", err)
        if (mounted) {
          setIsCheckingSession(false)
        }
      }
    }
    init()

    // Keep cookies in sync with middleware via auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        await syncAuthCookie(event, session)
      } catch (err) {
        console.warn("Failed to sync auth cookie:", err)
      }

      if (event === "SIGNED_IN" && session) {
        router.replace(getPostLoginRedirectPath())
      }

      if (event === "SIGNED_OUT") {
        setIsCheckingSession(false)
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
        await syncAuthCookie("SIGNED_IN", data.session)
      } catch {}
      router.replace(getPostLoginRedirectPath())
    } catch (error: any) {
      setError(error.message || getTranslation("manage.login.errorFallback"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4efe7] px-4 py-8 text-stone-950 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(217,119,6,0.18),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(15,118,110,0.18),transparent_28%),linear-gradient(135deg,#f8f3ea_0%,#efe3d2_48%,#d8c2a3_100%)]" />
      <div className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl" />
      <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-teal-700/20 blur-3xl" />

      <section className="absolute inset-y-6 left-6 hidden w-[42vw] overflow-hidden rounded-[2rem] border border-white/30 shadow-2xl lg:block">
        <Image
          src="/assets/felixBanner.jpeg"
          alt="Felix restaurant atmosphere"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/30 to-amber-950/60" />
        <div className="absolute inset-x-8 top-8 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-xl ring-1 ring-white/25">
              <Image src="/assets/felix.png" alt="Felix Logo" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.28em] text-white/80">FELIX</p>
              <p className="text-xs text-white/60">{getTranslation("manage.login.brandSubtitle")}</p>
            </div>
          </div>
          <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur-xl">
            {getTranslation("manage.login.secureAccess")}
          </div>
        </div>

        <div className="absolute bottom-8 left-8 right-8 text-white">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white/85 backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5" />
            {getTranslation("manage.login.heroEyebrow")}
          </div>
          <h1 className="max-w-xl text-5xl font-semibold leading-[0.95] tracking-tight">
            {getTranslation("manage.login.heroTitle")}
          </h1>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              getTranslation("manage.login.featureDashboard"),
              getTranslation("manage.login.featureReservations"),
              getTranslation("manage.login.featureServiceList"),
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                  {getTranslation("manage.login.featureLabel")}
                </p>
                <p className="mt-2 text-sm font-semibold text-white/90">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div
        className={`relative z-10 w-full rounded-[2rem] border border-white/70 bg-white/70 shadow-[0_24px_80px_rgba(67,45,24,0.18)] backdrop-blur-2xl transition-all duration-500 ease-out ${
          isCheckingSession ? "max-w-sm p-8 text-center" : "max-w-[440px] p-5 sm:p-7"
        }`}
      >
        {isCheckingSession ? (
          <div className="animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/75 shadow-xl ring-1 ring-stone-900/10">
              <Image src="/assets/felix.png" alt="Felix Logo" width={42} height={42} className="object-contain" />
            </div>
            <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin text-stone-700" />
            <p className="text-sm font-semibold text-stone-900">{getTranslation("manage.login.checkingSession")}</p>
            <p className="mt-2 text-xs leading-5 text-stone-600">
              {getTranslation("manage.login.checkingSessionDescription")}
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-3 duration-500">
            <div className="mb-8 flex items-center justify-center lg:hidden">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/70 shadow-xl ring-1 ring-stone-900/10 backdrop-blur-xl">
                <Image src="/assets/felix.png" alt="Felix Logo" width={42} height={42} className="object-contain" />
              </div>
            </div>

            <div className="mb-7">
              <h2 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                {getTranslation("manage.login.title")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {getTranslation("manage.login.description")}
              </p>
            </div>

            {error && (
              <Alert
                variant="destructive"
                className="mb-5 border-red-200 bg-red-50/90 text-red-800 animate-in slide-in-from-top-2 duration-300"
              >
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-stone-800">
                  {getTranslation("manage.login.email")}
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-[52px] rounded-2xl border-stone-200/90 bg-white/80 pl-11 pr-4 text-stone-950 shadow-sm transition-all placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-amber-700/25"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="password" className="text-sm font-semibold text-stone-800">
                    {getTranslation("manage.login.password")}
                  </Label>
                  <Link
                    href="/manage/reset-password"
                    className="text-sm font-semibold text-amber-800 transition-colors hover:text-amber-950"
                  >
                    {getTranslation("manage.login.forgot")}
                  </Link>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-[52px] rounded-2xl border-stone-200/90 bg-white/80 pl-11 pr-12 text-stone-950 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-amber-700/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-[52px] w-full rounded-2xl bg-stone-950 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(28,25,23,0.22)] transition-all hover:-translate-y-0.5 hover:bg-stone-800 hover:shadow-[0_20px_44px_rgba(28,25,23,0.28)] disabled:translate-y-0 disabled:opacity-60"
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

            <div className="mt-7 rounded-2xl border border-stone-900/10 bg-stone-950/[0.03] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-emerald-100 p-2 text-emerald-800">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900">
                    {getTranslation("manage.login.protectedTitle")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-stone-600">
                    {getTranslation("manage.login.protectedDescription")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
