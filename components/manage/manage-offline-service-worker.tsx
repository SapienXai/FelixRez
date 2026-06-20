"use client"

import { useEffect } from "react"

const MANAGE_SW_RELOAD_KEY = "felix:manage:sw-reloaded-version"
const MANAGE_CACHE_VERSION = "manage-offline-v6"
const MANAGE_SHELL_CACHE = `${MANAGE_CACHE_VERSION}:shell`
const MANAGE_STATIC_CACHE = `${MANAGE_CACHE_VERSION}:static`
const MANAGE_SHELL_PATHS = ["/manage", "/manage/reservations", "/manage/seating"]

function postManageShellPrefetch(registration: ServiceWorkerRegistration) {
  const worker = registration.active || registration.waiting || registration.installing
  worker?.postMessage({ type: "PREFETCH_MANAGE_SHELL" })
}

function isCacheableStaticAsset(url: string) {
  try {
    const parsedUrl = new URL(url, window.location.origin)
    return parsedUrl.origin === window.location.origin && (
      parsedUrl.pathname.startsWith("/_next/static/") ||
      parsedUrl.pathname.startsWith("/assets/") ||
      parsedUrl.pathname === "/felixlogo.png"
    )
  } catch {
    return false
  }
}

function collectStaticAssetUrls() {
  const urls = new Set<string>()

  document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src],link[href]").forEach((element) => {
    const url = "src" in element ? element.src : element.href
    if (url && isCacheableStaticAsset(url)) {
      urls.add(url)
    }
  })

  performance.getEntriesByType("resource").forEach((entry) => {
    if (isCacheableStaticAsset(entry.name)) {
      urls.add(entry.name)
    }
  })

  return Array.from(urls)
}

function postStaticAssetCache(registration: ServiceWorkerRegistration) {
  const urls = collectStaticAssetUrls()
  if (urls.length === 0) {
    return
  }

  const worker = registration.active || registration.waiting || registration.installing
  worker?.postMessage({ type: "CACHE_STATIC_URLS", urls })
}

async function cacheResponse(cacheName: string, request: Request) {
  if (!("caches" in window)) {
    return
  }

  try {
    const response = await fetch(request)
    if (response.ok && response.type === "basic" && !response.redirected) {
      const cache = await window.caches.open(cacheName)
      await cache.put(request, response.clone())
    }
  } catch {}
}

async function cacheManageShellInBrowser() {
  await Promise.all(
    MANAGE_SHELL_PATHS.map((path) => (
      cacheResponse(
        MANAGE_SHELL_CACHE,
        new Request(new URL(path, window.location.origin).href, {
          credentials: "include",
          headers: { Accept: "text/html" },
        })
      )
    ))
  )
}

async function cacheStaticAssetsInBrowser() {
  const urls = collectStaticAssetUrls()
  await Promise.all(
    urls.map((url) => (
      cacheResponse(
        MANAGE_STATIC_CACHE,
        new Request(url, { credentials: "same-origin" })
      )
    ))
  )
}

function cacheManageOfflineAssetsInBrowser() {
  void cacheManageShellInBrowser()
  void cacheStaticAssetsInBrowser()
}

function reloadForServiceWorkerUpdate(version?: string) {
  const reloadKey = version || "unknown"
  if (window.sessionStorage.getItem(MANAGE_SW_RELOAD_KEY) === reloadKey) {
    return
  }

  window.sessionStorage.setItem(MANAGE_SW_RELOAD_KEY, reloadKey)
  window.location.reload()
}

export function ManageOfflineServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return
    }

    let cancelled = false
    let controllerChanged = false
    let cleanupStaticAssetCaching = () => {}

    const handleControllerChange = () => {
      if (controllerChanged) {
        return
      }

      controllerChanged = true
      reloadForServiceWorkerUpdate("controller-change")
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "MANAGE_SW_ACTIVATED") {
        reloadForServiceWorkerUpdate(event.data.version)
      }
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange)
    navigator.serviceWorker.addEventListener("message", handleMessage)

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        if (cancelled) {
          return
        }

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" })
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing
          if (!installingWorker) {
            return
          }

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              installingWorker.postMessage({ type: "SKIP_WAITING" })
            }
          })
        })

        void registration.update()
        postManageShellPrefetch(registration)
        postStaticAssetCache(registration)
        cacheManageOfflineAssetsInBrowser()

        try {
          const readyRegistration = await navigator.serviceWorker.ready
          if (!cancelled) {
            postManageShellPrefetch(readyRegistration)
            postStaticAssetCache(readyRegistration)
            cacheManageOfflineAssetsInBrowser()

            const cacheAssets = () => {
              postStaticAssetCache(readyRegistration)
              cacheManageOfflineAssetsInBrowser()
            }
            const cacheAssetsTimeoutId = window.setTimeout(cacheAssets, 1000)
            const cacheAssetsIntervalId = window.setInterval(cacheAssets, 5000)
            let observer: PerformanceObserver | null = null

            if ("PerformanceObserver" in window) {
              observer = new PerformanceObserver((list) => {
                const urls = list.getEntries()
                  .map((entry) => entry.name)
                  .filter(isCacheableStaticAsset)

                if (urls.length > 0) {
                  const worker = readyRegistration.active || readyRegistration.waiting || readyRegistration.installing
                  worker?.postMessage({ type: "CACHE_STATIC_URLS", urls })
                }
              })

              try {
                observer.observe({ type: "resource", buffered: true })
              } catch {
                observer = null
              }
            }

            cleanupStaticAssetCaching = () => {
              window.clearTimeout(cacheAssetsTimeoutId)
              window.clearInterval(cacheAssetsIntervalId)
              observer?.disconnect()
            }
          }
        } catch (error) {
          console.warn("Manage offline service worker is not ready:", error)
        }
      })
      .catch((error) => {
        console.warn("Failed to register manage offline service worker:", error)
      })

    return () => {
      cancelled = true
      cleanupStaticAssetCaching()
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange)
      navigator.serviceWorker.removeEventListener("message", handleMessage)
    }
  }, [])

  return null
}
