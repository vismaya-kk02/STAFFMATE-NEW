import { api, isApiError } from './api'
import type { AdminHome, CrmHome, CurrentUser, IdentityState, SessionHome } from './types'

export type SessionSnapshot =
  | { kind: 'anonymous' }
  | { kind: 'expired' }
  | { kind: 'unverified'; user: CurrentUser }
  | { kind: 'enroll'; user: CurrentUser }
  | { kind: 'challenge-required'; user: CurrentUser }
  | { kind: 'ready'; user: CurrentUser; home: SessionHome }
  | { kind: 'forbidden'; user: CurrentUser }
  | { kind: 'unreachable'; message: string }

export async function loadSession(): Promise<SessionSnapshot> {
  try {
    const user = await api<CurrentUser>('/api/v1/me')
    const state = await api<IdentityState>('/api/v1/identity/state')

    if (!state.email_verified) {
      return { kind: 'unverified', user }
    }

    if (!state.mfa_enrolled) {
      return { kind: 'enroll', user }
    }

    if (!state.mfa_confirmed) {
      return { kind: 'challenge-required', user }
    }

    if (!state.sections.admin && !state.sections.crm) {
      return { kind: 'forbidden', user }
    }

    try {
      const home = await loadAuthorizedHome(state)

      return { kind: 'ready', user, home }
    } catch (error) {
      return snapshotFromProtectedError(error, user)
    }
  } catch (error) {
    return snapshotFromProbeError(error)
  }
}

async function loadAuthorizedHome(state: IdentityState): Promise<SessionHome> {
  let admin: AdminHome | null = null
  let crm: CrmHome | null = null

  if (state.sections.admin) {
    admin = await api<AdminHome>('/api/v1/admin/home')
  }

  if (state.sections.crm) {
    crm = await api<CrmHome>('/api/v1/crm/home')
  }

  const source = admin ?? crm

  if (source === null) {
    throw Object.assign(new Error('No authorized Staffmate section is available.'), {
      status: 403,
      reason: 'permission',
      errors: {},
    })
  }

  return {
    name: source.name,
    email: source.email,
    roles: source.roles,
    permissions: source.permissions ?? state.permissions,
    sections: state.sections,
    crmNavigation: crm?.navigation ?? [{ key: 'home', label: 'Home' }],
  }
}

function snapshotFromProtectedError(error: unknown, user: CurrentUser): SessionSnapshot {
  if (!isApiError(error)) {
    return { kind: 'unreachable', message: 'Staffmate could not be reached.' }
  }

  if (error.status === 401 && error.message === 'Session expired.') {
    return { kind: 'expired' }
  }

  if (error.status === 401) {
    return { kind: 'anonymous' }
  }

  if (error.status === 403 && error.reason === 'email') {
    return { kind: 'unverified', user }
  }

  if (error.status === 403 && error.reason === 'enrollment') {
    return { kind: 'enroll', user }
  }

  if (error.status === 403 && error.reason === 'challenge') {
    return { kind: 'challenge-required', user }
  }

  if (error.status === 403 && error.reason === 'permission') {
    return { kind: 'forbidden', user }
  }

  if (error.status === 419) {
    return { kind: 'expired' }
  }

  return { kind: 'unreachable', message: error.message }
}

function snapshotFromProbeError(error: unknown): SessionSnapshot {
  if (!isApiError(error)) {
    return { kind: 'unreachable', message: 'Staffmate could not be reached.' }
  }

  if (error.status === 401 && error.message === 'Session expired.') {
    return { kind: 'expired' }
  }

  if (error.status === 401) {
    return { kind: 'anonymous' }
  }

  if (error.status === 419) {
    return { kind: 'expired' }
  }

  return { kind: 'unreachable', message: error.message }
}
