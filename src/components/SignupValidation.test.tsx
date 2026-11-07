// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthPage } from '../pages/Auth'

it('offers the interactive demo when account services are unconfigured', () => {
  render(
    <MemoryRouter>
      <AuthPage mode="register" user={null} />
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { name: 'Create your account' })).toBeTruthy()
  const demo = screen.getByRole('link', { name: 'Try interactive demo' })
  expect(demo.getAttribute('href')).toBe('/demo')
  fireEvent.click(demo)
})
