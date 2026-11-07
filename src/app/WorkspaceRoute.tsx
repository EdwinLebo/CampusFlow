import { Navigate } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { WorkspaceProvider, useWorkspace } from './Workspace'
import { ActionsProvider } from './Actions'
import { Shell } from './Shell'
import { Onboarding } from '../pages/Onboarding'
import { Loading } from '../components/ui'

function WorkspaceEntry() {
  const { ready, demo, profile, error } = useWorkspace()
  if (!ready) return <Loading />
  if (!demo && !profile.onboarded && !error) return <Onboarding />
  return (
    <ActionsProvider>
      <Shell />
    </ActionsProvider>
  )
}
export default function WorkspaceRoute({
  demo = false,
  user,
  loading,
}: {
  demo?: boolean
  user: User | null
  loading: boolean
}) {
  if (!demo && loading) return <Loading />
  if (!demo && !user) return <Navigate to="/login" replace />
  return (
    <WorkspaceProvider key={demo ? 'demo' : user?.uid} demo={demo} user={demo ? null : user}>
      <WorkspaceEntry />
    </WorkspaceProvider>
  )
}
