import { colors, defaultProfile, emptyData, type Data, type Profile } from '../domain/model'
import { addLocalDays, keyFor, parseLocal } from '../domain/time'
export const DEMO_KEY = 'campusflow.demo.v1'
export interface Demo {
  data: Data
  profile: Profile
}
export function seedDemo(now = Date.now()): Demo {
  const data = emptyData()
  const zone = defaultProfile.timezone
  const at = (days: number, time: string) =>
    parseLocal(keyFor(addLocalDays(now, days, zone), zone) + 'T' + time, zone)
  const record = (id: string) => ({ id, createdAt: at(-25, '09:00') })
  const modules = [
    ['AOP216D', 'Advanced Object-Oriented Programming', 'Dr. M. Dlamini'],
    ['WEB206D', 'Web Application Development', 'Ms. L. Mokoena'],
    ['UXD206D', 'User Experience Design', 'Ms. A. Naidoo'],
    ['DBS206D', 'Database Systems', 'Mr. K. Molefe'],
    ['MMP206D', 'Multimedia Production', 'Dr. T. Jacobs'],
  ]
  data.modules = modules.map(([code, name, lecturer], i) => ({
    ...record('module-' + i),
    code,
    name,
    lecturer,
    period: 'Semester 2',
    color: colors[i],
    credits: 16,
    target: 75 + i * 2,
    difficulty: 5 - (i % 4),
    confidence: 2 + (i % 3),
    archived: false,
  }))
  const tasks = [
    ['Interface design critique', 2, 0, '16:00', 'High', 'In progress'],
    ['Build REST API endpoints', 1, 2, '23:59', 'High', 'Not started'],
    ['Database normalization report', 3, 4, '18:00', 'Medium', 'Not started'],
    ['Short-form video storyboard', 4, 6, '15:00', 'Medium', 'In progress'],
    ['Java inheritance worksheet', 0, -1, '17:00', 'High', 'Not started'],
    ['User research interview guide', 2, -2, '16:00', 'Low', 'Submitted'],
    ['Multimedia lighting exercise', 4, -3, '13:00', 'Medium', 'Completed'],
  ] as const
  data.assignments = tasks.map(([title, module, day, time, priority, status], i) => ({
    ...record('assignment-' + i),
    title,
    moduleId: 'module-' + module,
    description:
      'Review the module brief, complete the deliverables and check your submission before the deadline.',
    due: at(day, time),
    priority,
    status,
    estimate: 120,
    weight: 15,
    links: [],
    checklist: [
      { id: 'a', text: 'Review the brief', done: status !== 'Not started' },
      { id: 'b', text: 'Prepare final submission', done: i >= 5 },
    ],
    finishedAt: i >= 5 ? at(day - 2, '12:00') : 0,
  }))
  data.exams = [0, 3, 1].map((m, i) => ({
    ...record('exam-' + i),
    title: ['Object-Oriented Programming Exam', 'Database Systems Exam', 'Web Development Practical'][i],
    moduleId: 'module-' + m,
    start: at([5, 9, 14][i], '09:00'),
    minutes: 120,
    venue: ['Building 6 · Lab 2', 'Pretoria Campus · Hall B', 'Building 10 · Lab 1'][i],
    target: 78,
    importance: 5,
    studyGoal: 180,
    topics: [
      { id: 't1', text: 'Review lecture summaries', done: i === 0 },
      { id: 't2', text: 'Work through past questions', done: i === 0 },
      { id: 't3', text: 'Complete a timed practice paper', done: false },
    ],
  }))
  data.studySessions = [
    ...[35, 50, 55, 45, 65, 50, 55, 30, 40, 60, 50, 45].map((minutes, i) => ({
      ...record('past-' + i),
      title: ['Practice questions', 'Weekly revision', 'Deep work'][i % 3],
      moduleId: 'module-' + (i % 5),
      start: at(-1 - Math.floor(i / 2), i % 2 ? '10:00' : '15:00'),
      minutes,
      completedAt: at(-1 - Math.floor(i / 2), i % 2 ? '11:00' : '16:00'),
      source: i % 2 ? ('focus' as const) : ('manual' as const),
      examId: i === 0 ? 'exam-0' : '',
    })),
    ...[0, 1, 3].map((d, i) => ({
      ...record('future-' + i),
      title: ['Database revision', 'Polymorphism practice', 'Review past exam questions'][i],
      moduleId: ['module-3', 'module-0', 'module-0'][i],
      start: at(d, i === 0 ? '14:00' : '10:00'),
      minutes: 50,
      completedAt: 0,
      source: 'manual' as const,
      examId: i > 0 ? 'exam-0' : '',
    })),
  ]
  data.calendarEvents = [
    {
      ...record('class-1'),
      title: 'Web Development lecture',
      moduleId: 'module-1',
      start: at(0, '09:00'),
      minutes: 90,
      eventType: 'Class',
      location: 'Building 10 · Lab 1',
    },
    {
      ...record('class-2'),
      title: 'UX studio',
      moduleId: 'module-2',
      start: at(0, '11:00'),
      minutes: 60,
      eventType: 'Class',
      location: 'Design studio',
    },
  ]
  data.assessments = modules.flatMap((_, m) =>
    [0, 1].map((i) => ({
      ...record('mark-' + m + '-' + i),
      title: i ? 'Practical 01' : 'Class test 01',
      moduleId: 'module-' + m,
      assessmentType: i ? ('Practical' as const) : ('Test' as const),
      obtained: ([82, 74, 89, 68, 79][m] + i * 3) / 2,
      maximum: 50,
      weight: i ? 20 : 15,
      date: at(-18 + i * 10 + m, '12:00'),
    })),
  )
  data.notes = [
    {
      ...record('note-1'),
      title: 'Polymorphism revision',
      moduleId: 'module-0',
      content:
        'Start with the difference between overloading and overriding.\n\nPractice: implement an interface for a payment method and swap implementations without changing the caller.',
      tags: ['Java', 'Revision'],
      pinned: true,
    },
    {
      ...record('note-2'),
      title: 'Design critique checklist',
      moduleId: 'module-2',
      content:
        'Check contrast, content hierarchy and the clarity of error messages. Run through the form with a keyboard.',
      tags: ['Design'],
      pinned: false,
    },
  ]
  data.goals = [
    {
      ...record('goal-1'),
      title: 'Study 8 hours this week',
      mode: 'Study hours this week',
      target: 8,
      progress: 0,
      moduleId: '',
    },
    {
      ...record('goal-2'),
      title: 'Build a 7-day study streak',
      mode: 'Streak days',
      target: 7,
      progress: 0,
      moduleId: '',
    },
  ]
  return {
    data,
    profile: {
      ...defaultProfile,
      firstName: 'Alex',
      lastName: 'Mokoena',
      institution: 'Tshwane University of Technology',
      qualification: 'Diploma in Multimedia Computing',
      studyYear: 2,
      period: 2,
      onboarded: true,
    },
  }
}
export function readDemo(): Demo {
  try {
    const value = localStorage.getItem(DEMO_KEY)
    if (value) return JSON.parse(value) as Demo
  } catch {
    /* Start with a fresh demo. */
  }
  return seedDemo()
}
