export interface Timer {
  durationMs: number
  accumulated: number
  startedAt: number | null
  firstStart: number | null
}
export const makeTimer = (minutes: number): Timer => ({
  durationMs: minutes * 60_000,
  accumulated: 0,
  startedAt: null,
  firstStart: null,
})
export const elapsed = (timer: Timer, now: number) =>
  Math.min(
    timer.durationMs,
    timer.accumulated + (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt)),
  )
export const pause = (timer: Timer, now: number): Timer => ({
  ...timer,
  accumulated: elapsed(timer, now),
  startedAt: null,
})
export const resume = (timer: Timer, now: number): Timer =>
  timer.startedAt !== null ? timer : { ...timer, startedAt: now, firstStart: timer.firstStart ?? now }
