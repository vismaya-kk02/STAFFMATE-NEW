export const paths = {
  root: '/',
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: (token: string) => `/reset-password/${encodeURIComponent(token)}`,
  acceptInvitation: (token: string) => `/accept-invitation/${encodeURIComponent(token)}`,
  mfaChallenge: '/mfa/challenge',
  mfaRecovery: '/mfa/recovery',
  mfaEnroll: '/mfa/enroll',
  mfaCodes: '/mfa/recovery-codes',
  mfaUnverified: '/mfa/verify-email',
  mfaChallengeRequired: '/mfa/challenge-required',
  forbidden: '/forbidden',
  expired: '/expired',
  unavailable: '/unavailable',
  admin: '/admin',
  adminEmployees: '/admin/employees',
  adminRoles: '/admin/roles',
  crm: '/crm',
} as const

export function defaultLandingPath(sections: { admin: boolean; crm: boolean }): string {
  if (sections.admin) {
    return paths.admin
  }

  if (sections.crm) {
    return paths.crm
  }

  return paths.forbidden
}
