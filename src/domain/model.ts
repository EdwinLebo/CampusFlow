export const kinds = [
  'modules',
  'assignments',
  'exams',
  'studySessions',
  'calendarEvents',
  'assessments',
  'notes',
  'goals',
  'notifications',
] as const
export type Kind = (typeof kinds)[number]
export type Theme = 'system' | 'light' | 'dark'
export type Status = 'Not started' | 'In progress' | 'Completed' | 'Submitted'
export type Checklist = { id: string; text: string; done: boolean }[]
export interface Profile {
  firstName: string
  lastName: string
  institution: string
  qualification: string
  studyYear: number
  academicYear: number
  periodType: 'Semester' | 'Term'
  period: number
  timezone: string
  studyDays: number[]
  sessionMinutes: number
  breakMinutes: number
  dailyGoal: number
  preferredTime: 'Morning' | 'Afternoon' | 'Evening'
  theme: Theme
  reminders: number[]
  browserNotifications: boolean
  inApp: boolean
  achievements: boolean
  onboarded: boolean
}
export const defaultProfile: Profile = {
  firstName: '',
  lastName: '',
  institution: '',
  qualification: '',
  studyYear: 1,
  academicYear: new Date().getFullYear(),
  periodType: 'Semester',
  period: 1,
  timezone: 'Africa/Johannesburg',
  studyDays: [1, 2, 3, 4, 5],
  sessionMinutes: 50,
  breakMinutes: 15,
  dailyGoal: 90,
  preferredTime: 'Afternoon',
  theme: 'system',
  reminders: [1, 3, 7],
  browserNotifications: false,
  inApp: true,
  achievements: true,
  onboarded: false,
}
export interface Base {
  id: string
  createdAt: number
}
export interface Module extends Base {
  name: string
  code: string
  lecturer: string
  period: string
  color: string
  credits: number
  target: number
  difficulty: number
  confidence: number
  archived: boolean
}
export interface Assignment extends Base {
  title: string
  moduleId: string
  description: string
  due: number
  priority: 'Low' | 'Medium' | 'High'
  status: Status
  estimate: number
  weight: number
  links: string[]
  checklist: Checklist
  finishedAt: number
}
export interface Exam extends Base {
  title: string
  moduleId: string
  start: number
  minutes: number
  venue: string
  topics: Checklist
  target: number
  importance: number
  studyGoal: number
}
export interface Session extends Base {
  title: string
  moduleId: string
  start: number
  minutes: number
  completedAt: number
  source: 'manual' | 'planner' | 'focus'
  examId: string
}
export interface CalendarEvent extends Base {
  title: string
  moduleId: string
  start: number
  minutes: number
  eventType: 'Class' | 'Test' | 'Personal'
  location: string
}
export interface Assessment extends Base {
  title: string
  moduleId: string
  assessmentType: 'Assignment' | 'Test' | 'Quiz' | 'Practical' | 'Exam'
  obtained: number
  maximum: number
  weight: number
  date: number
}
export interface Note extends Base {
  title: string
  moduleId: string
  content: string
  tags: string[]
  pinned: boolean
}
export interface Goal extends Base {
  title: string
  mode:
    | 'Study hours this week'
    | 'Streak days'
    | 'Early submissions'
    | 'Modules studied this week'
    | 'Current module grade'
    | 'Manual'
  target: number
  progress: number
  moduleId: string
}
export interface NotificationRecord extends Base {
  readAt: number
}
export interface Collections {
  modules: Module
  assignments: Assignment
  exams: Exam
  studySessions: Session
  calendarEvents: CalendarEvent
  assessments: Assessment
  notes: Note
  goals: Goal
  notifications: NotificationRecord
}
export type Data = { [K in Kind]: Collections[K][] }
export type Change = { [K in Kind]: { kind: K; item: Collections[K]; remove?: boolean } }[Kind]
export const emptyData = (): Data => ({
  modules: [],
  assignments: [],
  exams: [],
  studySessions: [],
  calendarEvents: [],
  assessments: [],
  notes: [],
  goals: [],
  notifications: [],
})
export const colors = ['#4f46e5', '#8b5cf6', '#0891b2', '#059669', '#d97706', '#e11d48']
export const newId = () => crypto.randomUUID()
export const base = (): Base => ({ id: newId(), createdAt: Date.now() })
export const isFinished = (status: Status) => status === 'Completed' || status === 'Submitted'
export const moduleName = (modules: Module[], id: string) =>
  modules.find((m) => m.id === id)?.code ?? (id ? 'Removed module' : 'General')
