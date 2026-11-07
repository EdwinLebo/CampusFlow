import { portfolioBuild } from './hosting'
import { useOnline } from '../components/useOnline'
import { pushEnabled } from '../services/push'
import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Command,
  Crosshair,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Menu,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useWorkspace } from './Workspace'
import { useActions } from './Actions'
import { Brand, Button, Empty, Modal } from '../components/ui'
import { reminders, type Reminder } from '../domain/metrics'
import { useReminderDelivery } from '../components/useReminderDelivery'

const groups = [
  {
    label: 'WORKSPACE',
    items: [
      ['', 'Overview', LayoutDashboard],
      ['calendar', 'Calendar', CalendarDays],
      ['assignments', 'Assignments', ClipboardList],
      ['modules', 'Modules', BookOpen],
      ['exams', 'Exams', GraduationCap],
    ],
  },
  {
    label: 'PRODUCTIVITY',
    items: [
      ['planner', 'Study Planner', Sparkles],
      ['focus', 'Focus Zone', Timer],
      ['notes', 'Notes', NotebookPen],
      ['goals', 'Goals', Target],
    ],
  },
  {
    label: 'ACADEMICS',
    items: [
      ['performance', 'Performance', TrendingUp],
      ['insights', 'Study Insights', Crosshair],
    ],
  },
] as const
const mobile = [
  ['', 'Home', LayoutDashboard],
  ['calendar', 'Calendar', CalendarDays],
  ['assignments', 'Tasks', ClipboardList],
  ['focus', 'Focus', Timer],
  ['settings', 'Profile', UserRound],
] as const
const quick = [
  ['assignments', 'New assignment', ClipboardList],
  ['exams', 'Add exam', GraduationCap],
  ['studySessions', 'Schedule study', CalendarDays],
  ['modules', 'Add module', BookOpen],
] as const
export function Shell() {
  const { demo, profile, data, now, user, error, commit } = useWorkspace()
  const actions = useActions()
  const online = useOnline()
  const root = demo ? '/demo' : '/app'
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebar, setSidebar] = useState(() => localStorage.getItem('campusflow.sidebar') === 'compact')
  const [drawer, setDrawer] = useState(false)
  const [newMenu, setNewMenu] = useState(false)
  const [panel, setPanel] = useState<'search' | 'notifications' | null>(null)
  const [search, setSearch] = useState('')
  const all = useMemo(() => reminders(data, profile, now), [data, profile, now])
  const pending = all.filter((r) => !data.notifications.some((n) => n.id === r.id))
  const [remotePush, setRemotePush] = useState(() => Boolean(user && pushEnabled(user.uid)))
  useEffect(() => {
    const sync = () => setRemotePush(Boolean(user && pushEnabled(user.uid)))
    window.addEventListener('campusflow-push-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('campusflow-push-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [user])
  useReminderDelivery(
    all,
    demo ? 'demo' : (user?.uid ?? ''),
    profile.browserNotifications && !remotePush,
  )
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      const target = e.target
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === 'k' &&
        !(
          target instanceof HTMLElement &&
          (target.matches('input,textarea,select') || target.isContentEditable)
        )
      ) {
        e.preventDefault()
        setPanel('search')
        setSearch('')
      }
      if (e.key === 'Escape') {
        setDrawer(false)
        setNewMenu(false)
      }
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])
  useEffect(() => {
    setDrawer(false)
    setNewMenu(false)
    setPanel(null)
  }, [location.pathname, location.search])
  async function mark(items: Reminder[], route?: string) {
    try {
      if (items.length)
        await commit(
          items.map((item) => ({
            kind: 'notifications',
            item: { id: item.id, createdAt: now, readAt: now },
          })),
        )
      if (route) {
        setPanel(null)
        navigate(root + '/' + route)
      }
    } catch {
      actions.notify('Could not mark reminders as read.', true)
    }
  }
  const current =
    groups
      .flatMap((group) => [...group.items])
      .find(
        ([path]) =>
          location.pathname === root + (path ? '/' + path : '') ||
          (path && location.pathname.startsWith(root + '/' + path + '/')),
      )?.[1] ?? 'Settings'
  const initials = (profile.firstName[0] ?? 'S') + (profile.lastName[0] ?? '')
  const findItems = [
    ...data.modules.map((m) => ({ title: m.name, detail: m.code, url: '/modules/' + m.id })),
    ...data.assignments.map((m) => ({
      title: m.title,
      detail: 'Assignment',
      url: '/assignments?record=' + m.id,
    })),
    ...data.exams.map((m) => ({ title: m.title, detail: 'Exam', url: '/exams?record=' + m.id })),
    ...data.notes.map((m) => ({ title: m.title, detail: 'Note', url: '/notes?record=' + m.id })),
    ...data.studySessions.map((m) => ({
      title: m.title,
      detail: 'Study session',
      url: '/planner?record=' + m.id,
    })),
  ]
    .filter((item) =>
      (item.title + ' ' + item.detail).toLowerCase().includes(search.trim().toLowerCase()),
    )
    .slice(0, 12)
  return (
    <div className={'workspace ' + (sidebar ? 'compact' : '')}>
      <a
        className="skip-link"
        href="#workspace-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('workspace-content')?.focus()
        }}
      >
        Skip to content
      </a>
      {drawer && (
        <button
          aria-label="Close navigation"
          className="drawer-overlay"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside className={'sidebar ' + (drawer ? 'drawer-open' : '')}>
        <div className="sidebar-brand">
          <span className="desktop-brand">
            <Brand small={sidebar} />
          </span>
          <span className="mobile-brand">
            <Brand />
          </span>
          <button
            className="icon-button collapse"
            aria-label={sidebar ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => {
              localStorage.setItem('campusflow.sidebar', sidebar ? 'wide' : 'compact')
              setSidebar(!sidebar)
            }}
          >
            {sidebar ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <button
            className="icon-button drawer-close"
            aria-label="Close navigation"
            onClick={() => setDrawer(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-id">
          <span className="workspace-avatar">
            <GraduationCap size={19} />
          </span>
          <div>
            <strong>Student workspace</strong>
            <small>
              {profile.periodType} {profile.period} · {profile.academicYear}
            </small>
          </div>
          <ChevronDown size={13} />
        </div>
        <nav className="sidebar-nav" aria-label="Workspace navigation">
          {groups.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-label">{group.label}</div>
              {group.items.map(([path, label, Icon]) => (
                <NavLink title={label} to={root + (path ? '/' + path : '')} end={!path} key={path}>
                  <Icon size={17} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink title="Settings" to={root + '/settings'}>
            <Settings size={17} />
            <span>Settings</span>
          </NavLink>
          <NavLink className="user-link" title="Profile and settings" to={root + '/settings'}>
            <span className="avatar">{initials}</span>
            <span>
              <strong>
                {profile.firstName} {profile.lastName}
              </strong>
              <small>{demo ? 'Demo student' : 'Student account'}</small>
            </span>
            <ChevronRight size={14} />
          </NavLink>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button drawer-toggle"
              aria-label="Open navigation"
              onClick={() => setDrawer(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{current}</strong>
          </div>
          <div className="top-actions">
            <button
              className="top-search"
              onClick={() => {
                setSearch('')
                setPanel('search')
              }}
              aria-label="Search workspace"
            >
              <Search size={17} />
              <span>Search anything…</span>
              <kbd>
                <Command size={11} /> K
              </kbd>
            </button>
            <button
              className="icon-button bell"
              aria-label={
                profile.inApp && pending.length
                  ? 'Notifications, ' + pending.length + ' unread'
                  : 'Notifications'
              }
              onClick={() => setPanel('notifications')}
            >
              <Bell size={19} />
              {profile.inApp && pending.length > 0 && <i />}
            </button>
            <div className="new-wrap">
              <Button aria-expanded={newMenu} onClick={() => setNewMenu(!newMenu)}>
                <Plus size={17} />
                <span>Quick add</span>
                <ChevronDown size={13} />
              </Button>
              {newMenu && (
                <>
                  <button
                    aria-label="Close quick add menu"
                    className="popover-overlay"
                    onClick={() => setNewMenu(false)}
                  />
                  <div className="dropdown">
                    {quick.map(([kind, title, Icon]) => (
                      <button
                        key={kind}
                        onClick={() => {
                          setNewMenu(false)
                          actions.edit({ kind })
                        }}
                      >
                        <Icon size={17} />
                        {title}
                      </button>
                    ))}
                    <Link to={root + '/focus'}>
                      <Timer size={17} />
                      Start focus session
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        {demo && (
          <div className="demo-bar">
            <div>
              <FlaskConical size={15} />
              <strong>Interactive demo</strong>
              <span>Explore sample data. Changes stay in this browser.</span>
            </div>
            {!portfolioBuild && (
              <Link to="/register">
                Create your workspace <ChevronRight size={14} />
              </Link>
            )}
          </div>
        )}
        {!demo && !online && (
          <div className="workspace-error" role="status">
            You’re offline. Keep this tab open until pending changes sync.
          </div>
        )}
        {error && (
          <div className="workspace-error" role="alert">
            {error}
          </div>
        )}
        <main className="content" id="workspace-content" tabIndex={-1}>
          <Outlet context={root} />
        </main>
        <footer className="workspace-footer">
          <span>CampusFlow</span>
          <span>Your Academic Life, Organized.</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Primary mobile navigation">
        {mobile.map(([path, label, Icon]) => (
          <NavLink to={root + (path ? '/' + path : '')} end={!path} key={path}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      {panel === 'search' && (
        <Modal title="Search workspace" onClose={() => setPanel(null)}>
          <div className="command-search">
            <Search size={19} />
            <input
              aria-label="Search records"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Modules, notes, exams and more…"
            />
          </div>
          <div className="command-results">
            {search.trim() ? (
              findItems.length ? (
                findItems.map((item, i) => (
                  <Link key={item.url + i} to={root + item.url} onClick={() => setPanel(null)}>
                    {item.title}
                    <small>{item.detail}</small>
                  </Link>
                ))
              ) : (
                <p className="muted">No matching records.</p>
              )
            ) : (
              <>
                <div className="nav-label">QUICK ACTIONS</div>
                {quick.map(([kind, title, Icon]) => (
                  <button
                    key={kind}
                    onClick={() => {
                      setPanel(null)
                      actions.edit({ kind })
                    }}
                  >
                    <Icon size={17} />
                    {title}
                  </button>
                ))}
                {[
                  ['focus', 'Start focus session'],
                  ['calendar', 'Open calendar'],
                  ['insights', 'View analytics'],
                ].map(([path, title]) => (
                  <Link key={path} to={root + '/' + path} onClick={() => setPanel(null)}>
                    {title}
                    <ChevronRight size={15} />
                  </Link>
                ))}
              </>
            )}
          </div>
        </Modal>
      )}
      {panel === 'notifications' && (
        <Modal title="Reminders" onClose={() => setPanel(null)}>
          {!profile.inApp ? (
            <Empty
              title="In-app reminders are off"
              detail="You can change this preference in Settings."
            />
          ) : !all.length ? (
            <Empty
              title="You’re all caught up"
              detail="Upcoming deadlines and study reminders will appear here."
            />
          ) : (
            <>
              <div className="reminder-list">
                {all.map((item) => (
                  <button
                    className={pending.includes(item) ? 'unread' : ''}
                    key={item.id}
                    onClick={() => void mark(pending.includes(item) ? [item] : [], item.route)}
                  >
                    <Bell size={16} />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
              {pending.length > 0 && (
                <Button className="spaced" variant="outline" onClick={() => void mark(pending)}>
                  Mark all as read
                </Button>
              )}
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
