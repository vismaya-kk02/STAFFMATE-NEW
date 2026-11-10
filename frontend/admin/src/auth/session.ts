import { api, isApiError } from './api'
import type { AdminHome, CurrentUser, IdentityState } from './types'

export type SessionSnapshot =
  | { kind: 'anonymous' }
  | { kind: 'expired' }
  | { kind: 'unverified'; user: CurrentUser }
  | { kind: 'enroll'; user: CurrentUser }
  | { kind: 'challenge-required'; user: CurrentUser }
  | { kind: 'ready'; user: CurrentUser; home: AdminHome }
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

    try {
      const home = await api<AdminHome>('/api/v1/admin/home')

      return { kind: 'ready', user, home }
    } catch (error) {
      return snapshotFromProtectedError(error, user)
    }
  } catch (error) {
    return snapshotFromProbeError(error)
  }
}

function snapshotFromProtectedError(error: unknown, user: CurrentUser): SessionSnapshot {
  if (!isApiError(error)) {
    return { kind: 'unreachable', message: 'The Admin service could not be reached.' }
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
    return { kind: 'unreachable', message: 'The Admin service could not be reached.' }
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
