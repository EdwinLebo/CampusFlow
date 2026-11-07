import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  base,
  colors,
  isFinished,
  newId,
  type Change,
  type Checklist,
  type Collections,
  type Data,
  type Profile,
} from '../domain/model'
import { schemas } from '../domain/validation'
import { localInput, MINUTE, overlaps, parseLocal } from '../domain/time'
import { calendarEvents } from '../domain/calendar'
import { Button, ErrorText, Field } from './ui'

export type Editable = Exclude<keyof Collections, 'notifications'>
export const nouns: Record<Editable, string> = {
  modules: 'module',
  assignments: 'assignment',
  exams: 'exam',
  studySessions: 'study session',
  calendarEvents: 'event',
  assessments: 'assessment',
  notes: 'note',
  goals: 'goal',
}
type FieldDef = {
  key: string
  label: string
  type?:
    | 'number'
    | 'textarea'
    | 'datetime-local'
    | 'module'
    | 'checklist'
    | 'color'
    | 'boolean'
    | 'lines'
    | 'exam'
  choices?: readonly string[]
  optional?: boolean
  help?: string
}
const moduleField: FieldDef = { key: 'moduleId', label: 'Module', type: 'module' }
const title: FieldDef = { key: 'title', label: 'Title' }
const datetime = (key: string, label: string): FieldDef => ({ key, label, type: 'datetime-local' })
const num = (key: string, label: string, help?: string): FieldDef => ({
  key,
  label,
  type: 'number',
  help,
})
const choices = (key: string, label: string, items: string[]): FieldDef => ({
  key,
  label,
  choices: items,
})
const fields: Record<Editable, FieldDef[]> = {
  modules: [
    { key: 'code', label: 'Module code' },
    { key: 'name', label: 'Module name' },
    { key: 'lecturer', label: 'Lecturer (optional)', optional: true },
    { key: 'period', label: 'Semester or term' },
    num('credits', 'Credits (optional)'),
    num('target', 'Target grade (%)'),
    num('difficulty', 'Difficulty (1–5)'),
    num('confidence', 'Confidence (1–5)'),
    { key: 'color', label: 'Module colour', type: 'color' },
    { key: 'archived', label: 'Archive module', type: 'boolean' },
  ],
  assignments: [
    title,
    moduleField,
    datetime('due', 'Due date and time'),
    choices('priority', 'Priority', ['Low', 'Medium', 'High']),
    choices('status', 'Status', ['Not started', 'In progress', 'Completed', 'Submitted']),
    num('estimate', 'Estimated effort (minutes)'),
    num('weight', 'Grade weight (%)'),
    { key: 'description', label: 'Description', type: 'textarea', optional: true },
    { key: 'links', label: 'Resource links (one per line)', type: 'lines', optional: true },
    { key: 'checklist', label: 'Checklist', type: 'checklist' },
  ],
  exams: [
    title,
    moduleField,
    datetime('start', 'Exam date and start time'),
    num('minutes', 'Exam duration (minutes)'),
    { key: 'venue', label: 'Venue (optional)', optional: true },
    num('target', 'Personal target mark (%)'),
    num('importance', 'Importance (1–5)'),
    num('studyGoal', 'Revision goal (minutes)'),
    { key: 'topics', label: 'Revision topics', type: 'checklist' },
  ],
  studySessions: [
    title,
    { ...moduleField, optional: true },
    datetime('start', 'Start date and time'),
    num('minutes', 'Duration (minutes)'),
    { key: 'examId', label: 'Linked exam (optional)', type: 'exam', optional: true },
  ],
  calendarEvents: [
    title,
    { ...moduleField, optional: true },
    datetime('start', 'Start date and time'),
    num('minutes', 'Duration (minutes)'),
    choices('eventType', 'Type', ['Class', 'Test', 'Personal']),
    { key: 'location', label: 'Location (optional)', optional: true },
  ],
  assessments: [
    title,
    moduleField,
    choices('assessmentType', 'Type', ['Assignment', 'Test', 'Quiz', 'Practical', 'Exam']),
    num('obtained', 'Mark obtained'),
    num('maximum', 'Maximum mark'),
    num('weight', 'Weight toward module (%)'),
    datetime('date', 'Assessment date'),
  ],
  notes: [
    title,
    { ...moduleField, optional: true },
    { key: 'content', label: 'Note', type: 'textarea', optional: true },
    { key: 'tags', label: 'Topic tags (one per line)', type: 'lines', optional: true },
    { key: 'pinned', label: 'Pin this note', type: 'boolean' },
  ],
  goals: [
    title,
    choices('mode', 'Measure', [
      'Manual',
      'Study hours this week',
      'Streak days',
      'Early submissions',
      'Modules studied this week',
      'Current module grade',
    ]),
    { ...moduleField, optional: true },
    num('target', 'Target'),
    num('progress', 'Current progress', 'Used for manual goals'),
  ],
}
function defaults(kind: Editable, p: Profile, now: number): Record<string, unknown> {
  const start = Math.ceil((now + MINUTE) / (15 * MINUTE)) * 15 * MINUTE
  const common = { title: '', moduleId: '', start, minutes: p.sessionMinutes }
  switch (kind) {
    case 'modules':
      return {
        code: '',
        name: '',
        lecturer: '',
        period: p.periodType + ' ' + p.period,
        credits: 0,
        target: 75,
        difficulty: 3,
        confidence: 3,
        color: colors[0],
        archived: false,
      }
    case 'assignments':
      return {
        title: '',
        moduleId: '',
        description: '',
        due: start,
        priority: 'Medium',
        status: 'Not started',
        estimate: 60,
        weight: 0,
        links: [],
        checklist: [],
        finishedAt: 0,
      }
    case 'exams':
      return {
        ...common,
        minutes: 120,
        venue: '',
        target: 75,
        importance: 4,
        studyGoal: 120,
        topics: [],
      }
    case 'studySessions':
      return { ...common, source: 'manual', completedAt: 0, examId: '' }
    case 'calendarEvents':
      return { ...common, minutes: 60, eventType: 'Class', location: '' }
    case 'assessments':
      return {
        title: '',
        moduleId: '',
        assessmentType: 'Assignment',
        obtained: 0,
        maximum: 100,
        weight: 0,
        date: now,
      }
    case 'notes':
      return { title: '', moduleId: '', content: '', tags: [], pinned: false }
    case 'goals':
      return { title: '', moduleId: '', mode: 'Manual', target: 1, progress: 0 }
  }
}
export interface FormRequest {
  kind: Editable
  item?: Collections[Editable]
  preset?: Record<string, unknown>
}
export function RecordForm({
  request,
  data,
  profile,
  onSave,
  onCancel,
}: {
  request: FormRequest
  data: Data
  profile: Profile
  onSave: (change: Change) => Promise<void>
  onCancel: () => void
}) {
  const { kind, item, preset } = request
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const source: Record<string, unknown> = {
      ...defaults(kind, profile, Date.now()),
      ...item,
      ...preset,
    }
    for (const field of fields[kind]) {
      if (field.type === 'datetime-local')
        source[field.key] = localInput(Number(source[field.key]), profile.timezone)
      if (field.type === 'lines') source[field.key] = (source[field.key] as string[]).join('\n')
    }
    return source
  })
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const update = (key: string, value: unknown) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: '', form: '' }))
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    setErrors({})
    const normalized = { ...values }
    for (const f of fields[kind]) {
      if (f.type === 'datetime-local') {
        const original = item && (item as unknown as Record<string, unknown>)[f.key]
        normalized[f.key] =
          typeof original === 'number' && localInput(original, profile.timezone) === values[f.key]
            ? original
            : parseLocal(String(values[f.key]), profile.timezone)
      }
      if (f.type === 'lines')
        normalized[f.key] = String(values[f.key])
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      if (f.type === 'checklist')
        normalized[f.key] = (values[f.key] as Checklist).filter((s) => s.text.trim())
    }
    if (kind === 'assignments') {
      const previous = item as Collections['assignments'] | undefined
      normalized.finishedAt = isFinished(values.status as Collections['assignments']['status'])
        ? previous?.status === values.status && previous?.finishedAt
          ? previous.finishedAt
          : Date.now()
        : 0
    }
    const result = schemas[kind].safeParse(normalized)
    if (!result.success) {
      const issue = result.error.issues[0]
      setErrors({
        [String(issue.path[0] ?? 'form')]: issue.message,
        summary: 'Check the highlighted field and try again.',
      })
      return
    }
    if (kind === 'studySessions' || kind === 'calendarEvents' || kind === 'exams') {
      const start = Number(normalized.start),
        end = start + Number(normalized.minutes) * MINUTE
      const conflict = calendarEvents(data).find(
        (e) =>
          e.minutes && e.id !== item?.id && overlaps(start, end, e.start, e.start + e.minutes * MINUTE),
      )
      if (conflict) {
        setErrors({ form: 'This time overlaps with “' + conflict.title + '”. Choose another slot.' })
        return
      }
    }
    setPending(true)
    try {
      await onSave({
        kind,
        item: { ...(item ? { id: item.id, createdAt: item.createdAt } : base()), ...result.data },
      } as Change)
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'The record could not be saved. Try again.',
      })
      setPending(false)
    }
  }
  return (
    <form onSubmit={submit} className="record-form">
      <div className="field-grid">
        {fields[kind].map((f) => {
          if (f.key === 'progress' && values.mode !== 'Manual') return null
          const value = values[f.key]
          const long = f.type === 'textarea' || f.type === 'checklist' || f.type === 'lines'
          if (f.type === 'checklist')
            return (
              <fieldset key={f.key} className="full checklist-editor">
                <legend>{f.label}</legend>
                <ChecklistEditor value={value as Checklist} onChange={(items) => update(f.key, items)} />
                <ErrorText message={errors[f.key]} />
              </fieldset>
            )
          if (f.type === 'boolean')
            return (
              <label key={f.key} className="check full">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => update(f.key, e.target.checked)}
                />
                {f.label}
              </label>
            )
          return (
            <div className={long ? 'full' : ''} key={f.key}>
              <Field
                label={f.label}
                help={f.help ?? (f.type === 'datetime-local' ? profile.timezone : undefined)}
              >
                {f.type === 'module' ? (
                  <select
                    value={String(value)}
                    required={!f.optional}
                    onChange={(e) => update(f.key, e.target.value)}
                  >
                    <option value="">{f.optional ? 'General / no module' : 'Choose a module'}</option>
                    {data.modules
                      .filter((m) => !m.archived || m.id === value)
                      .map((m) => (
                        <option value={m.id} key={m.id}>
                          {m.code} · {m.name}
                        </option>
                      ))}
                    {Boolean(value) && !data.modules.some((m) => m.id === value) && (
                      <option value={String(value)}>Removed module</option>
                    )}
                  </select>
                ) : f.type === 'exam' ? (
                  <select value={String(value)} onChange={(e) => update(f.key, e.target.value)}>
                    <option value="">No exam</option>
                    {data.exams
                      .filter((e) => e.moduleId === values.moduleId || e.id === value)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.title}
                        </option>
                      ))}
                  </select>
                ) : f.choices ? (
                  <select value={String(value)} onChange={(e) => update(f.key, e.target.value)}>
                    {f.choices.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : long ? (
                  <textarea
                    placeholder={
                      kind === 'notes' && f.key === 'content'
                        ? 'Use **bold**, inline code or lists starting with -'
                        : undefined
                    }
                    rows={kind === 'notes' && f.key === 'content' ? 10 : 3}
                    value={String(value)}
                    onChange={(e) => update(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    type={f.type ?? 'text'}
                    step={f.type === 'number' ? 'any' : undefined}
                    required={!f.optional}
                    value={String(value ?? '')}
                    aria-invalid={Boolean(errors[f.key])}
                    onChange={(e) => update(f.key, e.target.value)}
                  />
                )}
              </Field>
              <ErrorText message={errors[f.key]} />
              {kind === 'assignments' && f.key === 'links' && item && 'links' in item && (
                <ul className="resource-links">
                  {item.links
                    .filter((link) => /^https?:\/\//i.test(link))
                    .map((link, index) => (
                      <li key={index}>
                        <a href={link} target="_blank" rel="noopener noreferrer">
                          {link}
                        </a>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
      <ErrorText message={errors.form || errors.summary} />
      <div className="form-actions">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={pending}>
          {pending ? 'Saving…' : item ? 'Save changes' : 'Add ' + nouns[kind]}
        </Button>
      </div>
    </form>
  )
}
export function ChecklistEditor({
  value,
  onChange,
}: {
  value: Checklist
  onChange: (value: Checklist) => void
}) {
  return (
    <div className="checklist-editor">
      {value.map((entry, index) => (
        <div className="checklist-item" key={entry.id}>
          <input
            type="checkbox"
            aria-label={'Complete item ' + (index + 1)}
            checked={entry.done}
            onChange={(e) =>
              onChange(value.map((v) => (v.id === entry.id ? { ...v, done: e.target.checked } : v)))
            }
          />
          <input
            aria-label={'Item ' + (index + 1)}
            value={entry.text}
            maxLength={250}
            onChange={(e) =>
              onChange(value.map((v) => (v.id === entry.id ? { ...v, text: e.target.value } : v)))
            }
          />
          <button
            className="icon-button"
            type="button"
            aria-label={'Remove item ' + (index + 1)}
            onClick={() => onChange(value.filter((v) => v.id !== entry.id))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={value.length >= 50}
        onClick={() => onChange([...value, { id: newId(), text: '', done: false }])}
      >
        <Plus size={15} />
        Add item
      </Button>
    </div>
  )
}
