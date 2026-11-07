import { NoteText } from '../components/NoteText'
import { useState } from 'react'
import { Award, CheckCircle2, Edit3, Pin, Plus, Trash2 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useActions } from '../app/Actions'
import { useWorkspace } from '../app/Workspace'
import { Button, Card, CardTitle, Empty, Heading, Pill, Progress, SearchInput } from '../components/ui'
import { useRecordLink } from '../components/useRecordLink'
import { moduleName } from '../domain/model'
import { achievements, goalProgress } from '../domain/metrics'

export function Notes() {
  const { data } = useWorkspace()
  const { apply, edit, remove } = useActions()
  useRecordLink('notes')
  const [search, setSearch] = useState('')
  const [module, setModule] = useState('')
  const notes = data.notes
    .filter(
      (n) =>
        (!module || n.moduleId === module) &&
        (n.title + ' ' + n.content + ' ' + n.tags.join(' '))
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt)
  return (
    <>
      <Heading
        kicker="PRODUCTIVITY"
        title="Notes"
        description="Keep your lecture notes, ideas and revision material close."
        action={
          <Button onClick={() => edit({ kind: 'notes' })}>
            <Plus size={17} />
            New note
          </Button>
        }
      />
      <div className="toolbar filters">
        <SearchInput value={search} onChange={setSearch} label="Search notes" />
        <select
          aria-label="Filter notes by module"
          value={module}
          onChange={(e) => setModule(e.target.value)}
        >
          <option value="">All modules</option>
          {data.modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code}
            </option>
          ))}
        </select>
      </div>
      {!notes.length ? (
        <Card>
          <Empty
            title={data.notes.length ? 'No matching notes' : 'Start a note'}
            detail="Write down an idea or save something to revise later."
            action="New note"
            onAction={() => edit({ kind: 'notes' })}
          />
        </Card>
      ) : (
        <div className="collection-grid">
          {notes.map((n) => (
            <Card key={n.id} className="note-card">
              <div className="module-top">
                <Pill tone="purple">{moduleName(data.modules, n.moduleId)}</Pill>
                {n.pinned && (
                  <Pill>
                    <Pin size={13} />
                    Pinned
                  </Pill>
                )}
              </div>
              <CardTitle title={n.title} />
              <NoteText content={n.content} />
              <div className="toolbar">
                {n.tags.map((tag, i) => (
                  <Pill key={tag + i}>{tag}</Pill>
                ))}
              </div>
              <div className="row-actions spaced">
                <button
                  className="icon-button"
                  aria-label={'Edit ' + n.title}
                  onClick={() => edit({ kind: 'notes', item: n })}
                >
                  <Edit3 size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={(n.pinned ? 'Unpin ' : 'Pin ') + n.title}
                  onClick={() =>
                    void apply(
                      [{ kind: 'notes', item: { ...n, pinned: !n.pinned } }],
                      n.pinned ? 'Note unpinned' : 'Note pinned',
                    )
                  }
                >
                  <Pin size={16} />
                </button>
                <button
                  className="icon-button destructive"
                  aria-label={'Delete ' + n.title}
                  onClick={() => remove('notes', n)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
export function Goals() {
  const { profile, data, now } = useWorkspace()
  const { edit, remove } = useActions()
  const reduced = useReducedMotion()
  const earned = profile.achievements ? achievements(data, now, profile.timezone) : []
  return (
    <>
      <Heading
        kicker="PRODUCTIVITY"
        title="Academic Goals"
        description="Choose what to work toward and see how far you’ve come."
        action={
          <Button onClick={() => edit({ kind: 'goals' })}>
            <Plus size={17} />
            New goal
          </Button>
        }
      />
      {!data.goals.length ? (
        <Card>
          <Empty
            title="Set your first goal"
            detail="Choose an automatic study measure or enter progress as you go."
            action="New goal"
            onAction={() => edit({ kind: 'goals' })}
          />
        </Card>
      ) : (
        <div className="collection-grid">
          {data.goals.map((g) => {
            const value = goalProgress(g, data, now, profile.timezone)
            const complete = value >= g.target
            return (
              <Card key={g.id}>
                <div className="module-top">
                  <Pill tone={complete ? 'green' : 'purple'}>{complete ? 'Goal reached' : g.mode}</Pill>
                  {complete && (
                    <motion.span
                      initial={reduced ? false : { scale: 0.7, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <CheckCircle2 className="text-success" size={24} />
                    </motion.span>
                  )}
                </div>
                <CardTitle
                  title={g.title}
                  subtitle={g.moduleId ? moduleName(data.modules, g.moduleId) : undefined}
                />
                <div className="progress-label">
                  <span>Progress</span>
                  <strong>
                    {Math.round(value * 10) / 10} / {g.target}
                  </strong>
                </div>
                <Progress value={(value / g.target) * 100} label={g.title} />
                <div className="row-actions spaced">
                  <button
                    className="icon-button"
                    aria-label={'Edit ' + g.title}
                    onClick={() => edit({ kind: 'goals', item: g })}
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    className="icon-button destructive"
                    aria-label={'Delete ' + g.title}
                    onClick={() => remove('goals', g)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      {earned.length > 0 && (
        <Card className="spaced">
          <CardTitle
            title="Achievements"
            subtitle="Based on your recorded study and assignment activity."
          />
          <div className="achievement-grid">
            {earned.map((a) => (
              <div key={a.name} className={a.earned ? 'earned' : ''}>
                <Award size={22} />
                <strong>{a.name}</strong>
                <small>{a.detail}</small>
                <Pill tone={a.earned ? 'green' : 'neutral'}>{a.earned ? 'Earned' : 'In progress'}</Pill>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
