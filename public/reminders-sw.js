const cacheName = 'campusflow-push-state'
const cachePath = '/.campusflow/push-device'

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = event.notification.data?.path
  if (typeof path !== 'string' || !/^\/(demo|app)\/(assignments|exams|planner|focus)$/.test(path)) return
  event.waitUntil(
    (async () => {
      const relative = event.notification.data?.hashRouting ? '#' + path : path.slice(1)
      const url = new URL(relative, self.registration.scope).href
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find((client) => client.url === url)
      if (existing) await existing.focus()
      else await self.clients.openWindow(url)
    })(),
  )
})
self.addEventListener('push', (event) => {
  let data
  try {
    data = event.data?.json()?.data
  } catch {
    return
  }
  if (data?.campusflow !== '1' || !/^\/app\/(assignments|exams|planner)$/.test(data.path)) return
  event.waitUntil(
    (async () => {
      const registration = await (await caches.open(cacheName)).match(cachePath)
      const device = await registration?.json()
      if (!device || device.id !== data.deviceId || device.expiresAt <= Date.now()) return
      await self.registration.showNotification(data.title, {
        body: data.body,
        tag: data.tag,
        icon: new URL('campusflow.svg', self.registration.scope).href,
        data: { path: data.path },
      })
    })(),
  )
})
