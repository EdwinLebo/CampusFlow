import type { Data } from './model'
import { DAY, MINUTE } from './time'
export type EventKind = 'assignments' | 'exams' | 'studySessions' | 'calendarEvents'
export interface Event {
  id: string
  title: string
  start: number
  minutes: number
  moduleId: string
  type: string
  kind: EventKind
}
export function calendarEvents(data: Data): Event[] {
  return [
    ...data.assignments.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.due,
      minutes: 0,
      moduleId: e.moduleId,
      type: 'Assignment',
      kind: 'assignments' as const,
    })),
    ...data.exams.map((e) => ({ ...e, type: 'Exam', kind: 'exams' as const })),
    ...data.studySessions.map((e) => ({ ...e, type: 'Study', kind: 'studySessions' as const })),
    ...data.calendarEvents.map((e) => ({ ...e, type: e.eventType, kind: 'calendarEvents' as const })),
  ].sort((a, b) => a.start - b.start)
}
const stamp = (ms: number) =>
  new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
const escape = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/[;,]/g, '\\$&')
function fold(line: string) {
  const bytes = new TextEncoder()
  let out = '',
    length = 0
  for (const char of line) {
    const size = bytes.encode(char).length
    if (length + size > 75) {
      out += '\r\n '
      length = 1
    }
    out += char
    length += size
  }
  return out
}
export function ics(
  events: { id: string; title: string; start: number; minutes: number }[],
  now = Date.now(),
) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CampusFlow//Academic Calendar//EN',
    'CALSCALE:GREGORIAN',
    ...events.flatMap((e) => [
      'BEGIN:VEVENT',
      'UID:' + e.id + '@campusflow.local',
      'DTSTAMP:' + stamp(now),
      'DTSTART:' + stamp(e.start),
      ...(e.minutes ? ['DTEND:' + stamp(e.start + e.minutes * MINUTE)] : []),
      'SUMMARY:' + escape(e.title),
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
    '',
  ]
    .map(fold)
    .join('\r\n')
}
export function download(name: string, content: string, type: string) {
  const href = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
export const futureAgenda = (events: Event[], from: number) =>
  events.filter((e) => e.start >= from && e.start < from + 90 * DAY)
