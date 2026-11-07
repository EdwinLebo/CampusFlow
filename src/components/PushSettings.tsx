import { useState } from 'react'
import { BellRing } from 'lucide-react'
import { disablePush, enablePush, pushConfigured, pushEnabled } from '../services/push'
import { useActions } from '../app/Actions'
import { Button } from './ui'

export function PushSettings({ uid }: { uid: string }) {
  const { notify } = useActions()
  const [enabled, setEnabled] = useState(() => pushEnabled(uid))
  const [busy, setBusy] = useState(false)
  if (!pushConfigured)
    return <p className="spaced small muted">Scheduled push is unavailable on this deployment.</p>
  async function toggle() {
    setBusy(true)
    try {
      if (enabled) await disablePush(uid)
      else await enablePush(uid)
      setEnabled(!enabled)
      notify(enabled ? 'Scheduled push disabled' : 'Scheduled push enabled for this browser')
    } catch (e) {
      notify(
        e instanceof Error && !('code' in e)
          ? e.message
          : 'Scheduled push could not be updated. Check permission and retry.',
        true,
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="spaced">
      <p className="small muted">
        Scheduled push can notify this browser about deadlines, exams and study sessions while CampusFlow
        is closed. Device permission expires after 45 days. You can renew it by enabling push again.
      </p>
      <Button
        className="spaced"
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => void toggle()}
      >
        <BellRing size={16} />
        {busy ? 'Working…' : enabled ? 'Disable scheduled push' : 'Enable scheduled push on this device'}
      </Button>
    </div>
  )
}
