import { api, isApiError } from './api'
import type { CrmHome, CurrentUser, IdentityState } from './types'

export type SessionSnapshot =
  | { kind: 'anonymous' }
  | { kind: 'expired' }
  | { kind: 'unverified'; user: CurrentUser }
  | { kind: 'enroll'; user: CurrentUser }
  | { kind: 'challenge-required'; user: CurrentUser }
  | { kind: 'ready'; user: CurrentUser; home: CrmHome }
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

    try {
      const home = await api<CrmHome>('/api/v1/crm/home')

      return { kind: 'ready', user, home }
    } catch (error) {
      return snapshotFromError(error, user)
    }
  } catch (error) {
    return snapshotFromError(error, null)
  }
}

function snapshotFromError(error: unknown, user: CurrentUser | null): SessionSnapshot {
  if (!isApiError(error)) {
    return { kind: 'unreachable', message: 'The CRM service could not be reached.' }
  }

  if (error.status === 401 && error.message === 'Session expired.') {
    return { kind: 'expired' }
  }

  if (error.status === 401 || error.status === 419) {
    return error.status === 419 ? { kind: 'expired' } : { kind: 'anonymous' }
  }

  if (user !== null && error.status === 403 && error.reason === 'email') {
    return { kind: 'unverified', user }
  }

  if (user !== null && error.status === 403 && error.reason === 'enrollment') {
    return { kind: 'enroll', user }
  }

  if (user !== null && error.status === 403 && error.reason === 'challenge') {
    return { kind: 'challenge-required', user }
  }

  return { kind: 'unreachable', message: error.message }
}
