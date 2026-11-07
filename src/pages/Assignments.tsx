import { useState } from 'react'
import { Check, ClipboardList, Edit3, Plus, Trash2 } from 'lucide-react'
import { AssignmentCalendar } from '../components/AssignmentCalendar'
import { useActions } from '../app/Actions'
import { useWorkspace } from '../app/Workspace'
import { Button, Card, Empty, Heading, ModuleDot, Pill, SearchInput, Segmented } from '../components/ui'
import { useRecordLink } from '../components/useRecordLink'
import { isFinished, moduleName, type Assignment, type Status } from '../domain/model'
import { deadlineLabel, formatDate } from '../domain/time'

const statuses = ['Not started', 'In progress', 'Completed', 'Submitted'] as const
export function Assignments() {
  const { data, profile, now } = useWorkspace()
  const { edit, apply, remove } = useActions()

  useRecordLink('assignments')
  const [view, setView] = useState<'List' | 'Board' | 'Calendar'>('List')
  const [search, setSearch] = useState('')
  const [module, setModule] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('')
  const [order, setOrder] = useState('soon')
  const records = data.assignments
    .filter(
      (a) =>
        (!module || a.moduleId === module) &&
        (!priority || a.priority === priority) &&
        (!status ||
          (status === 'Overdue' ? !isFinished(a.status) && a.due < now : a.status === status)) &&
        (a.title + ' ' + a.description + ' ' + moduleName(data.modules, a.moduleId))
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => (order === 'soon' ? a.due - b.due : b.due - a.due))
  function changeStatus(a: Assignment, next: Status) {
    if (a.status !== next)
      void apply(
        [
          {
            kind: 'assignments',
            item: { ...a, status: next, finishedAt: isFinished(next) ? Date.now() : 0 },
          },
        ],
        next === 'Completed' ? 'Assignment completed' : 'Assignment updated',
      )
  }
  function row(a: Assignment, board = false) {
    const overdue = !isFinished(a.status) && a.due < now
    const done = a.checklist.filter((c) => c.done).length
    const percent = a.checklist.length
      ? Math.round((done / a.checklist.length) * 100)
      : isFinished(a.status)
        ? 100
        : 0
    return (
      <div className={'assignment-row ' + (board ? 'board-item' : '')} key={a.id}>
        <div className="assignment-main">
          <button
            className={'task-toggle ' + (isFinished(a.status) ? 'checked' : '')}
            aria-label={isFinished(a.status) ? 'Reopen ' + a.title : 'Complete ' + a.title}
            onClick={() => changeStatus(a, isFinished(a.status) ? 'Not started' : 'Completed')}
          >
            {isFinished(a.status) && <Check size={13} />}
          </button>
          <button className="record-title" onClick={() => edit({ kind: 'assignments', item: a })}>
            <strong>{a.title}</strong>
            <small>
              <ModuleDot color={data.modules.find((m) => m.id === a.moduleId)?.color} />
              {moduleName(data.modules, a.moduleId)}
              {a.checklist.length > 0 && ' · ' + percent + '% checklist'}
            </small>
          </button>
        </div>
        <div className="assignment-date">
          <strong>{formatDate(a.due, profile.timezone, 'd MMM · HH:mm')}</strong>
          <small className={overdue ? 'text-danger' : ''}>
            {!isFinished(a.status) ? deadlineLabel(a.due, now, profile.timezone) : 'Finished'}
          </small>
        </div>
        <Pill tone={a.priority === 'High' ? 'red' : a.priority === 'Medium' ? 'amber' : 'neutral'}>
          {a.priority}
        </Pill>
        <select
          className="compact-select"
          aria-label={'Status for ' + a.title}
          value={a.status}
          onChange={(e) => changeStatus(a, e.target.value as Status)}
        >
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <div className="row-actions">
          <button
            className="icon-button"
            aria-label={'Edit ' + a.title}
            onClick={() => edit({ kind: 'assignments', item: a })}
          >
            <Edit3 size={16} />
          </button>
          <button
            className="icon-button destructive"
            aria-label={'Delete ' + a.title}
            onClick={() => remove('assignments', a)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    )
  }
  return (
    <>
      <Heading
        kicker="WORKSPACE"
        title="Assignments"
        description="Keep track of every brief, deadline and submission."
        action={
          <Button onClick={() => edit({ kind: 'assignments' })}>
            <Plus size={17} />
            New assignment
          </Button>
        }
      />
      <div className="toolbar filters">
        <Segmented
          items={['List', 'Board', 'Calendar']}
          value={view}
          onChange={setView}
          label="Assignment view"
        />
        <SearchInput label="Search assignments" value={search} onChange={setSearch} />
        <select aria-label="Filter by module" value={module} onChange={(e) => setModule(e.target.value)}>
          <option value="">All modules</option>
          {data.modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          {['High', 'Medium', 'Low'].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {[...statuses, 'Overdue'].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select aria-label="Sort by deadline" value={order} onChange={(e) => setOrder(e.target.value)}>
          <option value="soon">Earliest due</option>
          <option value="late">Latest due</option>
        </select>
      </div>
      {view === 'Calendar' ? (
        <AssignmentCalendar
          records={records}
          modules={data.modules}
          zone={profile.timezone}
          now={now}
          onOpen={(item) => edit({ kind: 'assignments', item })}
        />
      ) : !records.length ? (
        <Card>
          <Empty
            title={data.assignments.length ? 'No matching assignments' : 'Nothing due right now'}
            detail={
              data.assignments.length
                ? 'Try a different search or filter.'
                : 'Enjoy the breathing room. Add your next brief when it arrives.'
            }
            action="Add assignment"
            onAction={() => edit({ kind: 'assignments' })}
          />
        </Card>
      ) : view === 'Board' ? (
        <div className="board">
          {statuses.map((s) => (
            <Card key={s}>
              <div className="board-label">
                {s}
                <Pill>{records.filter((a) => a.status === s).length}</Pill>
              </div>
              {records.filter((a) => a.status === s).map((a) => row(a, true))}
              {!records.some((a) => a.status === s) && <p className="muted small">No assignments</p>}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="table-card">
          <div className="assignment-row table-head">
            <span>
              <ClipboardList size={15} /> Assignment
            </span>
            <span>Deadline</span>
            <span>Priority</span>
            <span>Status</span>
            <span />
          </div>
          {records.map((a) => row(a))}
        </Card>
      )}
    </>
  )
}
