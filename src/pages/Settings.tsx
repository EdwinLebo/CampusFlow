import { portfolioBuild } from '../app/hosting'
import { PushSettings } from '../components/PushSettings'
import { clearLocalPush, disablePush } from '../services/push'
import { useState, type FormEvent } from 'react'
import { Download, LogOut, Mail, Save, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { sendEmailVerification, signOut } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { useWorkspace } from '../app/Workspace'
import { useActions } from '../app/Actions'
import { auth, friendly, functions } from '../services/firebase'
import { profileSchema } from '../domain/validation'
import { download } from '../domain/calendar'
import type { Profile } from '../domain/model'
import { ProfileFields } from '../components/ProfileFields'
import { Button, Card, CardTitle, Confirm, ErrorText, Field, Heading, Segmented } from '../components/ui'

export function Settings() {
  const { profile, data, user, demo, commit, reset } = useWorkspace()
  const { notify } = useActions()
  const [value, setValue] = useState(profile)
  const [custom, setCustom] = useState(() =>
    profile.reminders
      .filter((r) => ![1, 3, 7].includes(r))
      .map((r) => Math.round(r * 24))
      .join(', '),
  )
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<'delete' | 'reset' | null>(null)
  const [error, setError] = useState('')
  const update = <K extends keyof Profile>(key: K, v: Profile[K]) =>
    setValue((p) => ({ ...p, [key]: v }))
  async function save(event: FormEvent) {
    event.preventDefault()
    const hours = custom
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
    const parsed = profileSchema.safeParse({
      ...value,
      reminders: [
        ...new Set([
          ...value.reminders.filter((r) => [1, 3, 7].includes(r)),
          ...hours.map((h) => h / 24),
        ]),
      ],
    })
    if (!parsed.success) {
      setError(
        parsed.error.issues[0].path[0] === 'reminders'
          ? 'Use up to eight lead times between 1 hour and 30 days.'
          : parsed.error.issues[0].message,
      )
      return
    }
    setError('')
    setBusy(true)
    try {
      await commit([], parsed.data)
      setValue(parsed.data)
      notify('Preferences saved')
    } catch (e) {
      setError(friendly(e))
    } finally {
      setBusy(false)
    }
  }
  async function allowBrowser() {
    if (!('Notification' in window)) {
      notify('Browser notifications are unavailable on this device.', true)
      return
    }
    try {
      const permission = await Notification.requestPermission()
      update('browserNotifications', permission === 'granted')
      notify(
        permission === 'granted'
          ? 'Permission granted. Save preferences to enable browser reminders.'
          : 'Browser permission was not granted.',
        permission !== 'granted',
      )
    } catch {
      notify('Browser permission could not be requested.', true)
    }
  }
  async function deleteWorkspace() {
    if (confirm === 'reset') {
      try {
        reset()
        setValue({
          ...profile,
          ...JSON.parse(localStorage.getItem('campusflow.demo.v1') ?? '{}').profile,
        })
        setCustom('')
        notify('Demo data reset')
        setConfirm(null)
      } catch {
        notify('Demo data could not be reset.', true)
      }
      return
    }
    if (!functions || !auth) return
    setBusy(true)
    try {
      await httpsCallable(functions, 'deleteWorkspace', { timeout: 545000 })()
      if (user) {
        await clearLocalPush(user.uid).catch(() => {})
        sessionStorage.removeItem('campusflow.focus.' + user.uid)
      }
      await signOut(auth)
      notify('Account deleted')
    } catch (e) {
      setError(friendly(e))
      notify(friendly(e), true)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }
  return (
    <>
      <Heading
        kicker="WORKSPACE"
        title="Settings"
        description="Make CampusFlow work the way you study."
      />
      <form onSubmit={save} className="stack">
        <Card>
          <CardTitle title="Profile" subtitle={user?.email ?? 'Local demo profile'} />
          <ProfileFields value={value} update={update} section="identity" />
          {user && !user.emailVerified && (
            <Button
              className="spaced"
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await sendEmailVerification(user)
                  notify('Verification email sent')
                } catch (e) {
                  notify(friendly(e), true)
                }
              }}
            >
              <Mail size={16} />
              Send verification email
            </Button>
          )}
        </Card>
        <Card>
          <CardTitle title="Academic preferences" />
          <ProfileFields value={value} update={update} section="academic" />
          <ProfileFields value={value} update={update} section="study" />
        </Card>
        <Card>
          <CardTitle title="Appearance" />
          <Segmented
            items={['System', 'Light', 'Dark'] as const}
            value={value.theme === 'system' ? 'System' : value.theme === 'light' ? 'Light' : 'Dark'}
            label="Theme"
            onChange={(theme) => update('theme', theme.toLowerCase() as Profile['theme'])}
          />
          <label className="check spaced">
            <input
              type="checkbox"
              checked={value.achievements}
              onChange={(e) => update('achievements', e.target.checked)}
            />
            Show achievements
          </label>
        </Card>
        <Card>
          <CardTitle
            title="Notifications"
            subtitle="In-app and browser reminders update while CampusFlow is open."
          />
          <div className="checkbox-row">
            <label className="check">
              <input
                type="checkbox"
                checked={value.inApp}
                onChange={(e) => update('inApp', e.target.checked)}
              />
              In-app reminders
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={value.browserNotifications}
                onChange={(e) => update('browserNotifications', e.target.checked)}
              />
              Browser reminders
            </label>
          </div>
          <div className="checkbox-row spaced">
            {[1, 3, 7].map((day) => (
              <label className="check" key={day}>
                <input
                  type="checkbox"
                  checked={value.reminders.includes(day)}
                  onChange={(e) =>
                    update(
                      'reminders',
                      e.target.checked
                        ? [...value.reminders, day]
                        : value.reminders.filter((d) => d !== day),
                    )
                  }
                />
                {day} {day === 1 ? 'day' : 'days'} before
              </label>
            ))}
          </div>
          <div className="field-grid spaced">
            <Field label="Custom lead times in hours" help="Separate values with commas.">
              <input value={custom} onChange={(e) => setCustom(e.target.value)} />
            </Field>
            <div>
              <Button type="button" variant="outline" onClick={allowBrowser}>
                Request browser permission
              </Button>
              <p className="small muted">
                Permission · {'Notification' in window ? Notification.permission : 'unavailable'}
              </p>
            </div>
          </div>
          {user && <PushSettings uid={user.uid} />}
        </Card>
        <ErrorText message={error} />
        <div>
          <Button disabled={busy}>
            <Save size={16} />
            {busy ? 'Working…' : 'Save preferences'}
          </Button>
        </div>
      </form>
      <Card className="spaced">
        <CardTitle
          title="Privacy and account"
          subtitle={
            demo
              ? 'This demo stores changes in this browser.'
              : 'Export your profile and academic records or delete your account and workspace.'
          }
        />
        <div className="toolbar">
          <Button
            variant="outline"
            onClick={() =>
              download(
                'campusflow-data.json',
                JSON.stringify({ profile, data }, null, 2),
                'application/json',
              )
            }
          >
            <Download size={16} />
            Export personal data
          </Button>
          {demo ? (
            <>
              <Button variant="outline" onClick={() => setConfirm('reset')}>
                Reset demo
              </Button>
              {!portfolioBuild && (
                <Link className="button primary" to="/register">
                  Create an account
                </Link>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    if (user)
                      await Promise.race([
                        disablePush(user.uid).catch(() => {}),
                        new Promise((resolve) => setTimeout(resolve, 1500)),
                      ])
                    if (auth) await signOut(auth)
                  } catch (e) {
                    notify(friendly(e), true)
                  }
                }}
              >
                <LogOut size={16} />
                Sign out
              </Button>
              {functions && (
                <Button variant="danger" onClick={() => setConfirm('delete')}>
                  <Trash2 size={16} />
                  Delete account
                </Button>
              )}
            </>
          )}
        </div>
      </Card>
      {confirm && (
        <Confirm
          title={confirm === 'delete' ? 'Delete your account?' : 'Reset demo workspace?'}
          detail={
            confirm === 'delete'
              ? 'CampusFlow will permanently remove your profile and academic records. Firebase requires a recent sign-in for this action.'
              : 'Your changes will be replaced with a fresh set of sample records.'
          }
          action={confirm === 'delete' ? 'Delete account' : 'Reset demo'}
          onClose={() => {
            if (!busy) setConfirm(null)
          }}
          onConfirm={deleteWorkspace}
          busy={busy}
        />
      )}
    </>
  )
}
