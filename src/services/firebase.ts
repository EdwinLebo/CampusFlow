import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

import { firebaseConfig, isFirebaseConfigured, useEmulators } from './firebaseConfig'
export { useEmulators } from './firebaseConfig'
export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const functions = app ? getFunctions(app) : null
if (useEmulators && auth && db) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  if (functions) connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}
export function friendly(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? error.code : ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'The email or password was incorrect.'
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return 'Choose a stronger password that meets the account requirements.'
    case 'auth/email-already-in-use':
      return 'An account already exists for that email. Try signing in.'
    case 'auth/popup-closed-by-user':
      return 'The sign-in window was closed. Try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Give it a moment and try again.'
    case 'auth/network-request-failed':
    case 'unavailable':
    case 'functions/unavailable':
      return 'The service is unavailable. Check your connection and retry.'
    case 'auth/requires-recent-login':
    case 'functions/failed-precondition':
      return 'Sign out and back in, then retry account deletion.'
    case 'permission-denied':
      return 'This workspace is unavailable. Check your sign-in or finish a pending account deletion in Settings.'
    default:
      return 'The request could not be completed. Try again in a moment.'
  }
}
