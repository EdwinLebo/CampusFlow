import { CalendarDays, Clock3, Edit3, GraduationCap, MapPin, Plus, Trash2 } from 'lucide-react'
import { useActions } from '../app/Actions'
import { useWorkspace } from '../app/Workspace'
import { Button, Card, CardTitle, Empty, Heading, Pill, Progress } from '../components/ui'
import { useRecordLink } from '../components/useRecordLink'
import { moduleName } from '../domain/model'
import { preparation } from '../domain/metrics'
import { countdown, formatDate } from '../domain/time'

export function Exams() {
  const { data, profile, now } = useWorkspace()
  const { edit, apply, remove } = useActions()
  useRecordLink('exams')
  const upcoming = data.exams.filter((e) => e.start >= now).sort((a, b) => a.start - b.start)
  const past = data.exams.filter((e) => e.start < now).sort((a, b) => b.start - a.start)
  return (
    <>
      <Heading
        kicker="WORKSPACE"
        title="Exam Countdown"
        description="See what’s ahead and turn revision into manageable steps."
        action={
          <Button onClick={() => edit({ kind: 'exams' })}>
            <Plus size={17} />
            Add exam
          </Button>
        }
      />
      {!data.exams.length ? (
        <Card>
          <Empty
            title="No exams scheduled"
            detail="Add your first exam and start a revision checklist."
            action="Add exam"
            onAction={() => edit({ kind: 'exams' })}
          />
        </Card>
      ) : (
        <>
          {!upcoming.length && (
            <Card>
              <Empty
                title="No upcoming exams"
                detail="Your past exams are below."
                action="Add exam"
                onAction={() => edit({ kind: 'exams' })}
              />
            </Card>
          )}
          <div className="collection-grid">
            {[...upcoming, ...past].map((e) => {
              const module = data.modules.find((m) => m.id === e.moduleId)
              const remaining = countdown(e.start, now)
              const progress = preparation(e, data.studySessions)
              const planned = data.studySessions.filter(
                (s) => s.examId === e.id && !s.completedAt && s.start >= now && s.start < e.start,
              ).length
              return (
                <Card key={e.id} className="exam-card">
                  <div className="module-top">
                    <span className="stat-icon purple">
                      <GraduationCap size={21} />
                    </span>
                    <Pill tone={e.start < now ? 'neutral' : 'purple'}>
                      {e.start < now ? 'Past exam' : moduleName(data.modules, e.moduleId)}
                    </Pill>
                  </div>
                  <CardTitle
                    title={e.title}
                    subtitle={module?.name ?? 'Removed module'}
                    action={
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={'Edit ' + e.title}
                          onClick={() => edit({ kind: 'exams', item: e })}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="icon-button destructive"
                          aria-label={'Delete ' + e.title}
                          onClick={() => remove('exams', e)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    }
                  />
                  <div className="exam-meta">
                    <span>
                      <CalendarDays size={15} />
                      {formatDate(e.start, profile.timezone)}
                    </span>
                    <span>
                      <MapPin size={15} />
                      {e.venue || 'Venue not set'}
                    </span>
                    <span>
                      <Clock3 size={15} />
                      {planned} revision sessions scheduled · {e.target}% target
                    </span>
                  </div>
                  {e.start >= now && (
                    <div className="exam-tiles">
                      {[
                        ['Days', remaining.days],
                        ['Hours', remaining.hours],
                        ['Mins', remaining.minutes],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <strong>{value}</strong>
                          <small>{label}</small>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="progress-label">
                    <span>Preparation</span>
                    <strong>{progress}%</strong>
                  </div>
                  <Progress label={'Preparation for ' + e.title} value={progress} />
                  <p className="small muted">
                    Average of completed revision topics and linked study minutes against your goal,
                    where set.
                  </p>
                  <div className="exam-topics">
                    {e.topics.map((t) => (
                      <label className="check" key={t.id}>
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={(ev) =>
                            void apply([
                              {
                                kind: 'exams',
                                item: {
                                  ...e,
                                  topics: e.topics.map((item) =>
                                    item.id === t.id ? { ...item, done: ev.target.checked } : item,
                                  ),
                                },
                              },
                            ])
                          }
                        />
                        {t.text}
                      </label>
                    ))}
                  </div>
                  {e.start >= now && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        edit({
                          kind: 'studySessions',
                          preset: {
                            moduleId: e.moduleId,
                            examId: e.id,
                            title: ('Revise ' + e.title).slice(0, 100),
                          },
                        })
                      }
                    >
                      <Plus size={16} />
                      Schedule revision
                    </Button>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
