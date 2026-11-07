import { useState, type FormEvent } from 'react'
import {
  CalendarPlus,
  Check,
  Download,
  Edit3,
  Lock,
  Plus,
  Printer,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react'
import { useWorkspace } from '../app/Workspace'
import { useActions } from '../app/Actions'
import {
  Button,
  Card,
  CardTitle,
  Empty,
  ErrorText,
  Field,
  Heading,
  ModuleDot,
  Pill,
} from '../components/ui'
import { useRecordLink } from '../components/useRecordLink'
import { base, isFinished, moduleName, type Session } from '../domain/model'
import { generatePlan, occupied, type Draft } from '../domain/planner'
import { formatDate, keyFor, localInput, MINUTE, overlaps, parseLocal, zoned } from '../domain/time'
import { download, ics } from '../domain/calendar'

export function Planner() {
  const { data, profile } = useWorkspace()
  const { apply, edit, remove } = useActions()
  useRecordLink('studySessions')
  const zone = profile.timezone
  const [days, setDays] = useState(profile.studyDays)
  const [duration, setDuration] = useState(profile.sessionMinutes)
  const [breakMinutes, setBreakMinutes] = useState(profile.breakMinutes)
  const [maxDaily, setMaxDaily] = useState(2)
  const [horizon, setHorizon] = useState(14)
  const [from, setFrom] = useState(
    profile.preferredTime === 'Morning'
      ? '09:00'
      : profile.preferredTime === 'Evening'
        ? '18:00'
        : '14:00',
  )
  const [to, setTo] = useState(
    profile.preferredTime === 'Morning'
      ? '12:00'
      : profile.preferredTime === 'Evening'
        ? '21:00'
        : '17:00',
  )
  const [extra, setExtra] = useState(false)
  const [extraFrom, setExtraFrom] = useState('19:00')
  const [extraTo, setExtraTo] = useState('21:00')
  const [drafts, setDrafts] = useState<Draft[] | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const sessions = [...data.studySessions].sort((a, b) => a.start - b.start)
  const planned = sessions.filter((s) => !s.completedAt)
  const history = sessions.filter((s) => s.completedAt).reverse()
  function generate(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    if (!days.length || from >= to || (extra && extraFrom >= extraTo)) {
      setMessage('Choose study days and set each window’s end after its start.')
      return
    }
    const windows = [{ from, to }, ...(extra ? [{ from: extraFrom, to: extraTo }] : [])].sort((a, b) =>
      a.from.localeCompare(b.from),
    )
    const result = generatePlan(
      data,
      { days, minutes: duration, breakMinutes, maxDaily, horizon, now: Date.now(), zone, windows },
      drafts?.filter((d) => d.locked),
    )
    setDrafts(result.drafts)
    if (!result.drafts.length)
      setMessage(
        result.candidates
          ? 'No available study slots fit the upcoming deadlines. Try shorter sessions, wider windows or more study days.'
          : 'No upcoming assignments or exams for active modules. Add a deadline to generate a study plan.',
      )
    else if (!result.drafts.some((d) => !d.locked))
      setMessage(
        'The planner kept your locked sessions. No additional sessions fit the available slots.',
      )
  }
  async function save() {
    if (!drafts?.length) return
    const taken = occupied(data)
    const perDay = new Map<string, number>()
    for (const session of data.studySessions) {
      const day = keyFor(session.start, zone)
      perDay.set(day, (perDay.get(day) ?? 0) + 1)
    }
    for (const d of drafts) {
      const end = d.start + d.minutes * MINUTE
      const day = keyFor(d.start, zone)
      const count = (perDay.get(day) ?? 0) + 1
      const targetId = d.key.split('@')[0]
      const deadline = d.examId
        ? data.exams.find((e) => e.id === d.examId)?.start
        : data.assignments.find((a) => a.id === targetId && !isFinished(a.status))?.due
      const time = localInput(d.start, zone).slice(11)
      const endTime = localInput(end, zone).slice(11)
      const inWindow =
        (time >= from && endTime <= to) || (extra && time >= extraFrom && endTime <= extraTo)
      if (
        !Number.isFinite(d.start) ||
        d.start < Date.now() ||
        !days.includes(zoned(d.start, zone).getDay()) ||
        !inWindow ||
        keyFor(end, zone) !== day ||
        count > maxDaily ||
        !deadline ||
        end > deadline ||
        taken.some((b) =>
          overlaps(d.start - breakMinutes * MINUTE, end + breakMinutes * MINUTE, b.start, b.end),
        )
      ) {
        setMessage(
          'A session no longer fits your availability, daily limit or assessment deadline. Adjust its time or regenerate.',
        )
        return
      }
      taken.push({ start: d.start, end })
      perDay.set(day, count)
    }
    setBusy(true)
    const changes = drafts.map(({ key, locked, ...session }) => ({
      kind: 'studySessions' as const,
      item: { ...base(), ...session, title: session.title.slice(0, 100) },
    }))
    if (await apply(changes, 'Study plan saved to your calendar')) {
      setDrafts(null)
      setMessage('')
    }
    setBusy(false)
  }
  const exportItems = drafts?.length ? drafts.map((d) => ({ ...d, id: d.key })) : planned
  const printItems = exportItems.map((e) => (
    <div className="print-row" key={e.id}>
      <strong>{e.title}</strong>
      <span>
        {formatDate(e.start, zone)} · {e.minutes} minutes · {moduleName(data.modules, e.moduleId)}
      </span>
    </div>
  ))
  function sessionRow(s: Session) {
    return (
      <div key={s.id} className="session-row">
        <div>
          <ModuleDot color={data.modules.find((m) => m.id === s.moduleId)?.color} />
          <strong>{s.title}</strong>
          <small>
            {formatDate(s.start, zone)} · {s.minutes} min · {moduleName(data.modules, s.moduleId)}
          </small>
        </div>
        <div className="row-actions">
          {s.completedAt ? (
            <Pill tone="green">Completed</Pill>
          ) : (
            <button
              className="icon-button"
              aria-label={'Complete ' + s.title}
              title="Mark complete"
              onClick={() =>
                void apply(
                  [{ kind: 'studySessions', item: { ...s, completedAt: Date.now() } }],
                  'Study session completed',
                )
              }
            >
              <Check size={18} />
            </button>
          )}
          <button
            className="icon-button"
            aria-label={'Edit ' + s.title}
            onClick={() => edit({ kind: 'studySessions', item: s })}
          >
            <Edit3 size={16} />
          </button>
          <button
            className="icon-button destructive"
            aria-label={'Delete ' + s.title}
            onClick={() => remove('studySessions', s)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    )
  }
  return (
    <>
      <div className="print-only">
        <h1>CampusFlow study plan</h1>
        <p>{zone}</p>
        {printItems}
      </div>
      <div className="planner-screen">
        <Heading
          kicker="PRODUCTIVITY"
          title="Smart Study Planner"
          description="Turn your deadlines into a realistic study plan."
          action={
            <Button onClick={() => edit({ kind: 'studySessions' })}>
              <Plus size={17} />
              Schedule study
            </Button>
          }
        />
        <div className="planner-layout">
          <Card>
            <CardTitle title="Your availability" subtitle={'Study times in ' + zone} />
            <form onSubmit={generate} className="stack">
              <fieldset className="day-picker">
                <legend>Study days</legend>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                  <label key={day}>
                    <input
                      type="checkbox"
                      checked={days.includes(i)}
                      onChange={(e) =>
                        setDays(e.target.checked ? [...days, i] : days.filter((d) => d !== i))
                      }
                    />
                    <span>{day}</span>
                  </label>
                ))}
              </fieldset>
              <div className="field-grid">
                <Field label="Available from">
                  <input type="time" required value={from} onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="Available until">
                  <input type="time" required value={to} onChange={(e) => setTo(e.target.value)} />
                </Field>
              </div>
              <label className="check">
                <input type="checkbox" checked={extra} onChange={(e) => setExtra(e.target.checked)} />
                Add another daily window
              </label>
              {extra && (
                <div className="field-grid">
                  <Field label="Second window starts">
                    <input
                      type="time"
                      required
                      value={extraFrom}
                      onChange={(e) => setExtraFrom(e.target.value)}
                    />
                  </Field>
                  <Field label="Second window ends">
                    <input
                      type="time"
                      required
                      value={extraTo}
                      onChange={(e) => setExtraTo(e.target.value)}
                    />
                  </Field>
                </div>
              )}
              <div className="field-grid">
                <Field label="Session (min)">
                  <input
                    type="number"
                    min={5}
                    max={180}
                    required
                    value={Number.isFinite(duration) ? duration : ''}
                    onChange={(e) => setDuration(e.target.valueAsNumber)}
                  />
                </Field>
                <Field label="Break (min)">
                  <input
                    type="number"
                    min={0}
                    max={120}
                    required
                    value={Number.isFinite(breakMinutes) ? breakMinutes : ''}
                    onChange={(e) => setBreakMinutes(e.target.valueAsNumber)}
                  />
                </Field>
                <Field label="Max sessions / day">
                  <input
                    type="number"
                    min={1}
                    max={8}
                    required
                    value={Number.isFinite(maxDaily) ? maxDaily : ''}
                    onChange={(e) => setMaxDaily(e.target.valueAsNumber)}
                  />
                </Field>
                <Field label="Plan length (days)">
                  <input
                    type="number"
                    min={1}
                    max={45}
                    required
                    value={Number.isFinite(horizon) ? horizon : ''}
                    onChange={(e) => setHorizon(e.target.valueAsNumber)}
                  />
                </Field>
              </div>
              <Button>
                <Sparkles size={17} />
                {drafts ? 'Regenerate plan' : 'Generate study plan'}
              </Button>
            </form>
          </Card>
          <Card>
            <CardTitle
              title="Timetable preview"
              subtitle="Review and edit sessions before adding them to your calendar."
              action={
                <span className="stat-icon purple">
                  <CalendarPlus size={18} />
                </span>
              }
            />
            <ErrorText message={message} />
            {drafts?.length ? (
              <>
                <div className="draft-list">
                  {drafts.map((d) => (
                    <div className="draft-row" key={d.key}>
                      <div>
                        <strong>{d.title}</strong>
                        <small>
                          {moduleName(data.modules, d.moduleId)} · {d.minutes} min
                        </small>
                      </div>
                      <input
                        aria-label={'Start for ' + d.title}
                        type="datetime-local"
                        value={Number.isFinite(d.start) ? localInput(d.start, zone) : ''}
                        onChange={(e) =>
                          setDrafts(
                            (prev) =>
                              prev?.map((s) =>
                                s.key === d.key ? { ...s, start: parseLocal(e.target.value, zone) } : s,
                              ) ?? null,
                          )
                        }
                      />
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={(d.locked ? 'Unlock ' : 'Lock ') + d.title}
                          onClick={() =>
                            setDrafts(
                              (prev) =>
                                prev?.map((s) => (s.key === d.key ? { ...s, locked: !s.locked } : s)) ??
                                null,
                            )
                          }
                        >
                          {d.locked ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                        <button
                          className="icon-button destructive"
                          aria-label={'Remove ' + d.title}
                          onClick={() =>
                            setDrafts((prev) => prev?.filter((s) => s.key !== d.key) ?? null)
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="form-actions">
                  <Button disabled={busy} onClick={() => void save()}>
                    <Check size={16} />
                    {busy ? 'Saving…' : 'Accept timetable'}
                  </Button>
                </div>
              </>
            ) : (
              <Empty
                title="Your plan starts here"
                detail="Choose your availability. CampusFlow ranks upcoming work and fits it around saved events."
              />
            )}
            <div className="toolbar spaced">
              <Button
                variant="outline"
                disabled={!exportItems.length || exportItems.some((e) => !Number.isFinite(e.start))}
                onClick={() =>
                  download('campusflow-study-plan.ics', ics(exportItems), 'text/calendar;charset=utf-8')
                }
              >
                <Download size={16} />
                Export .ics
              </Button>
              <Button
                variant="outline"
                disabled={!exportItems.length || exportItems.some((e) => !Number.isFinite(e.start))}
                onClick={() => window.print()}
              >
                <Printer size={16} />
                Print / save PDF
              </Button>
            </div>
          </Card>
        </div>
        <div className="two-grid spaced">
          <Card>
            <CardTitle title="Scheduled study" subtitle="Mark sessions complete after you finish." />
            {planned.length ? (
              planned.map(sessionRow)
            ) : (
              <Empty
                title="No scheduled sessions"
                detail="Accept a timetable or schedule a session manually."
                action="Schedule study"
                onAction={() => edit({ kind: 'studySessions' })}
              />
            )}
          </Card>
          <Card>
            <CardTitle
              title="Study history"
              subtitle="Completed sessions contribute to Study Insights."
            />
            {history.length ? (
              history.map(sessionRow)
            ) : (
              <Empty
                title="No sessions completed"
                detail="Complete a study or focus session to see it here."
              />
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
