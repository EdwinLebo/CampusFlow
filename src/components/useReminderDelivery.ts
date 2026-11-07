import { assetUrl, portfolioBuild } from '../app/hosting'
import { useEffect } from 'react'
import type { Reminder } from '../domain/metrics'

export function useReminderDelivery(reminders: Reminder[], workspace: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !workspace || !('Notification' in window) || Notification.permission !== 'granted')
      return
    let active = true
    const key = 'campusflow.browser-reminders.' + workspace
    const root = workspace === 'demo' ? '/demo' : '/app'
    async function deliver() {
      const registration =
        'serviceWorker' in navigator
          ? await navigator.serviceWorker
              .register(assetUrl('reminders-sw.js'))
              .then(() => navigator.serviceWorker.ready)
              .catch(() => null)
          : null
      if (!active) return
      const notify = async () => {
        const seen: string[] = JSON.parse(localStorage.getItem(key) ?? '[]')
        const current = seen.filter((id) => reminders.some((r) => r.id === id))
        for (const reminder of reminders) {
          if (!active || current.includes(reminder.id)) continue
          const options = {
            body: reminder.detail,
            tag: reminder.id,
            icon: assetUrl('campusflow.svg'),
            data: { path: root + '/' + reminder.route, hashRouting: portfolioBuild },
          }
          if (registration) {
            const existing = await registration.getNotifications({ tag: reminder.id })
            if (!existing.length && active) await registration.showNotification(reminder.title, options)
            else if (!existing.length) return
          } else new Notification(reminder.title, options)
          current.push(reminder.id)
          localStorage.setItem(key, JSON.stringify(current))
        }
      }
      if (navigator.locks) await navigator.locks.request(key, notify)
      else await notify()
    }
    void deliver().catch(() => {
      /* In-app reminders remain available if the browser declines delivery. */
    })
    return () => {
      active = false
    }
  }, [reminders, workspace, enabled])
}
