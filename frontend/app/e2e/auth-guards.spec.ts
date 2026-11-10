import { expect, test } from '@playwright/test'
import {
  mockAnonymousSession,
  mockAuthenticatedSession,
  noSectionPersona,
} from './fixtures/authMock'

/**
 * MOCKED frontend guard tests — no Laravel, no real credentials.
 */
test.describe('Unauthenticated redirects (mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAnonymousSession(page)
  })

  test('direct /admin redirects to login', async ({ page }) => {
    await page.goto('/admin')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('direct /crm redirects to login', async ({ page }) => {
    await page.goto('/crm')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('direct /admin/employees redirects to login', async ({ page }) => {
    await page.goto('/admin/employees')

    await expect(page).toHaveURL(/\/login$/)
  })

  test('unknown path redirects anonymous users to login', async ({ page }) => {
    await page.goto('/does-not-exist')

    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('Authenticated without section access (mocked)', () => {
  test('user with no Admin/CRM permissions lands on forbidden', async ({ page }) => {
    await mockAuthenticatedSession(page, noSectionPersona)
    await page.goto('/admin')

    await expect(page).toHaveURL(/\/forbidden$/)
    await expect(page.getByRole('heading', { name: 'No Staffmate sections available' })).toBeVisible()
  })
})
