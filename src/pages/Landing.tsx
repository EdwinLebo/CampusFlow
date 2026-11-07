import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  NotebookPen,
  Play,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import { portfolioBuild } from '../app/hosting'
import { Brand } from '../components/ui'
import { StudyBars } from '../components/StudyBars'

const features = [
  [
    ClipboardList,
    'Every deadline in view',
    'Track assignments from brief to submission with priorities, checklists and reminders.',
  ],
  [
    CalendarDays,
    'A calendar for real life',
    'See classes, study sessions, assignments and exams on one calendar.',
  ],
  [
    Sparkles,
    'Study plans that fit',
    'Turn upcoming assessments and your availability into a study plan you can review and edit.',
  ],
  [
    Timer,
    'Space to focus',
    'Use a Pomodoro timer, give each session an objective and see the time you put in.',
  ],
  [
    TrendingUp,
    'Marks with context',
    'See your assessed average, compare it with your target and work out what mark you need next.',
  ],
  [
    NotebookPen,
    'Revision within reach',
    'Keep notes, exam topics and study goals with the modules they belong to.',
  ],
] as const
const faq = [
  [
    'Do I need an account to try CampusFlow?',
    'The interactive demo opens without an account. It uses sample records, and changes stay in the browser you use to explore it.',
  ],
  [
    'Can I use it at a university other than TUT?',
    'Yes. Enter your own institution, choose a semester or term calendar and set the time zone you use.',
  ],
  [
    'How does the Study Planner work?',
    'It ranks upcoming assessments by urgency, importance and module difficulty. It then fits sessions around your availability and saved events. You can review and edit the plan before saving.',
  ],
  [
    'How do reminders work?',
    'CampusFlow shows reminders while the app is open. Browser notifications require support and permission. Scheduled delivery while the app is closed requires a separately configured Firebase deployment.',
  ],
  [
    'Can I take my data with me?',
    'Export your workspace as JSON in Settings or download calendar events as an .ics file. The Study Planner also has a print layout for saving a PDF.',
  ],
]
function Preview() {
  const chart = [40, 75, 50, 115, 65, 95, 18].map((minutes, i) => ({
    name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    minutes,
  }))
  return (
    <div className="product-preview" aria-label="Illustrative CampusFlow dashboard with sample data">
      <div className="preview-chrome">
        <span>
          <i />
          <i />
          <i />
        </span>
        <span>campusflow / overview</span>
        <span className="preview-tag">SAMPLE WORKSPACE</span>
      </div>
      <div className="preview-body">
        <aside>
          <div className="mini-brand">
            <span>
              <Sparkles size={14} />
            </span>
            CampusFlow
          </div>
          {[
            [LayoutDashboard, 'Overview'],
            [CalendarDays, 'Calendar'],
            [ClipboardList, 'Assignments'],
            [BookOpen, 'Modules'],
            [GraduationCap, 'Exams'],
            [Timer, 'Focus Zone'],
          ].map(([Icon, text], i) => {
            const Glyph = Icon as typeof CalendarDays
            return (
              <div key={i} className={i === 0 ? 'mini-active' : ''}>
                <Glyph size={14} />
                {String(text)}
              </div>
            )
          })}
        </aside>
        <div className="preview-content">
          <div className="preview-welcome">
            <small>YOUR STUDY WORKSPACE</small>
            <h3>Good morning, Alex</h3>
            <p>Here’s what your academic day looks like.</p>
            <div>
              <CalendarDays size={44} />
            </div>
          </div>
          <div className="preview-stats">
            <div>
              <CalendarDays size={16} />
              <strong>2</strong>
              <small>Study today</small>
            </div>
            <div>
              <ClipboardList size={16} />
              <strong>5</strong>
              <small>Open assignments</small>
            </div>
            <div>
              <Timer size={16} />
              <strong>6.4h</strong>
              <small>Weekly study</small>
            </div>
          </div>
          <div className="preview-widgets">
            <div>
              <h4>Today’s schedule</h4>
              <div className="preview-event">
                <i />
                Web Development lecture<small>09:00</small>
              </div>
              <div className="preview-event">
                <i />
                UX design studio<small>11:00</small>
              </div>
              <div className="preview-event">
                <i />
                Database revision<small>14:00</small>
              </div>
            </div>
            <div>
              <h4>Study activity</h4>
              <StudyBars data={chart} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export function Landing() {
  const reduced = useReducedMotion()
  return (
    <div className="landing">
      <header className="public-nav">
        <div className="public-wrap">
          <Brand />
          <nav aria-label="Landing navigation">
            <Link to="/#features">Features</Link>
            <Link to="/#how">How it works</Link>
            <Link to="/#faq">FAQ</Link>
          </nav>
          <div>
            {portfolioBuild ? (
              <Link className="button primary" to="/demo">
                Open demo <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link className="button plain public-login" to="/login">
                  Sign in
                </Link>
                <Link className="button primary" to="/register">
                  Get started
                  <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main>
        <section className="public-hero">
          <div className="public-wrap hero-layout">
            <motion.div
              className="hero-copy"
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="public-badge">
                <Sparkles size={14} /> BUILT FOR UNIVERSITY LIFE
              </div>
              <h1>
                Less Stress.
                <br />
                <span>More Progress.</span>
              </h1>
              <p>
                Organize your university life with smart study planning, assignment tracking, exam
                preparation, and academic insights — all in one place.
              </p>
              <div className="public-actions">
                {!portfolioBuild && (
                  <Link className="button primary" to="/register">
                    Get Started — It’s Free
                    <ArrowRight size={17} />
                  </Link>
                )}
                <Link className={portfolioBuild ? 'button primary' : 'button outline'} to="/demo">
                  <Play size={16} />
                  Try Interactive Demo
                </Link>
              </div>
              {portfolioBuild && (
                <p className="small" style={{ marginTop: 12 }}>
                  Portfolio demo with sample data. Student accounts are planned for the Firebase release.
                </p>
              )}
              <Link className="explore-link" to="/#features">
                Explore Features
                <ArrowDown size={14} />
              </Link>
            </motion.div>
            <div className="hero-preview">
              <Preview />
              <Link className="preview-link" to="/demo">
                Explore the workspace
                <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </section>
        <div className="public-strip">
          <div className="public-wrap">
            <span>
              <GraduationCap size={19} /> Made for university students
            </span>
            <span>
              <CalendarDays size={19} /> Semester or term calendars
            </span>
            <span>
              <Target size={19} /> Study plans you control
            </span>
          </div>
        </div>
        <motion.section
          id="features"
          className="public-wrap public-section"
          initial={reduced ? false : { opacity: 0.8, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.06 }}
        >
          <div className="section-intro">
            <div className="eyebrow">YOUR ACADEMIC TOOLKIT</div>
            <h2>Make room for the work that matters.</h2>
            <p>Plan your week, see what’s due and understand how you’re doing across your modules.</p>
          </div>
          <div className="feature-grid">
            {features.map(([Icon, title, body], i) => (
              <article key={title}>
                <div className={'stat-icon ' + ['purple', 'cyan', 'pink', 'green', 'blue', 'orange'][i]}>
                  <Icon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </motion.section>
        <section className="public-band" id="how">
          <div className="public-wrap public-section">
            <div className="section-intro">
              <div className="eyebrow">HOW IT WORKS</div>
              <h2>From your course outline to your study plan.</h2>
            </div>
            <div className="steps-grid">
              {[
                ['Set up your semester', 'Add your institution, academic period and modules.'],
                ['Put dates on the calendar', 'Add assignments, exams and classes as you get them.'],
                [
                  'Plan a week you can follow',
                  'Review your study plan, adjust sessions and track what you finish.',
                ],
              ].map(([title, body], i) => (
                <article key={title}>
                  <span>0{i + 1}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="public-wrap public-section public-deep">
          <div>
            <div className="eyebrow">INSIDE THE WORKSPACE</div>
            <h2>Know what to do next.</h2>
            <p>
              Start the day with your schedule, priorities and nearest exam. See how your study time adds
              up as you complete sessions.
            </p>
            <Link className="button outline" to="/demo">
              Open the demo dashboard
              <ChevronRight size={16} />
            </Link>
          </div>
          <div className="deep-list">
            {[
              [Sparkles, 'Smart Study Planner', 'Preview, edit and lock study sessions before saving.'],
              [
                ClipboardList,
                'Assignments and exams',
                'Track due dates, submission status and revision topics.',
              ],
              [
                TrendingUp,
                'Academic progress',
                'See recorded weight, your assessed average and the mark your target requires.',
              ],
            ].map(([Icon, title, text]) => {
              const Glyph = Icon as typeof CalendarDays
              return (
                <article key={String(title)}>
                  <span className="stat-icon purple">
                    <Glyph size={20} />
                  </span>
                  <div>
                    <h3>{String(title)}</h3>
                    <p>{String(text)}</p>
                  </div>
                  <Check size={17} />
                </article>
              )
            })}
          </div>
        </section>
        <section id="faq" className="public-band">
          <div className="public-wrap public-section faq">
            <div className="section-intro">
              <div className="eyebrow">COMMON QUESTIONS</div>
              <h2>Before you get started</h2>
            </div>
            <div>
              {faq.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="public-wrap public-cta">
          <div>
            <div className="eyebrow">CAMPUSFLOW</div>
            <h2>Give your semester a plan.</h2>
            <p>Your academic life, organized.</p>
            <Link to="/demo" className="button outline">
              Try Interactive Demo
              <ArrowRight size={16} />
            </Link>
          </div>
          <Sparkles size={148} strokeWidth={0.75} aria-hidden="true" />
        </section>
      </main>
      <footer className="public-footer">
        <div className="public-wrap">
          <Brand />
          <span>Your Academic Life, Organized.</span>
          <div>
            <Link to="/demo">Demo</Link>
            {!portfolioBuild && <Link to="/login">Sign in</Link>}
            <Link to="/#faq">FAQ</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
