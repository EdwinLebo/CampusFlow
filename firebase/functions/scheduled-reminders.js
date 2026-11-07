import { createHash } from 'node:crypto'
import { FieldPath, Timestamp, getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { error as logError } from 'firebase-functions/logger'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { reminderId, reminderPhase } from './reminder-policy.js'

const DAY = 86_400_000
const pageSize = 80
const reminderTypes = [
  {
    kind: 'assignments',
    field: 'due',
    route: 'assignments',
    body: 'An assignment deadline needs your attention.',
  },
  { kind: 'exams', field: 'start', route: 'exams', body: 'An exam is coming up.' },
  { kind: 'studySessions', field: 'start', route: 'planner', body: 'A study session is coming up.' },
]

async function pendingReminders(workspace, now, leads) {
  const maximum = Math.max(0, ...leads) * DAY
  const entries = await Promise.all(
    reminderTypes.map(async ({ kind, field, route, body }) => {
      const assignment = kind === 'assignments'
      const snapshot = await workspace
        .collection(kind)
        .where(field, '>=', now - (assignment ? DAY : 0))
        .where(field, '<=', now + maximum)
        .get()
      return snapshot.docs.flatMap((doc) => {
        const item = doc.data()
        if (item.completedAt || ['Completed', 'Submitted'].includes(item.status)) return []
        const start = item[field]
        const phase = reminderPhase(start, now, leads, assignment)
        return phase === null
          ? []
          : [
              {
                id: reminderId(doc.id, start, phase),
                path: '/app/' + route,
                body: phase === 'late' ? 'An assignment deadline has passed.' : body,
              },
            ]
      })
    }),
  )
  return entries.flat()
}

async function deliver(db, device, reminder, now, send) {
  const workspace = device.ref.parent.parent
  const token = device.get('token')
  const digest = createHash('sha256')
    .update(token + '|' + reminder.id)
    .digest('hex')
  const sent = workspace.collection('pushDeliveries').doc(digest)
  const lock = db.collection('accountDeletions').doc(workspace.id)
  const claim = await db.runTransaction(async (tx) => {
    const [deleting, previous] = await Promise.all([tx.get(lock), tx.get(sent)])
    if (deleting.exists || previous.exists) return false
    tx.create(sent, { expiresAt: Timestamp.fromMillis(now + 35 * DAY) })
    return true
  })
  if (!claim) return
  try {
    await send({
      token,
      data: {
        campusflow: '1',
        deviceId: device.id,
        title: 'CampusFlow reminder',
        body: reminder.body,
        path: reminder.path,
        tag: reminder.id,
      },
      webpush: { headers: { TTL: '3600' } },
    })
  } catch (error) {
    if (
      error?.code === 'messaging/registration-token-not-registered' ||
      error?.code === 'messaging/invalid-registration-token'
    ) {
      // A client may have registered a new token since the scheduler read this device.
      await db.runTransaction(async (tx) => {
        const current = await tx.get(device.ref)
        if (current.get('token') === token) tx.delete(device.ref)
      })
    } else {
      await sent.delete()
      throw error
    }
  }
}

export async function runStudyReminders(db, send, now = Date.now()) {
  const workspaces = new Map()
  let cursor
  for (;;) {
    const base = db.collectionGroup('pushDevices').orderBy(FieldPath.documentId()).limit(pageSize)
    const page = await (cursor ? base.startAfter(cursor) : base).get()
    for (const device of page.docs) {
      if (!(device.get('expiresAt')?.toMillis() > now)) continue
      const workspace = device.ref.parent.parent
      if (!workspace || workspace.parent.id !== 'users') continue
      try {
        if (!workspaces.has(workspace.id)) {
          const user = await workspace.get()
          const leads = (user.get('reminders') ?? []).filter(
            (n) => typeof n === 'number' && n > 0 && n <= 30,
          )
          workspaces.set(workspace.id, user.exists ? await pendingReminders(workspace, now, leads) : [])
        }
        for (const reminder of workspaces.get(workspace.id))
          await deliver(db, device, reminder, now, send)
      } catch (err) {
        logError('CampusFlow could not deliver a scheduled reminder', { code: err?.code })
      }
    }
    if (page.size < pageSize) break
    cursor = page.docs.at(-1)
  }
}

export const sendStudyReminders = onSchedule(
  { schedule: 'every 15 minutes', timeoutSeconds: 480, maxInstances: 1 },
  () => runStudyReminders(getFirestore(), (message) => getMessaging().send(message)),
)
