import { defaultLandingPath, paths } from '../routing/paths'
import type { SessionSnapshot } from './session'

/** Tokenized guest flows that boot without probing /api/v1/me. */
export function isPublicBootPath(pathname: string): boolean {
  return (
    pathname.startsWith('/reset-password/') ||
    pathname.startsWith('/accept-invitation/')
  )
}

export function isGuestAuthPath(pathname: string): boolean {
  return (
    pathname === paths.login ||
    pathname === paths.forgotPassword ||
    pathname.startsWith('/reset-password/') ||
    pathname.startsWith('/accept-invitation/')
  )
}

/** Where to send the user after a session snapshot, or null to stay put. */
export function routeForSnapshot(snapshot: SessionSnapshot, currentPath: string): string | null {
  switch (snapshot.kind) {
    case 'anonymous':
      return isGuestAuthPath(currentPath) ? null : paths.login
    case 'expired':
      return currentPath === paths.expired || currentPath === paths.login ? null : paths.expired
    case 'unreachable':
      return currentPath === paths.unavailable ? null : paths.unavailable
    case 'unverified':
      return currentPath === paths.mfaUnverified ? null : paths.mfaUnverified
    case 'enroll':
      return currentPath === paths.mfaEnroll || currentPath === paths.mfaCodes
        ? null
        : paths.mfaEnroll
    case 'challenge-required':
      return currentPath === paths.mfaChallengeRequired ? null : paths.mfaChallengeRequired
    case 'forbidden':
      return currentPath === paths.forbidden ? null : paths.forbidden
    case 'ready': {
      const landing = defaultLandingPath(snapshot.home.sections)
      if (
        currentPath === paths.root ||
        isGuestAuthPath(currentPath) ||
        currentPath.startsWith('/mfa/') ||
        currentPath === paths.expired ||
        currentPath === paths.unavailable ||
        currentPath === paths.forbidden
      ) {
        return landing
      }

      if (currentPath.startsWith('/admin') && !snapshot.home.sections.admin) {
        return snapshot.home.sections.crm ? paths.crm : paths.forbidden
      }

      if (currentPath.startsWith('/crm') && !snapshot.home.sections.crm) {
        return snapshot.home.sections.admin ? paths.admin : paths.forbidden
      }

      return null
    }
    default:
      return null
  }
}
