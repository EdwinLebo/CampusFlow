import { expect, test } from '@playwright/test'
test('registration, email verification, password reset, persistent sign-in and account deletion', async ({
  page,
  request,
}) => {
  const email = 'campusflow-' + Date.now() + '@example.test'
  const password = 'CampusFlow2026!'
  const newPassword = 'CampusFlow-reset2026!'
  const authApi = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:'
  await page.goto('/register')
  await page.getByLabel('First name').fill('Sibongile')
  await page.getByLabel('Last name').fill('Ndlovu')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: /organize your academic journey/ })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('University or institution').fill('Tshwane University of Technology')
  await page.getByLabel('Qualification or course').fill('Multimedia Computing')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Add module' }).click()
  await page.getByLabel('Module code').fill('TEST101')
  await page.getByLabel('Module name').fill('Media Studies')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Open my workspace' }).click()
  await expect(page.getByRole('heading', { name: /Sibongile/ })).toBeVisible()
  await page.goto('/app/assignments')
  await page.getByRole('button', { name: 'New assignment' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title').fill('Documentary proposal')
  await dialog
    .getByRole('combobox', { name: 'Module', exact: true })
    .selectOption({ label: 'TEST101 · Media Studies' })
  await dialog.getByRole('button', { name: 'Add assignment' }).click()
  await expect(page.getByText('Documentary proposal')).toBeVisible()
  await page.goto('/app/settings')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Sibongile/ })).toBeVisible()
  await page.goto('/app/assignments')
  await expect(page.getByText('Documentary proposal')).toBeVisible()
  await page.goto('/demo/assignments')
  await expect(page.getByText('Documentary proposal')).toHaveCount(0)
  await page.goto('/app/settings')
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText(/a reset link is on its way/)).toBeVisible()
  const codes = await (
    await request.get('http://127.0.0.1:9099/emulator/v1/projects/demo-campusflow/oobCodes')
  ).json()
  const emailCodes = (
    codes.oobCodes as { email: string; requestType: string; oobCode: string }[]
  ).filter((code) => code.email === email)
  const verification = emailCodes.find((code) => code.requestType === 'VERIFY_EMAIL')
  const reset = emailCodes.find((code) => code.requestType === 'PASSWORD_RESET')
  expect(verification?.oobCode).toBeTruthy()
  expect(reset?.oobCode).toBeTruthy()
  const verifyResponse = await request.post(authApi + 'update?key=fake-api-key', {
    data: { oobCode: verification!.oobCode },
  })
  expect(verifyResponse.ok()).toBe(true)
  const resetResponse = await request.post(authApi + 'resetPassword?key=fake-api-key', {
    data: { oobCode: reset!.oobCode, newPassword },
  })
  expect(resetResponse.ok()).toBe(true)

  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText('The email or password was incorrect.')).toBeVisible()
  await page.getByLabel('Password', { exact: true }).fill(newPassword)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Sibongile/ })).toBeVisible()
  const login = await request.post(authApi + 'signInWithPassword?key=fake-api-key', {
    data: { email, password: newPassword, returnSecureToken: true },
  })
  expect(login.ok()).toBe(true)
  const { localId: uid } = await login.json()
  const workspace =
    'http://127.0.0.1:8080/v1/projects/demo-campusflow/databases/(default)/documents/users/' + uid
  const admin = { headers: { Authorization: 'Bearer owner' } }
  const before = await (await request.get(workspace + '/assignments', admin)).json()
  expect(before.documents).toHaveLength(1)
  await page.goto('/app/settings')
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send verification email' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Delete account', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete account', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/, { timeout: 20000 })
  expect((await request.get(workspace, admin)).status()).toBe(404)
  const after = await (await request.get(workspace + '/assignments', admin)).json()
  expect(after.documents ?? []).toHaveLength(0)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(newPassword)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText('The email or password was incorrect.')).toBeVisible()
})
