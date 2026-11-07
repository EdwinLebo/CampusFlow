import { useState } from 'react'
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  Edit3,
  Plus,
  Trash2,
} from 'lucide-react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useActions } from '../app/Actions'
import { useWorkspace } from '../app/Workspace'
import { Button, Card, CardTitle, Empty, Heading, Pill, Progress, SearchInput } from '../components/ui'
import { grades, studyMinutes } from '../domain/metrics'
import { formatDate } from '../domain/time'
import type { Editable } from '../components/RecordForm'
import type { Collections } from '../domain/model'

export function Modules() {
  const { data, now, profile } = useWorkspace()
  const { edit, apply, remove } = useActions()
  const root = useOutletContext<string>()
  const [period, setPeriod] = useState('')
  const [filter, setFilter] = useState('active')
  const [query, setQuery] = useState('')
  const modules = data.modules.filter(
    (m) =>
      (filter === 'all' || m.archived === (filter === 'archived')) &&
      (!period || m.period === period) &&
      (m.name + ' ' + m.code).toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <>
      <Heading
        kicker="WORKSPACE"
        title="Modules"
        description="See what’s happening across your courses and how each one is progressing."
        action={
          <Button onClick={() => edit({ kind: 'modules' })}>
            <Plus size={17} />
            Add module
          </Button>
        }
      />
      <div className="toolbar filters">
        <SearchInput label="Search modules" value={query} onChange={setQuery} />
        <select
          aria-label="Filter by academic period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="">All academic periods</option>
          {[...new Set(data.modules.map((m) => m.period))].sort().map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          aria-label="Module visibility"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="active">Active modules</option>
          <option value="archived">Archived modules</option>
          <option value="all">All modules</option>
        </select>
      </div>
      {!modules.length ? (
        <Card>
          <Empty
            title={
              data.modules.length ? 'No modules match this view' : 'Start by adding your first module'
            }
            detail="Keep the assignments, exam dates and marks for each course together."
            action="Add module"
            onAction={() => edit({ kind: 'modules' })}
          />
        </Card>
      ) : (
        <div className="collection-grid">
          {modules.map((m) => {
            const marks = grades(data.assessments.filter((a) => a.moduleId === m.id))
            const time = studyMinutes(data.studySessions.filter((s) => s.moduleId === m.id))
            const next = data.exams
              .filter((e) => e.moduleId === m.id && e.start >= now)
              .sort((a, b) => a.start - b.start)[0]
            return (
              <Card className="module-card" key={m.id}>
                <div className="module-top">
                  <span className="module-icon" style={{ color: m.color }}>
                    <BookOpen size={22} />
                  </span>
                  <Pill>{m.archived ? 'Archived' : m.period}</Pill>
                </div>
                <Link className="module-title" to={root + '/modules/' + m.id}>
                  <span>{m.code}</span>
                  <h2>{m.name}</h2>
                  <ArrowUpRight size={17} />
                </Link>
                <p className="muted small">
                  {m.lecturer || 'Lecturer not set'}
                  {m.credits ? ' · ' + m.credits + ' credits' : ''}
                </p>
                <div className="module-stats">
                  <div>
                    <small>Current grade</small>
                    <strong>{marks.average === null ? '—' : marks.average.toFixed(1) + '%'}</strong>
                  </div>
                  <div>
                    <small>Target</small>
                    <strong>{m.target}%</strong>
                  </div>
                  <div>
                    <small>Study time</small>
                    <strong>{(time / 60).toFixed(1)}h</strong>
                  </div>
                </div>
                <Progress
                  value={m.target && marks.average !== null ? (marks.average / m.target) * 100 : 0}
                  label="Progress toward target grade"
                />
                <div className="module-meta">
                  <span>{data.assignments.filter((a) => a.moduleId === m.id).length} assignments</span>
                  <span>
                    <CalendarClock size={15} />
                    {next ? formatDate(next.start, profile.timezone, 'd MMM') : 'No exam date'}
                  </span>
                </div>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    aria-label={'Edit ' + m.code}
                    onClick={() => edit({ kind: 'modules', item: m })}
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={(m.archived ? 'Restore ' : 'Archive ') + m.code}
                    onClick={() =>
                      void apply(
                        [{ kind: 'modules', item: { ...m, archived: !m.archived } }],
                        m.archived ? 'Module restored' : 'Module archived',
                      )
                    }
                  >
                    <Archive size={16} />
                  </button>
                  <button
                    className="icon-button destructive"
                    aria-label={'Delete ' + m.code}
                    onClick={() => remove('modules', m)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
export function ModuleDetail() {
  const { id } = useParams()
  const { data, profile } = useWorkspace()
  const { edit } = useActions()
  const root = useOutletContext<string>()
  const m = data.modules.find((item) => item.id === id)
  if (!m)
    return (
      <Card>
        <Empty title="Module unavailable" detail="It may have been deleted." />
        <Link className="button outline" to={root + '/modules'}>
          <ArrowLeft size={16} />
          Back to modules
        </Link>
      </Card>
    )
  const grade = grades(data.assessments.filter((a) => a.moduleId === id))
  const sections: [Editable, string, (item: Collections[Editable]) => string][] = [
    [
      'assignments',
      'Assignments',
      (item) => ('due' in item ? formatDate(item.due, profile.timezone) : ''),
    ],
    [
      'exams',
      'Examinations',
      (item) => ('start' in item ? formatDate(item.start, profile.timezone) : ''),
    ],
    [
      'calendarEvents',
      'Tests and events',
      (item) => ('start' in item ? formatDate(item.start, profile.timezone) : ''),
    ],
    [
      'studySessions',
      'Study sessions',
      (item) => ('start' in item ? formatDate(item.start, profile.timezone) : ''),
    ],
    [
      'assessments',
      'Marks and assessments',
      (item) =>
        'obtained' in item ? item.obtained + '/' + item.maximum + ' · ' + item.weight + '% weight' : '',
    ],
    ['notes', 'Notes', (item) => ('tags' in item ? item.tags.join(', ') : '')],
  ]
  return (
    <>
      <Link className="back-link" to={root + '/modules'}>
        <ArrowLeft size={16} />
        All modules
      </Link>
      <Heading
        kicker={m.code + ' · ' + m.period}
        title={m.name}
        description={(m.lecturer || 'Lecturer not set') + (m.archived ? ' · Archived' : '')}
        action={
          <Button onClick={() => edit({ kind: 'modules', item: m })}>
            <Edit3 size={16} />
            Edit module
          </Button>
        }
      />
      <Card className="spaced">
        <CardTitle
          title="Academic progress"
          subtitle={grade.weight + '% of the module grade recorded'}
        />
        <div className="module-stats">
          <div>
            <small>Assessed average</small>
            <strong>{grade.average === null ? '—' : grade.average.toFixed(1) + '%'}</strong>
          </div>
          <div>
            <small>Target grade</small>
            <strong>{m.target}%</strong>
          </div>
          <div>
            <small>Completed study</small>
            <strong>
              {(studyMinutes(data.studySessions.filter((s) => s.moduleId === id)) / 60).toFixed(1)}h
            </strong>
          </div>
        </div>
        <Progress
          value={m.target && grade.average !== null ? (grade.average / m.target) * 100 : 0}
          label="Progress toward target grade"
        />
      </Card>
      <div className="two-grid spaced">
        {sections.map(([kind, title, detail]) => {
          const items = data[kind].filter((item) => 'moduleId' in item && item.moduleId === id)
          return (
            <Card key={kind}>
              <CardTitle
                title={title}
                action={
                  <button
                    className="icon-button"
                    aria-label={'Add ' + title.toLowerCase()}
                    onClick={() => edit({ kind, preset: { moduleId: id } })}
                  >
                    <Plus size={17} />
                  </button>
                }
              />
              {items.length ? (
                <div className="simple-list">
                  {items.map((item) => (
                    <button key={item.id} onClick={() => edit({ kind, item })}>
                      <span>{'title' in item ? item.title : ''}</span>
                      <small>{detail(item)}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">No records yet.</p>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}
