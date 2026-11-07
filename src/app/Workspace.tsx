import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore'
import { type User } from 'firebase/auth'
import { db, friendly } from '../services/firebase'
import { DEMO_KEY, readDemo, seedDemo } from '../services/demo'
import { defaultProfile, emptyData, kinds, type Data, type Profile, type Change } from '../domain/model'

interface WorkspaceValue {
  demo: boolean
  user: User | null
  data: Data
  profile: Profile
  now: number
  ready: boolean
  error: string
  commit: (changes: Change[], profile?: Profile) => Promise<void>
  reset: () => void
}
const WorkspaceContext = createContext<WorkspaceValue | null>(null)
export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw Error('Workspace provider is missing')
  return value
}
export function WorkspaceProvider({
  demo,
  user,
  children,
}: {
  demo: boolean
  user: User | null
  children: ReactNode
}) {
  const [initial] = useState(() =>
    demo
      ? readDemo()
      : {
          data: emptyData(),
          profile: {
            ...defaultProfile,
            firstName: user?.displayName?.split(' ')[0] ?? '',
            lastName: user?.displayName?.split(' ').slice(1).join(' ') ?? '',
          },
        },
  )
  const demoRef = useRef(initial)
  const [data, setData] = useState(initial.data)
  const [profile, setProfile] = useState(initial.profile)
  const [now, setNow] = useState(Date.now)
  const [ready, setReady] = useState(demo)
  const [error, setError] = useState('')
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (demo || !user || !db) return
    const database = db
    const loaded = new Set<string>()
    const seen = (key: string) => {
      loaded.add(key)
      if (loaded.size === kinds.length + 1) setReady(true)
    }
    const failed = (reason: unknown) => {
      setError(friendly(reason))
      setReady(true)
    }
    const unsub = [
      onSnapshot(
        doc(database, 'users', user.uid),
        (snap) => {
          if (snap.exists()) setProfile({ ...initial.profile, ...(snap.data() as Profile) })
          seen('profile')
        },
        failed,
      ),
      ...kinds.map((kind) =>
        onSnapshot(
          collection(database, 'users', user.uid, kind),
          (snap) => {
            const items = snap.docs.map((item) => ({ ...item.data(), id: item.id }))
            setData((previous) => ({ ...previous, [kind]: items }))
            seen(kind)
          },
          failed,
        ),
      ),
    ]
    return () => unsub.forEach((stop) => stop())
  }, [demo, user, initial.profile])
  const commit = useCallback(
    async (changes: Change[], updated?: Profile) => {
      if (demo) {
        const nextData = { ...demoRef.current.data }
        for (const { kind, item, remove } of changes) {
          const records = nextData[kind].filter((record) => record.id !== item.id)
          Object.assign(nextData, { [kind]: remove ? records : [...records, item] })
        }
        const next = { data: nextData, profile: updated ?? demoRef.current.profile }
        localStorage.setItem(DEMO_KEY, JSON.stringify(next))
        demoRef.current = next
        setData(next.data)
        setProfile(next.profile)
        return
      }
      if (!user || !db) throw new Error('Sign in first')
      if (changes.length + (updated ? 1 : 0) > 500) throw new Error('Too many changes in one operation')
      const batch = writeBatch(db)
      if (updated) batch.set(doc(db, 'users', user.uid), updated)
      for (const { kind, item, remove } of changes) {
        const ref = doc(db, 'users', user.uid, kind, item.id)
        if (remove) batch.delete(ref)
        else batch.set(ref, item)
      }
      await batch.commit()
    },
    [demo, user],
  )
  function reset() {
    if (!demo) return
    const value = seedDemo()
    localStorage.setItem(DEMO_KEY, JSON.stringify(value))
    demoRef.current = value
    setData(value.data)
    setProfile(value.profile)
    setNow(Date.now())
  }
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme =
        profile.theme === 'dark' || (profile.theme === 'system' && query.matches) ? 'dark' : 'light'
    }
    apply()
    query.addEventListener('change', apply)
    return () => {
      query.removeEventListener('change', apply)
      delete document.documentElement.dataset.theme
    }
  }, [profile.theme])
  return (
    <WorkspaceContext.Provider value={{ demo, user, data, profile, now, ready, error, commit, reset }}>
      {children}
    </WorkspaceContext.Provider>
  )
}
