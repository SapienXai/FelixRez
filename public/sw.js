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
