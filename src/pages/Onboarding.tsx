import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, GraduationCap, Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { useWorkspace } from '../app/Workspace'
import { base, colors, type Module, type Profile } from '../domain/model'
import { profileSchema } from '../domain/validation'
import { auth, friendly } from '../services/firebase'
import { ProfileFields } from '../components/ProfileFields'
import { Brand, Button, ErrorText, Field, Progress } from '../components/ui'
const steps = ['Welcome', 'University', 'Modules', 'Study preferences', 'Finish']
export function Onboarding() {
  const { profile, commit } = useWorkspace()
  const [value, setValue] = useState(profile)
  const [modules, setModules] = useState<Module[]>([])
  const [step, setStep] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const update = <K extends keyof Profile>(key: K, v: Profile[K]) =>
    setValue((p) => ({ ...p, [key]: v }))
  function editModule(id: string, updated: Partial<Module>) {
    setModules((ms) => ms.map((m) => (m.id === id ? { ...m, ...updated } : m)))
  }
  async function next(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (step < 4) {
      if (step === 3 && !value.studyDays.length) {
        setError('Choose at least one study day.')
        return
      }
      setStep(step + 1)
      return
    }
    const parsed = profileSchema.safeParse({ ...value, onboarded: true })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    if (modules.some((m) => !m.name.trim() || !m.code.trim())) {
      setError('Every module needs a name and code. Check the Modules step.')
      return
    }
    setPending(true)
    try {
      await commit(
        modules.map((item) => ({
          kind: 'modules',
          item: { ...item, code: item.code.trim(), name: item.name.trim() },
        })),
        parsed.data,
      )
      navigate('/app', { replace: true })
    } catch (e) {
      setError(friendly(e))
      setPending(false)
    }
  }
  return (
    <div className="onboarding">
      <div className="onboard-top">
        <Brand />
        <Button
          variant="plain"
          onClick={async () => {
            try {
              if (auth) await signOut(auth)
            } catch (e) {
              setError(friendly(e))
            }
          }}
        >
          Sign out
        </Button>
      </div>
      <main className="onboard-card card">
        <div className="eyebrow">
          STEP {step + 1} OF 5 · {steps[step].toUpperCase()}
        </div>
        <Progress value={(step + 1) * 20} label="Setup progress" />
        <form onSubmit={next}>
          {step === 0 && (
            <>
              <span className="onboard-icon">
                <GraduationCap size={34} />
              </span>
              <h1>Let’s organize your academic journey.</h1>
              <p>
                A few details will help CampusFlow build a workspace around your semester, modules and
                study routine.
              </p>
            </>
          )}
          {step === 1 && (
            <>
              <h1>Tell us about your university</h1>
              <p>Choose a listed institution or type your own.</p>
              <ProfileFields value={value} update={update} section="identity" />
              <ProfileFields value={value} update={update} section="academic" />
            </>
          )}
          {step === 2 && (
            <>
              <h1>Add your modules</h1>
              <p>Add the modules you’re taking now. You can also do this after setup.</p>
              {modules.map((m) => (
                <div key={m.id} className="onboard-module">
                  <div className="field-grid">
                    <Field label="Module code">
                      <input
                        required
                        maxLength={100}
                        value={m.code}
                        onChange={(e) => editModule(m.id, { code: e.target.value })}
                      />
                    </Field>
                    <Field label="Module name">
                      <input
                        required
                        maxLength={100}
                        value={m.name}
                        onChange={(e) => editModule(m.id, { name: e.target.value })}
                      />
                    </Field>
                    <Field label="Lecturer (optional)">
                      <input
                        maxLength={1000}
                        value={m.lecturer}
                        onChange={(e) => editModule(m.id, { lecturer: e.target.value })}
                      />
                    </Field>
                    <Field label="Semester or term">
                      <input
                        required
                        maxLength={100}
                        value={m.period}
                        onChange={(e) => editModule(m.id, { period: e.target.value })}
                      />
                    </Field>
                    <Field label="Credits (optional)">
                      <input
                        type="number"
                        min={0}
                        max={360}
                        value={m.credits}
                        onChange={(e) => editModule(m.id, { credits: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Target grade (%)">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={m.target}
                        onChange={(e) => editModule(m.id, { target: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Module colour">
                      <input
                        type="color"
                        value={m.color}
                        onChange={(e) => editModule(m.id, { color: e.target.value })}
                      />
                    </Field>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Remove module"
                    onClick={() => setModules((ms) => ms.filter((item) => item.id !== m.id))}
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                disabled={modules.length >= 499}
                onClick={() =>
                  setModules((ms) => [
                    ...ms,
                    {
                      ...base(),
                      name: '',
                      code: '',
                      lecturer: '',
                      period: value.periodType + ' ' + value.period,
                      color: colors[ms.length % colors.length],
                      credits: 0,
                      target: 75,
                      difficulty: 3,
                      confidence: 3,
                      archived: false,
                    },
                  ])
                }
              >
                <Plus size={16} />
                Add module
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <h1>Make study time work for you</h1>
              <p>The planner uses these defaults. Adjust them any time in Settings.</p>
              <ProfileFields value={value} update={update} section="study" />
            </>
          )}
          {step === 4 && (
            <>
              <span className="onboard-icon">
                <Check size={32} />
              </span>
              <h1>Your workspace is ready to set up</h1>
              <p>
                {value.institution} · {value.periodType} {value.period} · {modules.length}{' '}
                {modules.length === 1 ? 'module' : 'modules'}
              </p>
            </>
          )}
          <ErrorText message={error} />
          <div className="form-actions">
            {step > 0 && (
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setStep(step - 1)
                  setError('')
                }}
              >
                <ArrowLeft size={16} /> Back
              </Button>
            )}
            <Button disabled={pending}>
              {pending ? 'Saving…' : step === 4 ? 'Open my workspace' : 'Continue'}
              <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
