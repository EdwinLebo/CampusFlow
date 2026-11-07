import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { error as logError } from 'firebase-functions/logger'

initializeApp()
export const deleteWorkspace = onCall({ timeoutSeconds: 540, maxInstances: 5 }, async (request) => {
  const uid = request.auth?.uid
  const authenticatedAt = request.auth?.token.auth_time
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in before deleting your workspace.')
  if (typeof authenticatedAt !== 'number' || Date.now() / 1000 - authenticatedAt > 300) {
    throw new HttpsError('failed-precondition', 'Sign in again and retry within five minutes.')
  }

  const db = getFirestore()
  const lock = db.collection('accountDeletions').doc(uid)
  try {
    await lock.set({ startedAt: FieldValue.serverTimestamp() }, { merge: true })
    await db.recursiveDelete(db.collection('users').doc(uid))
    try {
      await getAuth().deleteUser(uid)
    } catch (err) {
      if (err?.code !== 'auth/user-not-found') throw err
    }
  } catch (err) {
    logError('CampusFlow workspace cleanup failed', { code: err?.code })
    throw new HttpsError('internal', 'Cleanup did not finish. Retry from Settings.')
  }
  try {
    await lock.set(
      { expiresAt: Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000) },
      { merge: true },
    )
  } catch (err) {
    logError('CampusFlow workspace removed but lock TTL could not be set', { code: err?.code })
  }
  return { deleted: true }
})
export { sendStudyReminders } from './scheduled-reminders.js'
