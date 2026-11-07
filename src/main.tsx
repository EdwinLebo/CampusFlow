import { lazy, StrictMode, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { isFirebaseConfigured } from './services/firebaseConfig'
import { portfolioBuild } from './app/hosting'
import { Landing } from './pages/Landing'
import { Loading } from './components/ui'
import '@fontsource-variable/inter/wght.css'
import './styles.css'

const WorkspaceRoute = lazy(() => import('./app/WorkspaceRoute'))
const AuthPage = lazy(() => import('./pages/Auth').then((m) => ({ default: m.AuthPage })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Assignments = lazy(() => import('./pages/Assignments').then((m) => ({ default: m.Assignments })))
const Calendar = lazy(() => import('./pages/Calendar').then((m) => ({ default: m.Calendar })))
const Modules = lazy(() => import('./pages/Modules').then((m) => ({ default: m.Modules })))
const ModuleDetail = lazy(() => import('./pages/Modules').then((m) => ({ default: m.ModuleDetail })))
const Exams = lazy(() => import('./pages/Exams').then((m) => ({ default: m.Exams })))
const Planner = lazy(() => import('./pages/Planner').then((m) => ({ default: m.Planner })))
const Focus = lazy(() => import('./pages/Focus').then((m) => ({ default: m.Focus })))
const Goals = lazy(() => import('./pages/NotesGoals').then((m) => ({ default: m.Goals })))
const Notes = lazy(() => import('./pages/NotesGoals').then((m) => ({ default: m.Notes })))
const Insights = lazy(() => import('./pages/Academic').then((m) => ({ default: m.Insights })))
const Performance = lazy(() => import('./pages/Academic').then((m) => ({ default: m.Performance })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const target = hash && document.getElementById(hash.slice(1))
    if (target) target.scrollIntoView()
    else window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, hash])
  return null
}
function workspacePages() {
  return (
    <>
      <Route index element={<Dashboard />} />
      <Route path="calendar" element={<Calendar />} />
      <Route path="assignments" element={<Assignments />} />
      <Route path="modules" element={<Modules />} />
      <Route path="modules/:id" element={<ModuleDetail />} />
      <Route path="exams" element={<Exams />} />
      <Route path="planner" element={<Planner />} />
      <Route path="focus" element={<Focus />} />
      <Route path="notes" element={<Notes />} />
      <Route path="goals" element={<Goals />} />
      <Route path="performance" element={<Performance />} />
      <Route path="insights" element={<Insights />} />
      <Route path="settings" element={<Settings />} />
      <Route path="*" element={<Navigate to=".." replace />} />
    </>
  )
}
const Router = portfolioBuild ? HashRouter : BrowserRouter

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isFirebaseConfigured)
  useEffect(() => {
    if (!isFirebaseConfigured) return
    let active = true
    let unsubscribe: (() => void) | undefined
    void Promise.all([import('./services/firebase'), import('firebase/auth')])
      .then(([{ auth }, { onAuthStateChanged }]) => {
        if (active && auth)
          unsubscribe = onAuthStateChanged(auth, (current) => {
            setUser(current)
            setLoading(false)
          })
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      unsubscribe?.()
    }
  }, [])
  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          {!portfolioBuild && (
            <>
              <Route
                path="/login"
                element={loading ? <Loading /> : <AuthPage key="login" mode="login" user={user} />}
              />
              <Route
                path="/register"
                element={loading ? <Loading /> : <AuthPage key="register" mode="register" user={user} />}
              />
              <Route path="/reset" element={<AuthPage key="reset" mode="reset" user={user} />} />
              <Route path="/app" element={<WorkspaceRoute user={user} loading={loading} />}>
                {workspacePages()}
              </Route>
            </>
          )}
          <Route path="/demo" element={<WorkspaceRoute demo user={user} loading={false} />}>
            {workspacePages()}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
