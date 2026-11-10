import { expect, test } from '@playwright/test'
import {
  adminOnlyPersona,
  crmOnlyPersona,
  dualAccessPersona,
  mockAuthenticatedSession,
} from './fixtures/authMock'

/**
 * MOCKED section / permission routing tests — no Laravel, no real credentials.
 *
 * Documents the intentional behaviour that /crm redirects to /admin when the
 * session has Admin access but not crm.access (and the reverse).
 */
test.describe('Dual-access navigation (mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedSession(page, dualAccessPersona)
  })

  test('ready dual-access user lands on Admin home by default', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole('heading', { name: 'Admin home' })).toBeVisible()
    await expect(page.getByText(dualAccessPersona.email)).toBeVisible()
  })

  test('/crm renders CRM home, not Admin home', async ({ page }) => {
    await page.goto('/crm')

    await expect(page).toHaveURL(/\/crm$/)
    await expect(page.getByRole('heading', { name: 'CRM home' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Admin home' })).toHaveCount(0)
    await expect(page.getByText('Available navigation')).toBeVisible()
  })

  test('section nav switches between Admin and CRM URLs', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Admin home' })).toBeVisible()

    await page.getByRole('navigation', { name: 'Staffmate sections' }).getByRole('link', { name: 'CRM' }).click()
    await expect(page).toHaveURL(/\/crm$/)
    await expect(page.getByRole('heading', { name: 'CRM home' })).toBeVisible()

    await page.getByRole('navigation', { name: 'Staffmate sections' }).getByRole('link', { name: 'Admin' }).click()
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole('heading', { name: 'Admin home' })).toBeVisible()
  })

  test('Admin employees and roles have own URLs', async ({ page }) => {
    await page.goto('/admin')

    await page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: 'Employees' }).click()
    await expect(page).toHaveURL(/\/admin\/employees$/)
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible()

    await page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: 'Roles' }).click()
    await expect(page).toHaveURL(/\/admin\/roles$/)
    await expect(page.getByRole('heading', { name: 'Roles and permissions' })).toBeVisible()
  })
})

test.describe('Permission-based section redirects (mocked)', () => {
  test('admin-only user visiting /crm is redirected to /admin (not a CRM render bug)', async ({ page }) => {
    await mockAuthenticatedSession(page, adminOnlyPersona)
    await page.goto('/crm')

    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole('heading', { name: 'Admin home' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'CRM home' })).toHaveCount(0)
  })

  test('crm-only user visiting /admin is redirected to /crm', async ({ page }) => {
    await mockAuthenticatedSession(page, crmOnlyPersona)
    await page.goto('/admin')

    await expect(page).toHaveURL(/\/crm$/)
    await expect(page.getByRole('heading', { name: 'CRM home' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Admin home' })).toHaveCount(0)
  })

  test('crm-only default landing is /crm', async ({ page }) => {
    await mockAuthenticatedSession(page, crmOnlyPersona)
    await page.goto('/')

    await expect(page).toHaveURL(/\/crm$/)
    await expect(page.getByRole('heading', { name: 'CRM home' })).toBeVisible()
  })
})
