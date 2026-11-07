import type { Profile } from '../domain/model'
import { Field } from './ui'

export type UpdateProfile = <K extends keyof Profile>(key: K, value: Profile[K]) => void
export function ProfileFields({
  value: p,
  update,
  section,
}: {
  value: Profile
  update: UpdateProfile
  section: 'identity' | 'academic' | 'study'
}) {
  const text = (
    key: 'firstName' | 'lastName' | 'institution' | 'qualification' | 'timezone',
    label: string,
  ) => (
    <Field label={label}>
      <input
        value={p[key]}
        list={key === 'institution' ? 'institutions' : undefined}
        required={key !== 'lastName'}
        onChange={(e) => update(key, e.target.value)}
      />
    </Field>
  )
  const num = (
    key: 'studyYear' | 'academicYear' | 'period' | 'sessionMinutes' | 'breakMinutes' | 'dailyGoal',
    label: string,
    min: number,
    max: number,
  ) => (
    <Field label={label}>
      <input
        type="number"
        required
        min={min}
        max={max}
        value={Number.isFinite(p[key]) ? p[key] : ''}
        onChange={(e) => update(key, e.target.valueAsNumber)}
      />
    </Field>
  )
  if (section === 'identity')
    return (
      <div className="field-grid">
        {text('firstName', 'First name')}
        {text('lastName', 'Last name')}
        {text('institution', 'University or institution')}
        <datalist id="institutions">
          <option value="Tshwane University of Technology" />
          <option value="University of Pretoria" />
          <option value="University of Johannesburg" />
          <option value="University of Cape Town" />
        </datalist>
        {text('qualification', 'Qualification or course')}
        {num('studyYear', 'Year of study', 1, 12)}
      </div>
    )
  if (section === 'academic')
    return (
      <div className="field-grid">
        {num('academicYear', 'Academic year', 2000, 2100)}
        <Field label="Academic calendar">
          <select
            value={p.periodType}
            onChange={(e) => {
              update('periodType', e.target.value as Profile['periodType'])
              if (e.target.value === 'Semester' && p.period > 2) update('period', 1)
            }}
          >
            <option>Semester</option>
            <option>Term</option>
          </select>
        </Field>
        {num('period', p.periodType, 1, p.periodType === 'Semester' ? 2 : 4)}
        {text('timezone', 'Time zone')}
      </div>
    )
  return (
    <>
      <div className="field-grid">
        <Field label="Preferred time">
          <select
            value={p.preferredTime}
            onChange={(e) => update('preferredTime', e.target.value as Profile['preferredTime'])}
          >
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Evening</option>
          </select>
        </Field>
        {num('sessionMinutes', 'Session length (minutes)', 5, 180)}
        {num('breakMinutes', 'Break length (minutes)', 0, 120)}
        {num('dailyGoal', 'Daily study goal (minutes)', 0, 720)}
      </div>
      <fieldset className="day-picker">
        <legend>Preferred study days</legend>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
          <label key={day}>
            <input
              type="checkbox"
              checked={p.studyDays.includes(i)}
              onChange={(e) =>
                update(
                  'studyDays',
                  e.target.checked ? [...p.studyDays, i] : p.studyDays.filter((d) => d !== i),
                )
              }
            />
            <span>{day}</span>
          </label>
        ))}
      </fieldset>
    </>
  )
}
