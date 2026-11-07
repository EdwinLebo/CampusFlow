import { assetUrl } from '../app/hosting'
import { deleteDoc, doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { app, db } from './firebase'
import { useEmulators } from './firebaseConfig'

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
export const pushConfigured = Boolean(app?.options.messagingSenderId && vapidKey && !useEmulators)
const keyFor = (uid: string) => 'campusflow.push-device.' + uid
const cacheName = 'campusflow-push-state'
const cachePath = '/.campusflow/push-device'
interface Device {
  id: string
  expiresAt: number
}
function deviceFor(uid: string): Device | null {
  try {
    return JSON.parse(localStorage.getItem(keyFor(uid)) ?? 'null') as Device | null
  } catch {
    return null
  }
}
export const pushEnabled = (uid: string) =>
  pushConfigured && (deviceFor(uid)?.expiresAt ?? 0) > Date.now()

export async function enablePush(uid: string) {
  if (!pushConfigured || !app || !db) throw new Error('Scheduled push is not configured.')
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging')
  if (!(await isSupported()) || !('caches' in window))
    throw new Error('This browser does not support push notifications.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Browser notification permission was not granted.')
  await navigator.serviceWorker.register(assetUrl('reminders-sw.js'))
  const serviceWorkerRegistration = await navigator.serviceWorker.ready
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration })
  if (!token) throw new Error('This browser did not return a notification token.')
  const device = {
    id: deviceFor(uid)?.id ?? crypto.randomUUID(),
    expiresAt: Date.now() + 45 * 86_400_000,
  }
  await setDoc(doc(db, 'users', uid, 'pushDevices', device.id), {
    token,
    updatedAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(device.expiresAt),
  })
  const cache = await caches.open(cacheName)
  await cache.put(cachePath, new Response(JSON.stringify(device)))
  localStorage.setItem(keyFor(uid), JSON.stringify(device))
  window.dispatchEvent(new Event('campusflow-push-changed'))
}

export async function clearLocalPush(uid: string) {
  if (!deviceFor(uid)) return
  if ('caches' in window) await (await caches.open(cacheName)).delete(cachePath)
  localStorage.removeItem(keyFor(uid))
  window.dispatchEvent(new Event('campusflow-push-changed'))
}

export async function disablePush(uid: string) {
  const device = deviceFor(uid)
  if (!device || !db) return
  await clearLocalPush(uid)
  if (navigator.onLine) await deleteDoc(doc(db, 'users', uid, 'pushDevices', device.id))
}
