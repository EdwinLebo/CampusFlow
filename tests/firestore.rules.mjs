import { createRequire } from 'node:module'
import { runStudyReminders } from '../firebase/functions/scheduled-reminders.js'
import { after, before, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'

let env
const path = (db, uid, id = 'module-1') => doc(db, 'users', uid, 'modules', id)
const valid = {
  id: 'module-1',
  createdAt: Date.now(),
  name: 'Media',
  code: 'MED101',
  color: '#4f46e5',
  archived: false,
  target: 75,
  confidence: 3,
  difficulty: 3,
}
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-campusflow',
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  })
})
after(async () => {
  await env?.cleanup()
})
test('workspace owner can create, read, list, update and delete', async () => {
  const db = env.authenticatedContext('owner').firestore()
  await assertSucceeds(setDoc(path(db, 'owner'), valid))
  await assertSucceeds(getDoc(path(db, 'owner')))
  await assertSucceeds(getDocs(collection(db, 'users', 'owner', 'modules')))
  await assertSucceeds(setDoc(path(db, 'owner'), { ...valid, name: 'Updated media' }))
  await assertSucceeds(deleteDoc(path(db, 'owner')))
})
test('cross-account and anonymous access are denied', async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(path(ctx.firestore(), 'alice'), valid))
  const bob = env.authenticatedContext('bob').firestore(),
    anonymous = env.unauthenticatedContext().firestore()
  for (const db of [bob, anonymous]) {
    await assertFails(getDoc(path(db, 'alice')))
    await assertFails(getDocs(collection(db, 'users', 'alice', 'modules')))
    await assertFails(setDoc(path(db, 'alice'), valid))
    await assertFails(deleteDoc(path(db, 'alice')))
  }
})
test('malformed records, private lock paths and undeclared collections are denied', async () => {
  const db = env.authenticatedContext('writer').firestore()
  await assertFails(setDoc(path(db, 'writer'), { ...valid, color: 'red' }))
  await assertFails(setDoc(path(db, 'writer'), { ...valid, target: 110 }))
  await assertFails(setDoc(path(db, 'writer'), { ...valid, id: 'wrong' }))
  await assertFails(setDoc(doc(db, 'users', 'writer', 'arbitrary', 'doc'), valid))
  await assertFails(setDoc(doc(db, 'accountDeletions', 'writer'), { startedAt: Date.now() }))
  await assertFails(deleteDoc(doc(db, 'users', 'writer')))
})
test('server-side deletion lock blocks workspace writes and record reads', async () => {
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'accountDeletions', 'locked'), { startedAt: Date.now() }),
  )
  const db = env.authenticatedContext('locked').firestore()
  await assertFails(setDoc(path(db, 'locked'), valid))
  await assertFails(getDocs(collection(db, 'users', 'locked', 'modules')))
})

test('push registration is write-only and scoped to its owner', async () => {
  const owner = env.authenticatedContext('student').firestore()
  const outsider = env.authenticatedContext('outsider').firestore()
  const device = (db) => doc(db, 'users', 'student', 'pushDevices', 'browser')
  const payload = {
    token: 'test-device-token',
    updatedAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + 45 * 86400000),
  }
  await assertSucceeds(setDoc(device(owner), payload))
  await assertFails(getDoc(device(owner)))
  await assertFails(setDoc(device(outsider), payload))
  await assertFails(
    setDoc(device(owner), { ...payload, expiresAt: Timestamp.fromMillis(Date.now() + 60 * 86400000) }),
  )
  await assertSucceeds(deleteDoc(device(owner)))
})

test('scheduler selects upcoming work, keeps titles private and deduplicates delivery', async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw Error('Run this test with the Firestore emulator')
  const require = createRequire(new URL('../firebase/functions/package.json', import.meta.url))
  const { initializeApp, deleteApp } = require('firebase-admin/app')
  const { getFirestore, Timestamp: AdminTimestamp } = require('firebase-admin/firestore')
  const app = initializeApp({ projectId: 'demo-campusflow' }, 'scheduler-test')
  const db = getFirestore(app)
  const now = Date.now()
  const workspace = db.collection('users').doc('scheduler-test-student')
  try {
    await workspace.set({ reminders: [1] })
    await workspace
      .collection('pushDevices')
      .doc('device')
      .set({ token: 'fake-token', expiresAt: AdminTimestamp.fromMillis(now + 86400000) })
    await workspace
      .collection('assignments')
      .doc('due')
      .set({ title: 'Private title', status: 'In progress', due: now + 3600000 })
    await workspace
      .collection('assignments')
      .doc('finished')
      .set({ title: 'Private completed title', status: 'Submitted', due: now + 3600000 })
    const sent = []
    await runStudyReminders(db, async (message) => sent.push(message), now)
    await runStudyReminders(db, async (message) => sent.push(message), now + 1000)
    if (
      sent.length !== 1 ||
      sent[0].data.path !== '/app/assignments' ||
      sent[0].data.deviceId !== 'device' ||
      JSON.stringify(sent[0]).includes('Private title')
    ) {
      throw Error('Unexpected scheduled delivery payload: ' + JSON.stringify(sent))
    }
  } finally {
    await db.recursiveDelete(workspace)
    await deleteApp(app)
  }
})
