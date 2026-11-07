import { expect, test, type Page } from '@playwright/test'
async function openDemo(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'Try Interactive Demo', exact: true }).first().click()
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening), Alex/ }),
  ).toBeVisible()
}
test('landing, demo mutation, reload, reset and workspace isolation', async ({ page, browser }) => {
  await openDemo(page)
  await page
    .getByRole('navigation', { name: 'Workspace navigation' })
    .getByRole('link', { name: 'Assignments' })
    .click()
  await page.getByRole('button', { name: 'New assignment' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title').fill('Portfolio usability review')
  await dialog.getByRole('combobox', { name: 'Module', exact: true }).selectOption('module-0')
  await dialog.getByRole('button', { name: 'Add assignment' }).click()
  await expect(
    page.getByRole('button', { name: 'Edit Portfolio usability review', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Status for Portfolio usability review' })
    .selectOption('Submitted')
  await page.reload()
  await expect(
    page.getByRole('combobox', { name: 'Status for Portfolio usability review' }),
  ).toHaveValue('Submitted')
  const isolated = await browser.newContext()
  const other = await isolated.newPage()
  await other.goto('http://127.0.0.1:4173/demo/assignments')
  await expect(other.getByText('Portfolio usability review')).toHaveCount(0)
  await isolated.close()
  await page.goto('/app')
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/demo/settings')
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Reset demo', exact: true }).click()
  await page.goto('/demo/assignments')
  await expect(page.getByText('Portfolio usability review')).toHaveCount(0)
})
test('planner preview, lock, save, search and export', async ({ page }) => {
  await page.goto('/demo/planner')
  await page.getByRole('button', { name: 'Generate study plan' }).click()
  const locks = page.getByRole('button', { name: /^Lock / })
  await expect(locks.first()).toBeVisible()
  await locks.first().click()
  await page.getByRole('button', { name: 'Regenerate plan' }).click()
  await expect(page.getByRole('button', { name: /^Unlock / }).first()).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export .ics' }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('campusflow-study-plan.ics')
  await page.getByRole('button', { name: 'Accept timetable' }).click()
  await expect(page.getByText('Study plan saved to your calendar')).toBeVisible()
  await page.keyboard.press('Control+k')
  await page.getByRole('textbox', { name: 'Search records' }).fill('Polymorphism revision')
  await page.getByRole('link', { name: /Polymorphism revision/ }).click()
  await expect(page.getByRole('dialog', { name: 'Edit note' })).toBeVisible()
})
test('focus logs elapsed time and keeps it after refresh', async ({ page }) => {
  await page.clock.install()
  await page.goto('/demo/focus')
  await page.getByLabel('Duration (minutes)').fill('1')
  await page.getByLabel('Session objective').fill('Review operators')
  await page.getByRole('button', { name: 'Start timer' }).click()
  await page.clock.fastForward(61_000)
  await expect(page.getByText('Session finished')).toBeVisible()
  await page.getByRole('button', { name: 'Log & end' }).click()
  await expect(page.getByText('Focus session logged')).toBeVisible()
  await page.goto('/demo/planner')
  await expect(page.getByText('Review operators')).toBeVisible()
})
test('mobile navigation, calendar and theme fit the screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openDemo(page)
  const nav = page.getByRole('navigation', { name: 'Primary mobile navigation' })
  await nav.getByRole('link', { name: 'Calendar' }).click()
  await page.getByRole('button', { name: 'Week', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Academic Calendar' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await nav.getByRole('link', { name: 'Profile' }).click()
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('active browser reminders persist without duplicating on reload', async ({ page, context }) => {
  await context.grantPermissions(['notifications'])
  await page.goto('/demo/settings')
  const label = await page
    .getByRole('button', { name: /Notifications, .+ unread/ })
    .getAttribute('aria-label')
  const expected = Number(label?.match(/\d+/)?.[0])
  expect(expected).toBeGreaterThan(0)
  const delivered = () =>
    page.evaluate(
      () => JSON.parse(localStorage.getItem('campusflow.browser-reminders.demo') ?? '[]') as string[],
    )
  await page.getByLabel('Browser reminders', { exact: true }).check()
  await page.getByRole('button', { name: 'Save preferences' }).click()
  await expect.poll(async () => (await delivered()).length).toBe(expected)
  const tags = () =>
    page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration()
      return ((await registration?.getNotifications()) ?? []).map((item) => item.tag).sort()
    })
  const before = await tags()
  expect(before).toHaveLength(expected)
  expect(new Set(before).size).toBe(expected)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await expect.poll(tags).toEqual(before)
})
