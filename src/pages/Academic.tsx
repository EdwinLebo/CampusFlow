import { useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Award, CheckCircle2, Clock3, Edit3, Flame, Plus, Target, Trash2 } from 'lucide-react'
import { useWorkspace } from '../app/Workspace'
import { useActions } from '../app/Actions'
import {
  Button,
  Card,
  CardTitle,
  Empty,
  ErrorText,
  Field,
  Heading,
  ModuleDot,
  Progress,
} from '../components/ui'
import {
  grades,
  preparation,
  requiredMark,
  sessionsThisWeek,
  studyMinutes,
  studyStreak,
  weeklyChart,
} from '../domain/metrics'
import { isFinished, moduleName } from '../domain/model'
import { addLocalDays, formatDate, keyFor } from '../domain/time'
import { StudyBars } from '../components/StudyBars'

const chartColor = '#7064f4'
const grid = 'var(--line)'
const axis = 'var(--muted)'
export function Performance() {
  const { data, profile } = useWorkspace()
  const { edit, remove } = useActions()
  const [selected, setSelected] = useState('')
  const [target, setTarget] = useState<number | null>(null)
  const module = data.modules.find((m) => m.id === selected) ?? data.modules[0]
  const records = data.assessments
    .filter((a) => !selected || a.moduleId === selected)
    .sort((a, b) => b.date - a.date)
  const marks = data.assessments.filter((a) => a.moduleId === module?.id).sort((a, b) => a.date - b.date)
  const current = grades(marks)
  const effectiveTarget = target ?? module?.target ?? 75
  const needed = requiredMark(marks, effectiveTarget)
  const history = marks.map((a, i) => ({
    date: formatDate(a.date, profile.timezone, 'd MMM'),
    score: Number(((a.obtained / a.maximum) * 100).toFixed(1)),
    average: grades(marks.slice(0, i + 1)).average,
  }))
  const modules = data.modules
    .map((m) => ({ module: m, ...grades(data.assessments.filter((a) => a.moduleId === m.id)) }))
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1))
  const strongest = modules.find((m) => m.average !== null && m.weight <= 100)
  const attention = [...modules]
    .reverse()
    .find((m) => m.average !== null && m.weight <= 100 && m.average < m.module.target)
  return (
    <>
      <Heading
        kicker="ACADEMICS"
        title="My Academic Performance"
        description="Record marks, understand your weighted average and plan for your target."
        action={
          <Button onClick={() => edit({ kind: 'assessments' })}>
            <Plus size={17} />
            Record mark
          </Button>
        }
      />
      <div className="two-grid">
        <Card>
          <CardTitle
            title="Module results"
            subtitle="Assessed averages use only recorded weighted marks."
          />
          {!modules.length ? (
            <Empty
              title="Add a module first"
              detail="Create a module so you can record marks against it."
              action="Add module"
              onAction={() => edit({ kind: 'modules' })}
            />
          ) : (
            <div className="simple-list">
              {modules.map((m) => (
                <button
                  key={m.module.id}
                  onClick={() => {
                    setSelected(m.module.id)
                    setTarget(null)
                  }}
                >
                  <ModuleDot color={m.module.color} />
                  <span>
                    <strong>{m.module.code}</strong>
                    <small>
                      {m.weight}% recorded · {m.module.target}% target
                      {m.weight > 100 ? ' · Weight exceeds 100%' : ''}
                    </small>
                  </span>
                  <strong>
                    {m.average === null || m.weight > 100 ? '—' : m.average.toFixed(1) + '%'}
                  </strong>
                </button>
              ))}
            </div>
          )}
          {strongest && (
            <p className="small muted">
              Highest assessed average · {strongest.module.code}
              {attention ? ' · Below target · ' + attention.module.code : ''}
            </p>
          )}
        </Card>
        <Card>
          <CardTitle
            title="Target mark calculator"
            subtitle="Assumes all remaining weight is assessed at the same mark."
          />
          {module ? (
            <>
              <div className="field-grid">
                <Field label="Module">
                  <select
                    value={module.id}
                    onChange={(e) => {
                      setSelected(e.target.value)
                      setTarget(null)
                    }}
                  >
                    {data.modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Target grade (%)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={Number.isFinite(effectiveTarget) ? effectiveTarget : ''}
                    onChange={(e) => setTarget(e.target.valueAsNumber)}
                  />
                </Field>
              </div>
              {current.weight > 100 ? (
                <ErrorText message="Recorded weights exceed 100%. Adjust your assessments to calculate a valid result." />
              ) : (
                <div className="module-stats">
                  <div>
                    <small>Assessed average</small>
                    <strong>{current.average === null ? '—' : current.average.toFixed(1) + '%'}</strong>
                  </div>
                  <div>
                    <small>Recorded weight</small>
                    <strong>{current.weight}%</strong>
                  </div>
                  <div>
                    <small>{current.weight === 100 ? 'Final result' : 'Weighted points earned'}</small>
                    <strong>{current.weight ? current.contribution.toFixed(1) : '—'}</strong>
                  </div>
                </div>
              )}
              {effectiveTarget >= 0 && effectiveTarget <= 100 && needed !== null ? (
                <div className="calculator-result">
                  <Target size={22} />
                  <div>
                    <strong>
                      {needed <= 0
                        ? 'Target already secured'
                        : needed > 100
                          ? 'Target above available marks'
                          : needed.toFixed(1) + '% needed on remaining work'}
                    </strong>
                    <small>
                      {Math.round((100 - current.weight) * 100) / 100}% of the module grade remains.
                      {needed > 100
                        ? ' Reaching this target would require ' + needed.toFixed(1) + '%.'
                        : ''}
                    </small>
                  </div>
                </div>
              ) : (
                <p className="muted small">
                  {!Number.isFinite(effectiveTarget) || effectiveTarget < 0 || effectiveTarget > 100
                    ? 'Enter a target from 0 to 100%.'
                    : current.weight === 100
                      ? 'The full module weight has been recorded.'
                      : 'A valid, partially recorded module is needed for a projection.'}
                </p>
              )}
            </>
          ) : (
            <p className="muted">Create a module and record an assessment to start.</p>
          )}
        </Card>
      </div>
      <Card className="spaced">
        <CardTitle
          title="Academic progress over time"
          subtitle={
            module
              ? module.code + ' · assessed average after each recorded assessment'
              : 'Record marks to see progress'
          }
        />
        {history.length ? (
          <div
            className="rechart"
            role="img"
            aria-label="Assessment marks and assessed average over time"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="date" stroke={axis} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => v + '%'} stroke={axis} />
                <Tooltip />
                <Line
                  name="Assessment mark (%)"
                  type="monotone"
                  dataKey="score"
                  stroke="#0891b2"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  name="Assessed average (%)"
                  type="monotone"
                  dataKey="average"
                  stroke={chartColor}
                  strokeWidth={3}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty
            title="No assessment history"
            detail="Record a mark to start tracking your academic progress."
          />
        )}
      </Card>
      <Card className="spaced">
        <CardTitle
          title="Assessment results"
          action={
            <select
              aria-label="Filter results by module"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value)
                setTarget(null)
              }}
            >
              <option value="">All modules</option>
              {data.modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code}
                </option>
              ))}
            </select>
          }
        />
        {records.length ? (
          <div className="record-list">
            {records.map((a) => (
              <div className="session-row" key={a.id}>
                <div>
                  <strong>{a.title}</strong>
                  <small>
                    {moduleName(data.modules, a.moduleId)} · {a.assessmentType} ·{' '}
                    {formatDate(a.date, profile.timezone, 'd MMM yyyy')}
                  </small>
                </div>
                <div>
                  <strong>
                    {a.obtained}/{a.maximum}
                  </strong>
                  <small>{a.weight}% weight</small>
                </div>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    aria-label={'Edit ' + a.title}
                    onClick={() => edit({ kind: 'assessments', item: a })}
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    className="icon-button destructive"
                    aria-label={'Delete ' + a.title}
                    onClick={() => remove('assessments', a)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="No assessments in this view" detail="Record your results to see them here." />
        )}
      </Card>
    </>
  )
}
export function Insights() {
  const { data, profile, now } = useWorkspace()
  const zone = profile.timezone
  const week = sessionsThisWeek(data.studySessions, now, zone)
  const minutes = studyMinutes(week)
  const finished = data.assignments.filter((a) => isFinished(a.status))
  const focus = data.studySessions.filter((s) => s.completedAt && s.source === 'focus')
  const activeDays = new Set(week.map((s) => keyFor(s.completedAt, zone))).size
  const stats = [
    [Clock3, 'Weekly study', (minutes / 60).toFixed(1) + 'h', 'Completed study time'],
    [
      CheckCircle2,
      'Completed assignments',
      finished.length,
      data.assignments.length
        ? Math.round((finished.length / data.assignments.length) * 100) + '% completion rate'
        : 'No assignments recorded',
    ],
    [
      Flame,
      'Study streak',
      studyStreak(data.studySessions, now, zone) + ' days',
      activeDays + ' active days this week',
    ],
    [
      Target,
      'Average focus',
      focus.length ? Math.round(studyMinutes(focus) / focus.length) + ' min' : '—',
      focus.length + ' focus sessions',
    ],
  ] as const
  const chart = Array.from({ length: 30 }, (_, i) => {
    const date = addLocalDays(now, i - 29, zone),
      key = keyFor(date, zone)
    return {
      day: formatDate(date, zone, 'd MMM'),
      minutes: studyMinutes(
        data.studySessions.filter((s) => s.completedAt && keyFor(s.completedAt, zone) === key),
      ),
      tasks: finished.filter((a) => a.finishedAt && keyFor(a.finishedAt, zone) === key).length,
    }
  })
  const modules = [...new Set(week.map((s) => s.moduleId))]
    .map((id) => ({
      module: moduleName(data.modules, id),
      minutes: studyMinutes(week.filter((s) => s.moduleId === id)),
    }))
    .sort((a, b) => b.minutes - a.minutes)
  return (
    <>
      <Heading
        kicker="ACADEMICS"
        title="Study Insights"
        description="Understand where your time goes and which study habits are taking hold."
      />
      <div className="stat-grid four">
        {stats.map(([Icon, label, value, detail], i) => (
          <Card key={label} className="stat">
            <span className={'stat-icon ' + ['purple', 'green', 'orange', 'cyan'][i]}>
              <Icon size={18} />
            </span>
            <div className="stat-label">{label}</div>
            <strong>{value}</strong>
            <small>{detail}</small>
          </Card>
        ))}
      </div>
      <div className="two-grid">
        <Card>
          <CardTitle
            title="Weekly study activity"
            subtitle="Completed study minutes · Monday to Sunday"
          />
          <StudyBars data={weeklyChart(data.studySessions, now, zone)} />
        </Card>
        <Card>
          <CardTitle title="Study time by module" subtitle="Completed minutes this week" />
          {modules.length ? (
            <div className="rechart" role="img" aria-label="Study minutes by module">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modules}>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="module" stroke={axis} />
                  <YAxis stroke={axis} />
                  <Tooltip />
                  <Bar
                    name="Study minutes"
                    dataKey="minutes"
                    fill={chartColor}
                    radius={[5, 5, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty title="No study logged this week" detail="Complete a session to see its time here." />
          )}
        </Card>
        <Card>
          <CardTitle
            title="Monthly productivity"
            subtitle="Completed study minutes in the past 30 days"
          />
          <div className="rechart" role="img" aria-label="Daily study minutes, last thirty days">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="day" interval={5} stroke={axis} />
                <YAxis stroke={axis} />
                <Tooltip />
                <Area
                  name="Study minutes"
                  dataKey="minutes"
                  type="monotone"
                  stroke={chartColor}
                  fill="#a99bff"
                  fillOpacity={0.35}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle
            title="Assignment completion trend"
            subtitle="Completed or submitted per day in the past 30 days"
          />
          <div className="rechart" role="img" aria-label="Assignment completions, last thirty days">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="day" interval={5} stroke={axis} />
                <YAxis allowDecimals={false} stroke={axis} />
                <Tooltip />
                <Line
                  name="Assignments"
                  dataKey="tasks"
                  stroke={chartColor}
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle
            title="Exam preparation"
            subtitle="Revision topics and study goals for upcoming exams"
          />
          {data.exams.filter((e) => e.start > now).length ? (
            data.exams
              .filter((e) => e.start > now)
              .sort((a, b) => a.start - b.start)
              .map((e) => {
                const value = preparation(e, data.studySessions)
                return (
                  <div className="goal-mini" key={e.id}>
                    <div>
                      <Award size={16} />
                      <strong>{e.title}</strong>
                      <small>{value}%</small>
                    </div>
                    <Progress value={value} label={e.title} />
                  </div>
                )
              })
          ) : (
            <p className="muted">No upcoming exams to prepare for.</p>
          )}
        </Card>
        <Card>
          <CardTitle title="How your streak works" />
          <p className="muted">
            A day counts when you complete a study session in {zone}. Consecutive days build your streak.
            Yesterday’s streak stays active until the end of today.
          </p>
        </Card>
      </div>
    </>
  )
}
