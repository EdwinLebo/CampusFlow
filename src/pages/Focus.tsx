import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Expand,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  Timer as TimerIcon,
  Volume2,
} from 'lucide-react'
import { useWorkspace } from '../app/Workspace'
import { useActions } from '../app/Actions'
import { Button, Card, CardTitle, Field, Heading, Segmented } from '../components/ui'
import { base, moduleName } from '../domain/model'
import { sessionsThisWeek, studyMinutes } from '../domain/metrics'
import { elapsed, makeTimer, pause, resume, type Timer } from '../domain/timer'
import { keyFor, MINUTE } from '../domain/time'

const modes = ['Pomodoro', 'Short break', 'Long break', 'Custom'] as const
type Mode = (typeof modes)[number]
const durations: Record<Mode, number> = { Pomodoro: 25, 'Short break': 5, 'Long break': 15, Custom: 45 }
interface FocusState {
  mode: Mode
  minutes: number
  timer: Timer
  objective: string
  moduleId: string
  sound: boolean
  record: ReturnType<typeof base>
  notified: boolean
}
const initial = (mode: Mode = 'Pomodoro', sound = false): FocusState => ({
  mode,
  minutes: durations[mode],
  timer: makeTimer(durations[mode]),
  objective: '',
  moduleId: '',
  sound,
  record: base(),
  notified: false,
})
function read(key: string) {
  try {
    const saved = sessionStorage.getItem(key)
    if (saved) return JSON.parse(saved) as FocusState
  } catch {
    /* Reset malformed timer state. */
  }
  return initial()
}
export function Focus() {
  const { demo, user, data, profile, now } = useWorkspace()
  const { apply, notify } = useActions()
  const key = 'campusflow.focus.' + (demo ? 'demo' : user?.uid)
  const [state, setState] = useState(() => read(key))
  const [time, setTime] = useState(Date.now)
  const [busy, setBusy] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const zone = profile.timezone
  const container = useRef<HTMLDivElement>(null)
  const audio = useRef<AudioContext | null>(null)
  const remaining = Math.max(0, state.timer.durationMs - elapsed(state.timer, time))
  const running = state.timer.startedAt !== null && remaining > 0
  const started = state.timer.firstStart !== null
  const finished = started && remaining === 0
  const isBreak = state.mode === 'Short break' || state.mode === 'Long break'
  const seconds = Math.ceil(remaining / 1000)
  const focus = data.studySessions.filter((s) => s.source === 'focus' && s.completedAt)
  const today = focus.filter((s) => keyFor(s.completedAt, zone) === keyFor(now, zone))
  const week = sessionsThisWeek(focus, now, zone)
  const grouped = Object.entries(
    focus.reduce<Record<string, number>>(
      (acc, s) => ({ ...acc, [s.moduleId]: (acc[s.moduleId] ?? 0) + s.minutes }),
      {},
    ),
  ).sort((a, b) => b[1] - a[1])
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state))
    } catch {
      /* The timer can continue in memory. */
    }
  }, [state, key])
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTime(Date.now()), 250)
    const sync = () => setTime(Date.now())
    document.addEventListener('visibilitychange', sync)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [running])
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === container.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])
  useEffect(() => {
    if (!finished || state.notified) return
    setState((s) => ({ ...s, notified: true, timer: pause(s.timer, Date.now()) }))
    if (state.sound && audio.current?.state === 'running') {
      const ctx = audio.current
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.frequency.value = 660
      gain.gain.value = 0.075
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.26)
    }
  }, [finished, state.notified, state.sound])
  function control() {
    const stamp = Date.now()
    if (state.sound && 'AudioContext' in window) {
      try {
        audio.current ??= new AudioContext()
        void audio.current.resume().catch(() => {})
      } catch {
        /* Sound is optional. */
      }
    }
    setTime(stamp)
    setState((s) => ({ ...s, timer: running ? pause(s.timer, stamp) : resume(s.timer, stamp) }))
  }
  function clear() {
    setState((s) => ({ ...s, timer: makeTimer(s.minutes), record: base(), notified: false }))
    setTime(Date.now())
  }
  async function complete() {
    if (!started) return
    const stamp = Date.now()
    const minutes = Math.floor(elapsed(state.timer, stamp) / MINUTE)
    if (isBreak) {
      clear()
      notify('Break finished')
      return
    }
    if (minutes < 1) {
      notify('Focus for at least one active minute before logging a session.', true)
      return
    }
    setBusy(true)
    const ok = await apply(
      [
        {
          kind: 'studySessions',
          item: {
            ...state.record,
            title: state.objective.trim() || 'Focus session',
            moduleId: state.moduleId,
            start: state.timer.firstStart!,
            minutes,
            completedAt: stamp,
            source: 'focus',
            examId: '',
          },
        },
      ],
      'Focus session logged',
    )
    if (ok) clear()
    setBusy(false)
  }
  async function toggleFullscreen() {
    try {
      if (fullscreen) await document.exitFullscreen()
      else if (container.current?.requestFullscreen) await container.current.requestFullscreen()
      else notify('Fullscreen is unavailable on this device.', true)
    } catch {
      notify('Fullscreen could not be opened.', true)
    }
  }
  return (
    <>
      <Heading
        kicker="PRODUCTIVITY"
        title="Focus Zone"
        description="One session. One goal. Zero distractions."
      />
      <div className="focus-layout">
        <div className="focus-panel card" ref={container}>
          <div className="focus-top">
            <span className="eyebrow">
              <TimerIcon size={16} /> FOCUS TIMER
            </span>
            <button
              className="icon-button"
              aria-label={fullscreen ? 'Exit fullscreen' : 'Open fullscreen'}
              onClick={() => void toggleFullscreen()}
            >
              {fullscreen ? <Expand size={18} /> : <Maximize size={18} />}
            </button>
          </div>
          <Segmented
            items={modes}
            value={state.mode}
            label="Timer mode"
            disabled={started}
            onChange={(mode) => {
              if (!started) setState(initial(mode, state.sound))
            }}
          />
          <div className="timer-ring">
            <svg viewBox="0 0 200 200" aria-hidden>
              <circle cx="100" cy="100" r="89" />
              <circle
                cx="100"
                cy="100"
                r="89"
                pathLength="100"
                strokeDasharray={(remaining / state.timer.durationMs) * 100 + ' 100'}
              />
            </svg>
            <div>
              <span role="timer">
                {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                {String(seconds % 60).padStart(2, '0')}
              </span>
              <small>
                {finished
                  ? 'Session finished'
                  : running
                    ? 'Focus in progress'
                    : started
                      ? 'Paused'
                      : 'Ready when you are'}
              </small>
            </div>
          </div>
          <div className="toolbar center">
            {!finished && (
              <Button disabled={busy} onClick={control}>
                {running ? <Pause size={16} /> : <Play size={16} />}{' '}
                {running ? 'Pause' : started ? 'Resume' : 'Start timer'}
              </Button>
            )}
            <Button disabled={busy} variant="outline" onClick={clear}>
              <RotateCcw size={16} />
              Reset
            </Button>
            {started && (
              <Button
                disabled={busy}
                variant={finished ? 'primary' : 'outline'}
                onClick={() => void complete()}
              >
                <Check size={16} />
                {busy ? 'Saving…' : isBreak ? 'End break' : 'Log & end'}
              </Button>
            )}
          </div>
          <div className="focus-options field-grid">
            <Field label="Duration (minutes)">
              <input
                type="number"
                min={1}
                max={180}
                disabled={started}
                value={state.minutes}
                onChange={(e) => {
                  const minutes = Math.max(1, Math.min(180, Math.floor(Number(e.target.value))))
                  setState((s) => ({ ...s, minutes, timer: makeTimer(minutes) }))
                }}
              />
            </Field>
            <Field label="Module">
              <select
                value={state.moduleId}
                disabled={started}
                onChange={(e) => setState((s) => ({ ...s, moduleId: e.target.value }))}
              >
                <option value="">General focus</option>
                {data.modules
                  .filter((m) => !m.archived || m.id === state.moduleId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="full">
              <Field label="Session objective">
                <input
                  maxLength={100}
                  value={state.objective}
                  disabled={started}
                  onChange={(e) => setState((s) => ({ ...s, objective: e.target.value }))}
                  placeholder="What will you work on?"
                />
              </Field>
            </div>
          </div>
          <label className="check focus-sound">
            <Volume2 size={17} />
            <input
              type="checkbox"
              checked={state.sound}
              onChange={(e) => setState((s) => ({ ...s, sound: e.target.checked }))}
            />
            Play a sound when the timer finishes
          </label>
          <p className="small muted">
            Log a session to add its active minutes to your study history. Reset clears the current
            timer.
          </p>
        </div>
        <div className="stack">
          <Card>
            <CardTitle title="Focus statistics" subtitle="Completed focus sessions" />
            <div className="focus-stats">
              {[
                ['Total minutes', studyMinutes(focus)],
                ['Completed sessions', focus.length],
                ['Today', studyMinutes(today) + ' min'],
                ['This week', studyMinutes(week) + ' min'],
              ].map(([label, value]) => (
                <div key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle title="Focus by module" />
            {grouped.length ? (
              <div className="simple-list">
                {grouped.map(([id, minutes]) => (
                  <div key={id}>
                    <span>{moduleName(data.modules, id)}</span>
                    <strong>{minutes} min</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Log a session to see your focus time here.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
