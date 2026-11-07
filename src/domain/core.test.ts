import { describe, expect, it } from 'vitest'
import { seedDemo } from '../services/demo'
import { emptyData, isFinished } from './model'
import { achievements, grades, preparation, reminders, requiredMark, studyStreak } from './metrics'
import { calendarEvents, ics } from './calendar'
import { generatePlan, occupied } from './planner'
import { countdown, deadlineLabel, keyFor, localInput, MINUTE, overlaps, parseLocal } from './time'
import { elapsed, makeTimer, pause, resume } from './timer'
import { schemas, signupSchema } from './validation'
const zone = 'Africa/Johannesburg'
const now = parseLocal('2026-11-09T07:00', zone)
describe('timezone, countdowns and exports', () => {
  it('preserves midnight in the configured timezone and rejects nonexistent times', () => {
    const ms = parseLocal('2026-11-10T00:05', zone)
    expect(new Date(ms).toISOString()).toBe('2026-11-09T22:05:00.000Z')
    expect(localInput(ms, zone)).toBe('2026-11-10T00:05')
    expect(keyFor(ms, 'UTC')).toBe('2026-11-09')
    expect(parseLocal('2026-03-08T02:30', 'America/New_York')).toBeNaN()
    expect(parseLocal('2026-11-31T13:00', zone)).toBeNaN()
  })
  it('uses local dates for labels and elapsed time for countdowns', () => {
    expect(deadlineLabel(parseLocal('2026-11-10T00:05', zone), now, zone)).toBe('Due tomorrow')
    expect(deadlineLabel(now - 1, now, zone)).toBe('Overdue today')
    expect(countdown(now + 26 * 60 * MINUTE + 7 * MINUTE, now)).toEqual({
      days: 1,
      hours: 2,
      minutes: 7,
    })
    expect(countdown(now - 1000, now)).toEqual({ days: 0, hours: 0, minutes: 0 })
  })
  it('exports escaped UTF-8 iCalendar records in UTC', () => {
    const result = ics(
      [{ id: '1', title: 'Zé'.repeat(35) + ', then\nreview', start: now, minutes: 45 }],
      now,
    )
    expect(result).toContain('DTSTART:20261109T050000Z')
    expect(result).toContain('DTEND:20261109T054500Z')
    expect(result.replace(/\r\n /g, '')).toContain('\\, then\\nreview')
    expect(result.split('\r\n').every((line) => Buffer.byteLength(line) <= 75)).toBe(true)
  })
})
describe('planner', () => {
  const opts = {
    now,
    zone,
    days: [1, 2, 3, 4, 5],
    windows: [{ from: '08:00', to: '17:00' }],
    horizon: 10,
    minutes: 45,
    breakMinutes: 15,
    maxDaily: 3,
  }
  it('is deterministic and respects dates, conflicts, spacing and locks', () => {
    const { data } = seedDemo(now)
    const a = generatePlan(data, opts)
    expect(a.drafts.length).toBeGreaterThan(0)
    expect(a).toEqual(generatePlan(data, opts))
    const busy = occupied(data)
    const perDay = new Map<string, number>()
    for (const s of data.studySessions) {
      const day = keyFor(s.start, zone)
      perDay.set(day, (perDay.get(day) ?? 0) + 1)
    }
    for (const s of a.drafts) {
      const end = s.start + s.minutes * MINUTE,
        day = keyFor(s.start, zone)
      const id = s.key.split('@')[0],
        deadline =
          data.exams.find((e) => e.id === id)?.start ??
          data.assignments.find((e) => e.id === id)?.due ??
          0
      expect(end).toBeLessThanOrEqual(deadline)
      expect(busy.some((b) => overlaps(s.start - 15 * MINUTE, end + 15 * MINUTE, b.start, b.end))).toBe(
        false,
      )
      busy.push({ start: s.start, end })
      perDay.set(day, (perDay.get(day) ?? 0) + 1)
      expect(perDay.get(day)).toBeLessThanOrEqual(3)
    }
    const locked = { ...a.drafts[0], locked: true }
    expect(generatePlan(data, opts, [locked]).drafts).toContainEqual(locked)
    expect(generatePlan(data, { ...opts, windows: [{ from: '09:00', to: '09:10' }] }).drafts).toEqual([])
  })
  it('chooses urgent, difficult and important work first', () => {
    const { data } = seedDemo(now)
    data.calendarEvents = []
    data.studySessions = []
    data.assignments = []
    data.exams = data.exams.slice(0, 2)
    data.exams[0] = { ...data.exams[0], start: now + 1000 * MINUTE, importance: 5 }
    data.exams[1] = { ...data.exams[1], start: now + 5000 * MINUTE, importance: 1 }
    expect(generatePlan(data, { ...opts, maxDaily: 1 }).drafts[0].examId).toBe(data.exams[0].id)
    expect(generatePlan(emptyData(), opts)).toEqual({ drafts: [], candidates: 0 })
  })
})
describe('record validation and analytics', () => {
  const { data, profile } = seedDemo(now)
  it('validates registration and weighted marks', () => {
    const values = {
      firstName: 'Alex',
      lastName: 'Mokoena',
      email: 'alex@example.test',
      password: '12345678',
      confirm: '12345678',
    }
    expect(signupSchema.safeParse(values).success).toBe(true)
    expect(signupSchema.safeParse({ ...values, confirm: 'other' }).success).toBe(false)
    expect(signupSchema.safeParse({ ...values, email: 'bad' }).success).toBe(false)
    expect(schemas.assessments.safeParse({ ...data.assessments[0], obtained: 51 }).success).toBe(false)
    const marks = [{ ...data.assessments[0], obtained: 40, maximum: 50, weight: 25 }]
    expect(grades(marks)).toEqual({ weight: 25, contribution: 20, average: 80 })
    expect(requiredMark(marks, 80)).toBe(80)
    expect(requiredMark([], 80)).toBeNull()
    expect(
      requiredMark(
        marks.map((a) => ({ ...a, weight: 100 })),
        80,
      ),
    ).toBeNull()
  })
  it('counts active days and real revision progress', () => {
    expect(studyStreak(data.studySessions, now, zone)).toBe(6)
    expect(studyStreak(data.studySessions, parseLocal('2026-11-10T07:00', zone), zone)).toBe(0)
    expect(preparation(data.exams[0], data.studySessions)).toBe(43)
    expect(achievements(data, now, zone).find((a) => a.name === 'Consistency Builder')?.earned).toBe(
      true,
    )
  })
  it('returns unique lead reminders and omits finished assignments', () => {
    const notifications = reminders(data, profile, now)
    expect(notifications.length).toBeGreaterThan(0)
    expect(new Set(notifications.map((n) => n.id)).size).toBe(notifications.length)
    for (const item of data.assignments.filter((a) => isFinished(a.status)))
      expect(notifications.some((n) => n.id.startsWith(item.id))).toBe(false)
    expect(notifications.some((n) => n.id.endsWith('-late'))).toBe(true)
    expect(calendarEvents(data).some((e) => e.type === 'Class')).toBe(true)
  })
  it('uses timestamp elapsed time and excludes paused intervals', () => {
    const initial = makeTimer(25)
    const running = resume(initial, now)
    const stopped = pause(running, now + 3 * MINUTE)
    expect(elapsed(stopped, now + 99 * MINUTE)).toBe(3 * MINUTE)
    const resumed = resume(stopped, now + 100 * MINUTE)
    expect(elapsed(resumed, now + 106 * MINUTE)).toBe(9 * MINUTE)
    expect(elapsed(resumed, now + 140 * MINUTE)).toBe(25 * MINUTE)
  })
})
