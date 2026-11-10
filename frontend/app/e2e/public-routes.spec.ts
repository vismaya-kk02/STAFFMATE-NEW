import { expect, test } from '@playwright/test'
import { mockAnonymousSession } from './fixtures/authMock'

/**
 * MOCKED frontend routing tests — no Laravel, no real credentials.
 */
test.describe('Public routes (mocked session)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAnonymousSession(page)
  })

  test('login page renders Staffmate sign-in', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.locator('#staffmate-sign-in-email')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
  })

  test('forgot-password page is reachable', async ({ page }) => {
    await page.goto('/forgot-password')

    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible()
  })

  test('login links to forgot-password via SPA navigation', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Forgot password?' }).click()

    await expect(page).toHaveURL(/\/forgot-password$/)
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
  })

  test('reset-password token route renders without probing protected APIs as content', async ({ page }) => {
    await page.goto('/reset-password/sample-token?email=reset%40example.com')

    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()
    await expect(page).toHaveURL(/\/reset-password\/sample-token/)
  })

  test('accept-invitation token route renders', async ({ page }) => {
    await page.goto('/accept-invitation/sample-invite-token')

    await expect(page.getByRole('heading', { name: 'Accept your invitation' })).toBeVisible()
  })

  test('root redirects anonymous users to login', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })
})
