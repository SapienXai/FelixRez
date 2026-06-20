const MANAGE_SW_VERSION = "manage-offline-v6"
const MANAGE_SHELL_CACHE = `${MANAGE_SW_VERSION}:shell`
const MANAGE_STATIC_CACHE = `${MANAGE_SW_VERSION}:static`
const MANAGE_ROUTE_PATHS = ["/manage", "/manage/reservations", "/manage/seating"]
const MANAGE_SHELL_URLS = MANAGE_ROUTE_PATHS.map((path) => new URL(path, self.location.origin).href)
const CACHE_NAMES = [MANAGE_SHELL_CACHE, MANAGE_STATIC_CACHE]

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isNextStaticRequest(url) {
  return isSameOrigin(url) && url.pathname.startsWith("/_next/static/")
}

function isPublicAssetRequest(url) {
  if (!isSameOrigin(url)) {
    return false
  }

  return (
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/felixlogo.png" ||
    url.pathname === "/placeholder-logo.png" ||
    url.pathname === "/placeholder-logo.svg" ||
    url.pathname === "/placeholder-user.jpg" ||
    url.pathname === "/placeholder.jpg" ||
    url.pathname === "/placeholder.svg"
  )
}

function isManageNavigationRequest(request, url) {
  return (
    request.mode === "navigate" &&
    isSameOrigin(url) &&
    MANAGE_ROUTE_PATHS.includes(url.pathname)
  )
}

function shouldBypassCache(request, url) {
  if (request.method !== "GET") {
    return true
  }

  if (!isSameOrigin(url)) {
    return true
  }

  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname === "/manage/login" ||
    url.pathname === "/manage/reset-password" ||
    url.pathname === "/manage/update-password" ||
    url.pathname.startsWith("/manage/seating/pdf")
  )
}

function canonicalManageRequest(url) {
  return new Request(new URL(url.pathname, self.location.origin).href, {
    credentials: "include",
    headers: { Accept: "text/html" },
  })
}

function isCacheableManageShellResponse(response) {
  if (!response || !response.ok || response.type !== "basic" || response.redirected) {
    return false
  }

  try {
    const responseUrl = new URL(response.url)
    return isSameOrigin(responseUrl) && MANAGE_ROUTE_PATHS.includes(responseUrl.pathname)
  } catch {
    return false
  }
}

async function cacheManageShellUrl(url) {
  try {
    const request = typeof url === "string" ? new Request(url, { credentials: "include" }) : url
    const response = await fetch(request)
    if (isCacheableManageShellResponse(response)) {
      const cache = await caches.open(MANAGE_SHELL_CACHE)
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    return null
  }
}

async function prefetchManageShell() {
  await Promise.all(MANAGE_SHELL_URLS.map((url) => cacheManageShellUrl(url)))
}

async function cacheStaticUrl(url) {
  try {
    const parsedUrl = new URL(url, self.location.origin)
    if (!isNextStaticRequest(parsedUrl) && !isPublicAssetRequest(parsedUrl)) {
      return
    }

    const request = new Request(parsedUrl.href, { credentials: "same-origin" })
    const response = await fetch(request)
    if (response && response.ok) {
      const cache = await caches.open(MANAGE_STATIC_CACHE)
      await cache.put(request, response.clone())
    }
  } catch {}
}

async function cacheStaticUrls(urls) {
  if (!Array.isArray(urls)) {
    return
  }

  const uniqueUrls = Array.from(new Set(urls.filter((url) => typeof url === "string")))
  await Promise.all(uniqueUrls.map((url) => cacheStaticUrl(url)))
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response && response.ok) {
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response(null, { status: 504, statusText: "Offline" })
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null)

  if (cached) {
    return cached
  }

  return await network || new Response(null, { status: 504, statusText: "Offline" })
}

async function handleManageNavigation(request, url) {
  const canonicalRequest = canonicalManageRequest(url)

  try {
    const response = await fetch(request)
    if (isCacheableManageShellResponse(response)) {
      const cache = await caches.open(MANAGE_SHELL_CACHE)
      await cache.put(canonicalRequest, response.clone())
    }
    return response
  } catch {
    const cache = await caches.open(MANAGE_SHELL_CACHE)
    const exact = await cache.match(request)
    if (exact) return exact

    const canonical = await cache.match(canonicalRequest)
    if (canonical) return canonical

    const manageShell = await cache.match(new Request(new URL("/manage", self.location.origin).href))
    if (manageShell) return manageShell

    return new Response(
      "<!doctype html><html><head><title>Felix Offline</title><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head><body><main style=\"font-family:system-ui,sans-serif;padding:24px\"><h1>Offline</h1><p>Manage panel shell is not cached yet. Connect once while online and reopen the manage panel.</p></main></body></html>",
      {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    )
  }
}

async function clearManageCaches() {
  await Promise.all(CACHE_NAMES.map((cacheName) => caches.delete(cacheName)))
}

self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(prefetchManageShell())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("manage-offline-") && !CACHE_NAMES.includes(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then((clientList) => {
        for (const client of clientList) {
          client.postMessage({ type: "MANAGE_SW_ACTIVATED", version: MANAGE_SW_VERSION })
        }
      })
  )
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "PREFETCH_MANAGE_SHELL") {
    event.waitUntil(prefetchManageShell())
  }

  if (event.data?.type === "CACHE_STATIC_URLS") {
    event.waitUntil(cacheStaticUrls(event.data.urls))
  }

  if (event.data?.type === "CLEAR_MANAGE_OFFLINE_CACHE") {
    event.waitUntil(clearManageCaches())
  }

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (shouldBypassCache(request, url)) {
    return
  }

  if (isManageNavigationRequest(request, url)) {
    event.respondWith(handleManageNavigation(request, url))
    return
  }

  if (isNextStaticRequest(url)) {
    event.respondWith(cacheFirst(request, MANAGE_STATIC_CACHE))
    return
  }

  if (isPublicAssetRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, MANAGE_STATIC_CACHE))
  }
})

self.addEventListener("push", (event) => {
  let data = {}

  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const title = data.title || "Felix Reservations"
  const options = {
    body: data.body || "Reservation activity received.",
    icon: data.icon || "/felixlogo.png",
    badge: data.badge || "/felixlogo.png",
    data: {
      url: data.url || "/manage/reservations",
      reservationId: data.reservationId,
      event: data.event,
    },
    tag: data.reservationId ? `reservation-${data.reservationId}-${data.event || "activity"}` : undefined,
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const targetUrl = new URL(event.notification.data?.url || "/manage/reservations", self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client && client.url.startsWith(self.location.origin)) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
