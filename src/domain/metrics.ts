import { reminderId, reminderPhase } from '../../firebase/functions/reminder-policy.js'
import {
  isFinished,
  type Data,
  type Assessment,
  type Exam,
  type Session,
  type Goal,
  type Profile,
} from './model'
import { addLocalDays, formatDate, keyFor, MINUTE, weekStart } from './time'

export function grades(records: Assessment[]) {
  const weight = Number(records.reduce((sum, item) => sum + item.weight, 0).toFixed(8))
  const contribution = records.reduce(
    (sum, item) => sum + (item.obtained / item.maximum) * item.weight,
    0,
  )
  return { weight, contribution, average: weight > 0 ? (contribution / weight) * 100 : null }
}
export function requiredMark(records: Assessment[], target: number) {
  const { weight, contribution } = grades(records)
  return weight > 0 && weight < 100 ? ((target - contribution) / (100 - weight)) * 100 : null
}
export const studyMinutes = (sessions: Session[]) =>
  sessions.reduce((sum, session) => sum + (session.completedAt ? session.minutes : 0), 0)
export const sessionsThisWeek = (sessions: Session[], now: number, zone: string) =>
  sessions.filter((s) => s.completedAt >= weekStart(now, zone) && s.completedAt <= now)
export function studyStreak(sessions: Session[], now: number, zone: string) {
  const days = new Set(
    sessions
      .filter((s) => s.completedAt > 0 && s.completedAt <= now && s.minutes > 0)
      .map((s) => keyFor(s.completedAt, zone)),
  )
  let offset = days.has(keyFor(now, zone)) ? 0 : 1
  let streak = 0
  while (days.has(keyFor(addLocalDays(now, -offset++, zone), zone))) streak++
  return streak
}
export function weeklyChart(sessions: Session[], now: number, zone: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addLocalDays(weekStart(now, zone), i, zone)
    const key = keyFor(date, zone)
    return {
      name: formatDate(date, zone, 'EEE'),
      minutes: studyMinutes(
        sessions.filter(
          (s) => s.completedAt && s.completedAt <= now && keyFor(s.completedAt, zone) === key,
        ),
      ),
    }
  })
}
export function preparation(exam: Exam, sessions: Session[]) {
  const done = exam.topics.filter((t) => t.done).length
  const topics = exam.topics.length ? done / exam.topics.length : null
  const study =
    exam.studyGoal > 0
      ? Math.min(1, studyMinutes(sessions.filter((s) => s.examId === exam.id)) / exam.studyGoal)
      : null
  const parts = [topics, study].filter((value): value is number => value !== null)
  return parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : 0
}
export function goalProgress(goal: Goal, data: Data, now: number, zone: string) {
  const week = sessionsThisWeek(data.studySessions, now, zone)
  switch (goal.mode) {
    case 'Study hours this week':
      return studyMinutes(week) / 60
    case 'Streak days':
      return studyStreak(data.studySessions, now, zone)
    case 'Early submissions':
      return data.assignments.filter(
        (a) => a.status === 'Submitted' && a.finishedAt > 0 && a.finishedAt <= a.due - 2 * 1440 * MINUTE,
      ).length
    case 'Modules studied this week':
      return new Set(week.filter((s) => s.moduleId).map((s) => s.moduleId)).size
    case 'Current module grade':
      return grades(data.assessments.filter((a) => a.moduleId === goal.moduleId)).average ?? 0
    default:
      return goal.progress
  }
}
export function achievements(data: Data, now: number, zone: string) {
  const completed = data.studySessions.filter(
    (s) => s.completedAt && s.completedAt <= now && s.minutes > 0,
  )
  const bestStreak = completed.some((s) => studyStreak(completed, s.completedAt, zone) >= 3)
  return [
    { name: 'First Step', detail: 'Complete your first study session.', earned: completed.length > 0 },
    { name: 'Consistency Builder', detail: 'Study on three consecutive days.', earned: bestStreak },
    {
      name: 'Focus Champion',
      detail: 'Complete ten focus sessions.',
      earned: completed.filter((s) => s.source === 'focus').length >= 10,
    },
    {
      name: 'Deadline Hero',
      detail: 'Submit five assignments before their deadlines.',
      earned:
        data.assignments.filter(
          (a) => a.status === 'Submitted' && a.finishedAt > 0 && a.finishedAt < a.due,
        ).length >= 5,
    },
    {
      name: 'Exam Ready',
      detail: 'Complete every revision topic for an exam.',
      earned: data.exams.some((e) => e.topics.length && e.topics.every((t) => t.done)),
    },
  ]
}
export interface Reminder {
  id: string
  title: string
  detail: string
  route: string
}
export function reminders(data: Data, profile: Profile, now: number): Reminder[] {
  const result: Reminder[] = []
  function add(id: string, title: string, start: number, route: string, overdue = false) {
    const phase = reminderPhase(start, now, profile.reminders, overdue)
    if (phase !== null)
      result.push({
        id: reminderId(id, start, phase),
        title,
        detail: phase === 'late' ? 'Assignment overdue' : formatDate(start, profile.timezone),
        route,
      })
  }
  data.assignments
    .filter((a) => !isFinished(a.status))
    .forEach((a) => add(a.id, a.title, a.due, 'assignments', true))
  data.exams.forEach((e) => add(e.id, e.title, e.start, 'exams'))
  data.studySessions.filter((s) => !s.completedAt).forEach((s) => add(s.id, s.title, s.start, 'planner'))
  const day = keyFor(now, profile.timezone)
  const studied = studyMinutes(
    data.studySessions.filter((s) => s.completedAt && keyFor(s.completedAt, profile.timezone) === day),
  )
  if (profile.dailyGoal > studied && Number(formatDate(now, profile.timezone, 'HH')) >= 17)
    result.push({
      id: 'goal-' + day,
      title: 'Daily study goal',
      detail: Math.ceil(profile.dailyGoal - studied) + ' minutes to go',
      route: 'focus',
    })
  return result
}
