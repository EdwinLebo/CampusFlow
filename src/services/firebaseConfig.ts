import { portfolioBuild } from '../app/hosting'

export const useEmulators = !portfolioBuild && import.meta.env.VITE_USE_EMULATORS === 'true'
export const firebaseConfig = useEmulators
  ? {
      apiKey: 'demo-emulator-key',
      authDomain: 'localhost',
      projectId: 'demo-campusflow',
      appId: '1:000000000:web:demo',
    }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    }
export const isFirebaseConfigured =
  !portfolioBuild &&
  Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
  )
