import { TZDate } from '@date-fns/tz'
import { addDays, differenceInCalendarDays, format, startOfWeek } from 'date-fns'

export const DAY = 86_400_000
export const MINUTE = 60_000
export const zoned = (ms: number, zone: string) => new TZDate(ms, zone)
export const keyFor = (ms: number, zone: string) => format(zoned(ms, zone), 'yyyy-MM-dd')
export const localInput = (ms: number, zone: string) => format(zoned(ms, zone), "yyyy-MM-dd'T'HH:mm")
export const formatDate = (ms: number, zone: string, pattern = 'EEE, d MMM · HH:mm') =>
  format(zoned(ms, zone), pattern)
export function parseLocal(value: string, zone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value)
  if (!match) return NaN
  const [, y, m, d, h = '00', min = '00'] = match
  const ms = +new TZDate(+y, +m - 1, +d, +h, +min, 0, zone)
  return Number.isFinite(ms) && localInput(ms, zone) === y + '-' + m + '-' + d + 'T' + h + ':' + min
    ? ms
    : NaN
}
export const addLocalDays = (ms: number, days: number, zone: string) => +addDays(zoned(ms, zone), days)
export const dayDiff = (a: number, b: number, zone: string) =>
  differenceInCalendarDays(zoned(a, zone), zoned(b, zone))
export const weekStart = (ms: number, zone: string) => +startOfWeek(zoned(ms, zone), { weekStartsOn: 1 })
export function deadlineLabel(due: number, now: number, zone: string) {
  const days = dayDiff(due, now, zone)
  if (due < now)
    return days === 0
      ? 'Overdue today'
      : 'Overdue by ' + Math.abs(days) + (days === -1 ? ' day' : ' days')
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return days + ' days remaining'
}
export function countdown(start: number, now: number) {
  const minutes = Math.max(0, Math.ceil((start - now) / MINUTE))
  return {
    days: Math.floor(minutes / 1440),
    hours: Math.floor((minutes % 1440) / 60),
    minutes: minutes % 60,
  }
}
export const overlaps = (a: number, b: number, c: number, d: number) => a < d && c < b
