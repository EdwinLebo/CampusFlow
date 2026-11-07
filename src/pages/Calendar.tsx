import { useMemo, useState, type DragEvent } from 'react'
import { addMonths, startOfMonth } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Download, Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useWorkspace } from '../app/Workspace'
import { useActions } from '../app/Actions'
import {
  Button,
  Card,
  CardTitle,
  Empty,
  Heading,
  Modal,
  ModuleDot,
  Pill,
  Segmented,
} from '../components/ui'
import { calendarEvents, download, futureAgenda, ics, type Event } from '../domain/calendar'
import {
  addLocalDays,
  formatDate,
  keyFor,
  localInput,
  MINUTE,
  overlaps,
  parseLocal,
  weekStart,
  zoned,
} from '../domain/time'

const types = ['All events', 'Class', 'Study', 'Assignment', 'Test', 'Exam', 'Personal']
const views = ['Month', 'Week', 'Day', 'Agenda'] as const
export function Calendar() {
  const { data, now, profile } = useWorkspace()
  const { edit, apply, remove, notify } = useActions()
  const [query, setQuery] = useSearchParams()
  const zone = profile.timezone
  const [view, setView] = useState<(typeof views)[number]>('Month')
  const [date, setDate] = useState(now)
  const [selected, setSelected] = useState<Event | null>(null)
  const filter = types.includes(query.get('type') ?? '') ? query.get('type')! : 'All events'
  const all = useMemo(() => calendarEvents(data), [data])
  const events = all.filter((e) => filter === 'All events' || e.type === filter)
  const monthStart = +startOfMonth(zoned(date, zone))
  const start =
    view === 'Month' ? weekStart(monthStart, zone) : view === 'Week' ? weekStart(date, zone) : date
  const days = Array.from({ length: view === 'Month' ? 42 : view === 'Week' ? 7 : 1 }, (_, i) =>
    addLocalDays(start, i, zone),
  )
  function move(direction: number) {
    setDate(
      view === 'Month'
        ? +addMonths(zoned(date, zone), direction)
        : addLocalDays(date, direction * (view === 'Week' ? 7 : view === 'Agenda' ? 30 : 1), zone),
    )
  }
  function onDrop(event: DragEvent, date: number) {
    event.preventDefault()
    const id = event.dataTransfer.getData('text/campusflow')
    const current = all.find((e) => e.id === id)
    if (!current) return
    const target = parseLocal(keyFor(date, zone) + 'T' + localInput(current.start, zone).slice(11), zone)
    if (target === current.start) return
    if (!Number.isFinite(target)) {
      notify('That local time is unavailable on this day.', true)
      return
    }
    if (
      current.minutes &&
      all.some(
        (e) =>
          e.id !== id &&
          e.minutes &&
          overlaps(target, target + current.minutes * MINUTE, e.start, e.start + e.minutes * MINUTE),
      )
    ) {
      notify('That time overlaps with another event.', true)
      return
    }
    switch (current.kind) {
      case 'assignments': {
        const item = data.assignments.find((e) => e.id === id)
        if (item) void apply([{ kind: current.kind, item: { ...item, due: target } }])
        break
      }
      case 'exams': {
        const item = data.exams.find((e) => e.id === id)
        if (item) void apply([{ kind: current.kind, item: { ...item, start: target } }])
        break
      }
      case 'studySessions': {
        const item = data.studySessions.find((e) => e.id === id)
        if (item && !item.completedAt)
          void apply([{ kind: current.kind, item: { ...item, start: target } }])
        break
      }
      case 'calendarEvents': {
        const item = data.calendarEvents.find((e) => e.id === id)
        if (item) void apply([{ kind: current.kind, item: { ...item, start: target } }])
        break
      }
    }
  }
  function dayEvents(day: number) {
    return events.filter((e) => keyFor(e.start, zone) === keyFor(day, zone))
  }
  function eventButton(event: Event, compact = false) {
    const color = data.modules.find((m) => m.id === event.moduleId)?.color
    return (
      <button
        key={event.id}
        className={'calendar-event ' + (compact ? 'calendar-event-mini' : '')}
        draggable
        onDragStart={(e) => e.dataTransfer.setData('text/campusflow', event.id)}
        onClick={() => setSelected(event)}
        title={event.title}
      >
        <ModuleDot color={color} />
        <span>{event.title}</span>
        <time>{formatDate(event.start, zone, compact ? 'HH:mm' : 'd MMM · HH:mm')}</time>
        {!compact && <Pill>{event.type}</Pill>}
      </button>
    )
  }
  const agenda = futureAgenda(events, parseLocal(keyFor(date, zone), zone))
  const item = selected ? data[selected.kind].find((record) => record.id === selected.id) : undefined
  return (
    <>
      <Heading
        kicker="WORKSPACE"
        title="Academic Calendar"
        description="Classes, deadlines, exams and study sessions in one place."
        action={
          <Button onClick={() => edit({ kind: 'calendarEvents' })}>
            <Plus size={17} />
            Add event
          </Button>
        }
      />
      <div className="toolbar filters">
        <Segmented items={views} value={view} onChange={setView} label="Calendar view" />
        <select
          aria-label="Event type"
          value={filter}
          onChange={(e) => setQuery(e.target.value === 'All events' ? {} : { type: e.target.value })}
        >
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <Button
          variant="outline"
          onClick={() => download('campusflow-calendar.ics', ics(events), 'text/calendar;charset=utf-8')}
        >
          <Download size={16} />
          Export .ics
        </Button>
      </div>
      <Card className="calendar-card">
        <div className="calendar-toolbar">
          <div>
            <h2>{formatDate(date, zone, view === 'Day' ? 'EEEE, d MMMM yyyy' : 'MMMM yyyy')}</h2>
            <p className="small muted">{zone}</p>
          </div>
          <div className="toolbar">
            <Button variant="outline" onClick={() => setDate(now)}>
              Today
            </Button>
            <button className="icon-button" aria-label="Previous period" onClick={() => move(-1)}>
              <ChevronLeft size={19} />
            </button>
            <button className="icon-button" aria-label="Next period" onClick={() => move(1)}>
              <ChevronRight size={19} />
            </button>
          </div>
        </div>
        {view === 'Month' ? (
          <>
            <div className="calendar-weekdays">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {days.map((day) => {
                const list = dayEvents(day)
                const key = keyFor(day, zone)
                return (
                  <div
                    key={key}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(e, day)}
                    className={
                      (key.slice(0, 7) !== keyFor(date, zone).slice(0, 7) ? 'outside ' : '') +
                      (key === keyFor(now, zone) ? 'today' : '')
                    }
                  >
                    <button
                      className="calendar-day-number"
                      aria-label={'Open ' + formatDate(day, zone, 'd MMMM')}
                      onClick={() => {
                        setDate(day)
                        setView('Day')
                      }}
                    >
                      {formatDate(day, zone, 'd')}
                    </button>
                    {list.slice(0, 2).map((e) => eventButton(e, true))}
                    {list.length > 2 && (
                      <button
                        className="calendar-more"
                        onClick={() => {
                          setDate(day)
                          setView('Day')
                        }}
                      >
                        +{list.length - 2} more
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : view === 'Agenda' ? (
          <div className="calendar-list">
            {agenda.length ? (
              agenda.map((e) => eventButton(e))
            ) : (
              <Empty
                title="No events in the next 90 days"
                detail="Choose a different date or add an event."
              />
            )}
          </div>
        ) : (
          <div className="calendar-list">
            {days.map((day) => (
              <div
                className="calendar-list-day"
                key={day}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, day)}
              >
                <div>
                  <h3>{formatDate(day, zone, 'EEEE, d MMMM')}</h3>
                  <button
                    className="icon-button"
                    aria-label={'Add event for ' + formatDate(day, zone, 'd MMMM')}
                    onClick={() =>
                      edit({
                        kind: 'calendarEvents',
                        preset: { start: parseLocal(keyFor(day, zone) + 'T09:00', zone) },
                      })
                    }
                  >
                    <Plus size={17} />
                  </button>
                </div>
                {dayEvents(day).length ? (
                  dayEvents(day).map((e) => eventButton(e))
                ) : (
                  <p className="muted small">No events</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="spaced">
        <CardTitle title="Coming up" subtitle="Next events across your calendar" />
        <div className="calendar-list">
          {futureAgenda(events, now)
            .slice(0, 4)
            .map((e) => eventButton(e))}
          {!futureAgenda(events, now).length && (
            <p className="muted">There are no upcoming events for this filter.</p>
          )}
        </div>
      </Card>
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <Pill>{selected.type}</Pill>
          <p className="spaced">
            <CalendarDays size={17} /> {formatDate(selected.start, zone)}
            {selected.minutes ? ' · ' + selected.minutes + ' minutes' : ''}
          </p>
          {item && (
            <div className="form-actions">
              <Button
                variant="danger"
                onClick={() => {
                  setSelected(null)
                  remove(selected.kind, item)
                }}
              >
                Delete
              </Button>
              <Button
                onClick={() => {
                  setSelected(null)
                  edit({ kind: selected.kind, item })
                }}
              >
                Edit event
              </Button>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
