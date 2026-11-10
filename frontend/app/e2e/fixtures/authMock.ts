import type { Page, Route } from '@playwright/test'

export type MockSections = {
  admin: boolean
  crm: boolean
}

export type MockPersona = {
  id: number
  name: string
  email: string
  roles: string[]
  permissions: string[]
  sections: MockSections
  emailVerified?: boolean
  mfaEnrolled?: boolean
  mfaConfirmed?: boolean
}

export const dualAccessPersona: MockPersona = {
  id: 1,
  name: 'Dual Access User',
  email: 'dual@example.com',
  roles: ['Super Admin'],
  permissions: [
    'identity.users.view',
    'identity.roles.view',
    'crm.access',
  ],
  sections: { admin: true, crm: true },
}

export const adminOnlyPersona: MockPersona = {
  id: 2,
  name: 'Admin Only User',
  email: 'admin-only@example.com',
  roles: ['Management'],
  permissions: [
    'identity.users.view',
    'identity.roles.view',
  ],
  sections: { admin: true, crm: false },
}

export const crmOnlyPersona: MockPersona = {
  id: 3,
  name: 'CRM Only User',
  email: 'crm-only@example.com',
  roles: ['Coordinator'],
  permissions: ['crm.access'],
  sections: { admin: false, crm: true },
}

export const noSectionPersona: MockPersona = {
  id: 4,
  name: 'No Section User',
  email: 'none@example.com',
  roles: [],
  permissions: [],
  sections: { admin: false, crm: false },
}

async function json(route: Route, status: number, body: unknown = null): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: body === null ? '' : JSON.stringify(body),
  })
}

/** Anonymous session: CSRF ok, /me returns 401. */
export async function mockAnonymousSession(page: Page): Promise<void> {
  await page.route('**/sanctum/csrf-cookie', async (route) => {
    await route.fulfill({
      status: 204,
      headers: {
        'Set-Cookie': 'XSRF-TOKEN=test-xsrf; Path=/',
      },
    })
  })

  await page.route('**/api/v1/me', async (route) => {
    await json(route, 401, { message: 'Unauthenticated.' })
  })

  await page.route('**/api/v1/**', async (route) => {
    await json(route, 401, { message: 'Unauthenticated.' })
  })
}

/**
 * Authenticated, MFA-complete session for the given persona.
 * Intercepts Sanctum CSRF and Identity APIs used by loadSession().
 */
export async function mockAuthenticatedSession(page: Page, persona: MockPersona): Promise<void> {
  const emailVerified = persona.emailVerified ?? true
  const mfaEnrolled = persona.mfaEnrolled ?? true
  const mfaConfirmed = persona.mfaConfirmed ?? true

  await page.route('**/sanctum/csrf-cookie', async (route) => {
    await route.fulfill({
      status: 204,
      headers: {
        'Set-Cookie': 'XSRF-TOKEN=test-xsrf; Path=/',
      },
    })
  })

  await page.route('**/api/v1/me', async (route) => {
    await json(route, 200, {
      id: persona.id,
      name: persona.name,
      email: persona.email,
    })
  })

  await page.route('**/api/v1/identity/state', async (route) => {
    await json(route, 200, {
      email_verified: emailVerified,
      mfa_enrolled: mfaEnrolled,
      mfa_confirmed: mfaConfirmed,
      roles: persona.roles,
      permissions: persona.permissions,
      sections: persona.sections,
    })
  })

  await page.route('**/api/v1/admin/home', async (route) => {
    if (!persona.sections.admin) {
      await json(route, 403, { message: 'Forbidden.', reason: 'permission' })

      return
    }

    await json(route, 200, {
      name: persona.name,
      email: persona.email,
      roles: persona.roles,
      permissions: persona.permissions,
      sections: persona.sections,
    })
  })

  await page.route('**/api/v1/crm/home', async (route) => {
    if (!persona.sections.crm) {
      await json(route, 403, { message: 'Forbidden.', reason: 'permission' })

      return
    }

    await json(route, 200, {
      name: persona.name,
      email: persona.email,
      roles: persona.roles,
      permissions: persona.permissions,
      sections: persona.sections,
      navigation: [{ key: 'home', label: 'Home' }],
    })
  })

  await page.route('**/api/v1/admin/employees**', async (route) => {
    if (!persona.permissions.includes('identity.users.view')) {
      await json(route, 403, { message: 'Forbidden.', reason: 'permission' })

      return
    }

    await json(route, 200, {
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 },
    })
  })

  await page.route('**/api/v1/admin/roles**', async (route) => {
    if (!persona.permissions.includes('identity.roles.view')) {
      await json(route, 403, { message: 'Forbidden.', reason: 'permission' })

      return
    }

    await json(route, 200, {
      permissions: persona.permissions.map((name) => ({ name, label: name })),
      roles: persona.roles.map((name, index) => ({
        id: index + 1,
        name,
        system: true,
        permissions: persona.permissions,
        assignable: true,
      })),
    })
  })

  await page.route('**/logout', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 204 })

      return
    }

    await route.continue()
  })
}
