import { StudyBars } from '../components/StudyBars'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Flame,
  GraduationCap,
  Plus,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { useWorkspace } from '../app/Workspace'
import { useActions } from '../app/Actions'
import { isFinished, moduleName } from '../domain/model'
import { countdown, deadlineLabel, formatDate, keyFor } from '../domain/time'
import {
  goalProgress,
  sessionsThisWeek,
  studyMinutes,
  studyStreak,
  weeklyChart,
} from '../domain/metrics'
import { calendarEvents } from '../domain/calendar'
import { Button, Card, CardTitle, Empty, ModuleDot, Pill, Progress, SectionLink } from '../components/ui'

export function Dashboard() {
  const { profile, data, now } = useWorkspace()
  const { edit, apply } = useActions()
  const root = useOutletContext<string>()
  const zone = profile.timezone
  const hour = Number(formatDate(now, zone, 'HH'))
  const next = data.exams.filter((e) => e.start > now).sort((a, b) => a.start - b.start)[0]
  const clock = next ? countdown(next.start, now) : null
  const open = data.assignments.filter((a) => !isFinished(a.status)).sort((a, b) => a.due - b.due)
  const complete = data.assignments.filter((a) => isFinished(a.status)).length
  const today = keyFor(now, zone)
  const schedule = calendarEvents(data).filter(
    (e) => keyFor(e.start, zone) === today && e.kind !== 'assignments',
  )
  const week = studyMinutes(sessionsThisWeek(data.studySessions, now, zone))
  const streak = studyStreak(data.studySessions, now, zone)
  const todayStudy = data.studySessions.filter((s) => keyFor(s.start, zone) === today).length
  const priority = open.filter((a) => a.priority === 'High')
  const stats = [
    ['Study today', todayStudy, 'sessions scheduled', CalendarDays, 'purple'],
    ['Open assignments', open.length, 'across your modules', ClipboardList, 'orange'],
    [
      'Next exam',
      clock ? clock.days + 'd ' + clock.hours + 'h' : '—',
      next ? moduleName(data.modules, next.moduleId) : 'No exam scheduled',
      GraduationCap,
      'cyan',
    ],
    ['Weekly study', (week / 60).toFixed(1) + 'h', 'logged this week', Clock3, 'green'],
    ['Completed tasks', complete, 'completed or submitted', CheckCircle2, 'blue'],
    ['Study streak', streak + 'd', 'consecutive study days', Flame, 'pink'],
  ] as const
  const first = profile.firstName || 'student'
  return (
    <div className="dashboard">
      <section className="welcome">
        <div className="welcome-copy">
          <div className="welcome-date">
            <CalendarDays size={14} />
            {formatDate(now, zone, 'EEEE, d MMMM yyyy')}
          </div>
          <h1>
            Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, {first}
          </h1>
          <p>Here’s what your academic day looks like.</p>
          <Link to={root + '/planner'} className="welcome-link">
            Open Study Planner
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <span className="art-orbit orbit-a" />
          <span className="art-orbit orbit-b" />
          <span className="art-orbit orbit-c" />
          <div className="hero-graphic">
            <CalendarDays size={73} strokeWidth={1.25} />
          </div>
          <div className="hero-chip chip-a">
            <CheckCircle2 size={23} />
          </div>
          <div className="hero-chip chip-b">
            <Sparkles size={24} />
          </div>
          <i className="hero-star one">+</i>
          <i className="hero-star two">+</i>
          <i className="hero-star three">+</i>
        </div>
      </section>
      <div className="stat-grid">
        {stats.map(([label, value, detail, Icon, tone]) => (
          <Card className="stat" key={label}>
            <div className={'stat-icon ' + tone}>
              <Icon size={17} />
            </div>
            <div className="stat-label">{label}</div>
            <strong>{value}</strong>
            <small>{detail}</small>
          </Card>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="stack">
          <Card>
            <CardTitle
              title="Today’s schedule"
              subtitle={formatDate(now, zone, 'EEEE, d MMMM')}
              action={<SectionLink to={root + '/calendar'}>Calendar</SectionLink>}
            />
            {!schedule.length ? (
              <Empty
                title="A clear schedule"
                detail="Add a class, personal event or study session to plan your day."
                action="Schedule study"
                onAction={() => edit({ kind: 'studySessions' })}
              />
            ) : (
              <div className="schedule">
                {schedule.slice(0, 5).map((event) => {
                  const module = data.modules.find((m) => m.id === event.moduleId)
                  const item = data[event.kind].find((m) => m.id === event.id)
                  return (
                    <button
                      className="schedule-row"
                      key={event.id}
                      onClick={() => edit({ kind: event.kind, item })}
                    >
                      <time>{formatDate(event.start, zone, 'HH:mm')}</time>
                      <i style={{ background: module?.color ?? 'var(--primary)' }} />
                      <div>
                        <strong>{event.title}</strong>
                        <small>
                          {module?.code ?? 'General'} · {event.minutes} min
                        </small>
                      </div>
                      <Pill>{event.type}</Pill>
                      <ChevronRight size={15} />
                    </button>
                  )
                })}
              </div>
            )}
          </Card>
          <Card>
            <CardTitle
              title="Upcoming deadlines"
              subtitle="Assignments that need your attention"
              action={<SectionLink to={root + '/assignments'}>View all</SectionLink>}
            />
            {!open.length ? (
              <Empty
                title="Nothing due right now"
                detail="Enjoy the breathing room."
                action="Add assignment"
                onAction={() => edit({ kind: 'assignments' })}
              />
            ) : (
              <div className="deadline-list">
                {open.slice(0, 4).map((a) => (
                  <div className="deadline-row" key={a.id}>
                    <button
                      className="task-toggle"
                      aria-label={'Mark ' + a.title + ' complete'}
                      onClick={() =>
                        void apply(
                          [
                            {
                              kind: 'assignments',
                              item: { ...a, status: 'Completed', finishedAt: Date.now() },
                            },
                          ],
                          'Assignment completed',
                        )
                      }
                    />
                    <button
                      className="deadline-title"
                      onClick={() => edit({ kind: 'assignments', item: a })}
                    >
                      <strong>{a.title}</strong>
                      <small>
                        <ModuleDot color={data.modules.find((m) => m.id === a.moduleId)?.color} />
                        {moduleName(data.modules, a.moduleId)}
                      </small>
                    </button>
                    <Pill tone={a.due < now ? 'red' : a.priority === 'High' ? 'amber' : 'neutral'}>
                      {deadlineLabel(a.due, now, zone)}
                    </Pill>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <CardTitle title="Priority tasks" subtitle="Open assignments marked high priority" />
            {!priority.length ? (
              <p className="muted">You have no high-priority assignments.</p>
            ) : (
              <div className="simple-list">
                {priority.slice(0, 4).map((a) => (
                  <button key={a.id} onClick={() => edit({ kind: 'assignments', item: a })}>
                    <ClipboardList size={16} />
                    <span>{a.title}</span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="stack">
          <Card>
            <CardTitle
              title="Study activity"
              subtitle="Completed minutes this week"
              action={<SectionLink to={root + '/insights'}>Insights</SectionLink>}
            />
            <StudyBars data={weeklyChart(data.studySessions, now, zone)} />
            <div className="chart-legend">
              <ModuleDot /> Study minutes{' '}
              <strong>
                {Math.floor(week / 60)}h {week % 60}m total
              </strong>
            </div>
          </Card>
          <Card className="exam-highlight">
            <CardTitle
              title="Next exam"
              subtitle="Keep your revision on track"
              action={
                <span className="stat-icon purple">
                  <CalendarClock size={18} />
                </span>
              }
            />
            {next && clock ? (
              <>
                <p className="exam-name">{next.title}</p>
                <div className="exam-tiles">
                  <div>
                    <strong>{clock.days}</strong>
                    <small>Days</small>
                  </div>
                  <div>
                    <strong>{clock.hours}</strong>
                    <small>Hours</small>
                  </div>
                  <div>
                    <strong>{clock.minutes}</strong>
                    <small>Mins</small>
                  </div>
                </div>
                <SectionLink to={root + '/exams'}>View exam prep</SectionLink>
              </>
            ) : (
              <Empty
                title="No upcoming exams"
                detail="Add an exam to start the countdown."
                action="Add exam"
                onAction={() => edit({ kind: 'exams' })}
              />
            )}
          </Card>
          <Card className="focus-shortcut">
            <div className="stat-icon purple">
              <Timer size={22} />
            </div>
            <div>
              <h2>Focus Zone</h2>
              <p>Make time for one thing.</p>
            </div>
            <Link className="icon-button" to={root + '/focus'} aria-label="Open Focus Zone">
              <ArrowUpRight size={19} />
            </Link>
          </Card>
          <Card>
            <CardTitle
              title="Academic goals"
              action={<SectionLink to={root + '/goals'}>Goals</SectionLink>}
            />
            {data.goals.length ? (
              data.goals.slice(0, 3).map((goal) => {
                const value = goalProgress(goal, data, now, zone)
                return (
                  <div key={goal.id} className="goal-mini">
                    <div>
                      <Target size={16} />
                      <strong>{goal.title}</strong>
                      <small>
                        {Math.round(value * 10) / 10} / {goal.target}
                      </small>
                    </div>
                    <Progress value={(value / goal.target) * 100} label={goal.title} />
                  </div>
                )
              })
            ) : (
              <Empty
                title="Set a goal"
                detail="Track an academic habit or target."
                action="Add goal"
                onAction={() => edit({ kind: 'goals' })}
              />
            )}
          </Card>
        </div>
      </div>
      <div className="toolbar dashboard-quick">
        <Button variant="outline" onClick={() => edit({ kind: 'assignments' })}>
          <Plus size={16} />
          New assignment
        </Button>
        <Button variant="outline" onClick={() => edit({ kind: 'exams' })}>
          <GraduationCap size={17} />
          Add exam
        </Button>
        <Button variant="outline" onClick={() => edit({ kind: 'studySessions' })}>
          <CalendarDays size={17} />
          Schedule study session
        </Button>
        <Link className="button outline" to={root + '/focus'}>
          <Timer size={17} />
          Start focus session
        </Link>
        <Button variant="outline" onClick={() => edit({ kind: 'modules' })}>
          <BookOpen size={17} />
          Add module
        </Button>
      </div>
    </div>
  )
}
