// Plain Web Push service worker — no Firebase SDK, no build step, nothing
// to inject. Just listens for a push event and shows a notification. Free
// and standard: every major browser implements this without any paid
// backend service required.

self.addEventListener('push', (event) => {
    let data = {}
    try {
        data = event.data ? event.data.json() : {}
    } catch {
        data = { title: 'CalTrack', body: event.data ? event.data.text() : '' }
    }

    const title = data.title || 'CalTrack'
    const options = {
        body: data.body || '',
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: data.tag || 'caltrack-reminder',
    }

    event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            const existing = clients.find((c) => 'focus' in c)
            if (existing) return existing.focus()
            return self.clients.openWindow('/')
        })
    )
})
