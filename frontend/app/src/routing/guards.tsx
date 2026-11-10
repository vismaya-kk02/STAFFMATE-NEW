import { CircularProgress } from '@mui/material'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { defaultLandingPath, paths } from './paths'

/** Guest-only auth pages (login / forgot). Ready users are sent to their landing. */
export function GuestRoute() {
  const { phase, home } = useAuth()

  if (phase === 'loading') {
    return <CircularProgress aria-label="Loading session" />
  }

  if (phase === 'ready' && home !== null) {
    return <Navigate to={defaultLandingPath(home.sections)} replace />
  }

  if (phase === 'challenge-pending') {
    return <Navigate to={paths.mfaChallenge} replace />
  }

  if (phase === 'enroll') {
    return <Navigate to={paths.mfaEnroll} replace />
  }

  if (phase === 'unverified') {
    return <Navigate to={paths.mfaUnverified} replace />
  }

  if (phase === 'challenge-required') {
    return <Navigate to={paths.mfaChallengeRequired} replace />
  }

  if (phase === 'codes') {
    return <Navigate to={paths.mfaCodes} replace />
  }

  if (phase === 'forbidden') {
    return <Navigate to={paths.forbidden} replace />
  }

  return <Outlet />
}

/** Requires a ready session with home + section access for admin routes. */
export function RequireAdmin() {
  const { phase, home } = useAuth()

  if (phase === 'loading') {
    return <CircularProgress aria-label="Loading session" />
  }

  if (phase !== 'ready' || home === null) {
    return <Navigate to={redirectForIncompletePhase(phase)} replace />
  }

  if (!home.sections.admin) {
    return <Navigate to={home.sections.crm ? paths.crm : paths.forbidden} replace />
  }

  return <Outlet />
}

export function RequireCrm() {
  const { phase, home } = useAuth()

  if (phase === 'loading') {
    return <CircularProgress aria-label="Loading session" />
  }

  if (phase !== 'ready' || home === null) {
    return <Navigate to={redirectForIncompletePhase(phase)} replace />
  }

  if (!home.sections.crm) {
    return <Navigate to={home.sections.admin ? paths.admin : paths.forbidden} replace />
  }

  return <Outlet />
}

export function RequirePermission({ permission }: { permission: string }) {
  const { home } = useAuth()

  if (home === null || !home.permissions.includes(permission)) {
    return <Navigate to={paths.admin} replace />
  }

  return <Outlet />
}

function redirectForIncompletePhase(phase: string): string {
  switch (phase) {
    case 'anonymous':
      return paths.login
    case 'expired':
      return paths.expired
    case 'error':
      return paths.unavailable
    case 'unverified':
      return paths.mfaUnverified
    case 'enroll':
      return paths.mfaEnroll
    case 'challenge-required':
      return paths.mfaChallengeRequired
    case 'challenge-pending':
      return paths.mfaChallenge
    case 'codes':
      return paths.mfaCodes
    case 'forbidden':
      return paths.forbidden
    default:
      return paths.login
  }
}
