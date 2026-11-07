import { isFinished, type Data, type Session } from './model'
import { addLocalDays, keyFor, MINUTE, overlaps, parseLocal, zoned } from './time'

export interface PlannerOptions {
  now: number
  zone: string
  days: number[]
  windows: { from: string; to: string }[]
  horizon: number
  minutes: number
  breakMinutes: number
  maxDaily: number
}
export type Draft = Omit<Session, 'id' | 'createdAt'> & { key: string; locked?: boolean }
export function occupied(data: Data) {
  return [...data.exams, ...data.studySessions, ...data.calendarEvents].map((e) => ({
    start: e.start,
    end: e.start + e.minutes * MINUTE,
  }))
}
export function generatePlan(data: Data, options: PlannerOptions, locked: Draft[] = []) {
  const { now, zone, days, windows, horizon, minutes, breakMinutes, maxDaily } = options
  const busy = [
    ...occupied(data),
    ...locked.map((e) => ({ start: e.start, end: e.start + e.minutes * MINUTE })),
  ]
  const active = new Map(data.modules.filter((m) => !m.archived).map((m) => [m.id, m]))
  const candidates = [
    ...data.assignments
      .filter((a) => !isFinished(a.status) && a.due > now)
      .map((a) => ({
        id: a.id,
        moduleId: a.moduleId,
        title: a.title,
        deadline: a.due,
        importance: { Low: 1, Medium: 2, High: 4 }[a.priority] + a.weight / 25,
        examId: '',
        limit: Math.max(1, Math.ceil(a.estimate / minutes)),
      })),
    ...data.exams
      .filter((e) => e.start > now)
      .map((e) => ({
        id: e.id,
        moduleId: e.moduleId,
        title: e.title,
        deadline: e.start,
        importance: e.importance,
        examId: e.id,
        limit: Math.max(2, Math.ceil(e.studyGoal / minutes)),
      })),
  ].filter((c) => active.has(c.moduleId))
  const uses = new Map<string, number>()
  const drafts = [...locked]
  locked.forEach((d) => uses.set(d.key.split('@')[0], (uses.get(d.key.split('@')[0]) ?? 0) + 1))
  for (let i = 0; i < horizon; i++) {
    const date = addLocalDays(now, i, zone)
    if (!days.includes(zoned(date, zone).getDay())) continue
    const day = keyFor(date, zone)
    const existing = [...data.studySessions, ...locked].filter(
      (s) => keyFor(s.start, zone) === day,
    ).length
    let count = existing
    const usedToday = new Set(
      locked.filter((s) => keyFor(s.start, zone) === day).map((d) => d.key.split('@')[0]),
    )
    for (const window of windows) {
      const from = parseLocal(day + 'T' + window.from, zone)
      const to = parseLocal(day + 'T' + window.to, zone)
      for (let start = from; start + minutes * MINUTE <= to && count < maxDaily; start += 15 * MINUTE) {
        const end = start + minutes * MINUTE
        if (
          start < now ||
          busy.some((b) =>
            overlaps(start - breakMinutes * MINUTE, end + breakMinutes * MINUTE, b.start, b.end),
          )
        )
          continue
        const possible = candidates.filter(
          (c) => end <= c.deadline && (uses.get(c.id) ?? 0) < c.limit && !usedToday.has(c.id),
        )
        const score = (c: (typeof candidates)[number]) => {
          const m = active.get(c.moduleId)!
          return (
            24 / (1 + (c.deadline - start) / (1440 * MINUTE)) +
            c.importance * 2 +
            m.difficulty +
            (6 - m.confidence) -
            (uses.get(c.id) ?? 0) * 3
          )
        }
        const selected = possible.sort(
          (a, b) => score(b) - score(a) || a.deadline - b.deadline || a.id.localeCompare(b.id),
        )[0]
        if (!selected) continue
        drafts.push({
          key: selected.id + '@' + start,
          title: (selected.examId ? 'Revise ' : 'Work on ') + selected.title,
          moduleId: selected.moduleId,
          start,
          minutes,
          completedAt: 0,
          source: 'planner',
          examId: selected.examId,
        })
        busy.push({ start, end })
        uses.set(selected.id, (uses.get(selected.id) ?? 0) + 1)
        usedToday.add(selected.id)
        count++
      }
    }
  }
  return { drafts: drafts.sort((a, b) => a.start - b.start), candidates: candidates.length }
}
