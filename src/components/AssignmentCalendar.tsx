import { useState } from 'react'
import { addMonths, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addLocalDays, formatDate, keyFor, weekStart, zoned } from '../domain/time'
import type { Assignment, Module } from '../domain/model'
import { Button, Card, ModuleDot } from './ui'

export function AssignmentCalendar({
  records,
  modules,
  zone,
  now,
  onOpen,
}: {
  records: Assignment[]
  modules: Module[]
  zone: string
  now: number
  onOpen: (assignment: Assignment) => void
}) {
  const [date, setDate] = useState(now)
  const [selected, setSelected] = useState('')
  const month = keyFor(date, zone).slice(0, 7)
  const today = keyFor(now, zone)
  const from = weekStart(+startOfMonth(zoned(date, zone)), zone)
  const days = Array.from({ length: 42 }, (_, i) => addLocalDays(from, i, zone))
  const dueByDay = new Map<string, Assignment[]>()
  for (const assignment of records) {
    const day = keyFor(assignment.due, zone)
    const entries = dueByDay.get(day) ?? []
    entries.push(assignment)
    dueByDay.set(day, entries)
  }
  function navigate(delta: number) {
    setDate(+addMonths(zoned(date, zone), delta))
    setSelected('')
  }
  return (
    <Card className="calendar-card">
      <div className="calendar-toolbar">
        <div>
          <h2>{formatDate(date, zone, 'MMMM yyyy')}</h2>
          <p className="muted small">Assignment deadlines · {zone}</p>
        </div>
        <div className="toolbar">
          <Button
            variant="outline"
            onClick={() => {
              setDate(now)
              setSelected(today)
            }}
          >
            Today
          </Button>
          <button className="icon-button" aria-label="Previous month" onClick={() => navigate(-1)}>
            <ChevronLeft size={19} />
          </button>
          <button className="icon-button" aria-label="Next month" onClick={() => navigate(1)}>
            <ChevronRight size={19} />
          </button>
        </div>
      </div>
      <div className="calendar-weekdays">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((day) => {
          const key = keyFor(day, zone)
          const entries = dueByDay.get(key) ?? []
          return (
            <div
              key={key}
              className={(key.startsWith(month) ? '' : 'outside ') + (key === today ? 'today' : '')}
            >
              <button
                className="calendar-day-number"
                aria-pressed={key === selected}
                aria-label={'Deadlines on ' + formatDate(day, zone, 'd MMMM')}
                onClick={() => setSelected(key)}
              >
                {formatDate(day, zone, 'd')}
              </button>
              {entries.slice(0, 2).map((a) => (
                <button
                  key={a.id}
                  className="calendar-event calendar-event-mini"
                  title={a.title}
                  onClick={() => onOpen(a)}
                >
                  <ModuleDot color={modules.find((m) => m.id === a.moduleId)?.color} />
                  <span>{a.title}</span>
                </button>
              ))}
              {entries.length > 2 && (
                <button className="calendar-more" onClick={() => setSelected(key)}>
                  +{entries.length - 2} more
                </button>
              )}
            </div>
          )
        })}
      </div>
      {selected && (
        <div className="calendar-list">
          <div className="calendar-list-day">
            <h3>
              {formatDate(
                days.find((day) => keyFor(day, zone) === selected) ?? date,
                zone,
                'EEEE, d MMMM',
              )}
            </h3>
            {dueByDay.get(selected)?.length ? (
              dueByDay.get(selected)!.map((a) => (
                <button className="calendar-event" key={a.id} onClick={() => onOpen(a)}>
                  <ModuleDot color={modules.find((m) => m.id === a.moduleId)?.color} />
                  <span>{a.title}</span>
                  <time>{formatDate(a.due, zone, 'HH:mm')}</time>
                </button>
              ))
            ) : (
              <p className="small muted">No matching deadlines.</p>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
