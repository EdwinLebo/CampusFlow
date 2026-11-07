export function reminderPhase(start, now, leads, overdue = false) {
  const hours = (start - now) / 3_600_000
  if (overdue && hours < 0) return 'late'
  if (hours <= 0) return null
  const lead = [...leads].sort((a, b) => a - b).find((days) => hours <= days * 24)
  return lead === undefined ? null : String(lead)
}

export function reminderId(id, start, phase) {
  return id + '-' + start + '-' + phase
}
