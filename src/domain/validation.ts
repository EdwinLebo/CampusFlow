import { z } from 'zod'
import type { Kind } from './model'
const name = z.string().trim().min(1, 'Enter a name').max(100)
const text = z.string().trim().max(1000)
const number = (min: number, max: number) => z.coerce.number().finite().min(min).max(max)
const color = z.string().regex(/^#[0-9a-f]{6}$/i, 'Choose a valid colour')
const date = z.number().positive('Choose a valid date and time')
const moduleId = z.string().min(1, 'Choose a module')
const topics = z
  .array(z.object({ id: z.string(), text: z.string().max(250), done: z.boolean() }))
  .max(50)
const statuses = ['Not started', 'In progress', 'Completed', 'Submitted'] as const
export const schemas = {
  modules: z.object({
    name,
    code: name,
    lecturer: text,
    period: name,
    color,
    credits: number(0, 360),
    target: number(0, 100),
    difficulty: number(1, 5),
    confidence: number(1, 5),
    archived: z.boolean(),
  }),
  assignments: z.object({
    title: name,
    moduleId,
    description: z.string().max(10000),
    due: date,
    priority: z.enum(['Low', 'Medium', 'High']),
    status: z.enum(statuses),
    estimate: number(15, 6000),
    weight: number(0, 100),
    links: z.array(z.url({ protocol: /^https?$/ })).max(20),
    checklist: topics,
    finishedAt: z.number().nonnegative(),
  }),
  exams: z.object({
    title: name,
    moduleId,
    start: date,
    minutes: number(15, 720),
    venue: text,
    topics,
    target: number(0, 100),
    importance: number(1, 5),
    studyGoal: number(0, 6000),
  }),
  studySessions: z.object({
    title: name,
    moduleId: z.string(),
    start: date,
    minutes: number(1, 720),
    completedAt: z.number().nonnegative(),
    source: z.enum(['manual', 'planner', 'focus']),
    examId: z.string(),
  }),
  calendarEvents: z.object({
    title: name,
    moduleId: z.string(),
    start: date,
    minutes: number(1, 1440),
    eventType: z.enum(['Class', 'Test', 'Personal']),
    location: text,
  }),
  assessments: z
    .object({
      title: name,
      moduleId,
      assessmentType: z.enum(['Assignment', 'Test', 'Quiz', 'Practical', 'Exam']),
      obtained: number(0, 10000),
      maximum: number(0.01, 10000),
      weight: number(0, 100),
      date,
    })
    .refine((v) => v.obtained <= v.maximum, {
      path: ['obtained'],
      message: 'Mark obtained cannot exceed maximum mark',
    }),
  notes: z.object({
    title: name,
    moduleId: z.string(),
    content: z.string().max(40000),
    tags: z.array(z.string().max(40)).max(20),
    pinned: z.boolean(),
  }),
  goals: z
    .object({
      title: name,
      moduleId: z.string(),
      mode: z.enum([
        'Study hours this week',
        'Streak days',
        'Early submissions',
        'Modules studied this week',
        'Current module grade',
        'Manual',
      ]),
      target: number(0.01, 10000),
      progress: number(0, 10000),
    })
    .refine((v) => v.mode !== 'Current module grade' || (v.moduleId && v.target <= 100), {
      path: ['moduleId'],
      message: 'Select a module and set a target of 100% or less',
    }),
} satisfies Record<Exclude<Kind, 'notifications'>, z.ZodType>
export const signupSchema = z
  .object({
    firstName: name,
    lastName: name,
    email: z.email('Enter a valid email address'),
    password: z.string().min(8, 'Use at least 8 characters').max(128),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ['confirm'],
    message: 'Passwords must match',
  })
export const profileSchema = z
  .object({
    firstName: name,
    lastName: z.string().trim().max(100),
    institution: name,
    qualification: name,
    studyYear: number(1, 12),
    academicYear: number(2000, 2100),
    periodType: z.enum(['Semester', 'Term']),
    period: number(1, 4),
    timezone: z.string().refine((zone) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: zone })
        return true
      } catch {
        return false
      }
    }, 'Enter a valid IANA time zone'),
    studyDays: z.array(z.number().int().min(0).max(6)).min(1, 'Choose at least one study day'),
    sessionMinutes: number(5, 180),
    breakMinutes: number(0, 120),
    dailyGoal: number(0, 720),
    preferredTime: z.enum(['Morning', 'Afternoon', 'Evening']),
    theme: z.enum(['system', 'light', 'dark']),
    reminders: z.array(z.number().min(0.01).max(30)).max(8),
    browserNotifications: z.boolean(),
    inApp: z.boolean(),
    achievements: z.boolean(),
    onboarded: z.boolean(),
  })
  .refine((v) => v.periodType === 'Term' || v.period <= 2, {
    path: ['period'],
    message: 'Choose semester 1 or 2',
  })
