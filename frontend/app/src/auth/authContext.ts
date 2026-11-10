import { createContext } from 'react'
import type { CurrentUser, FieldErrors, SessionHome } from './types'
import type { SessionSnapshot } from './session'

export type AuthPhase =
  | 'loading'
  | 'anonymous'
  | 'expired'
  | 'error'
  | 'unverified'
  | 'enroll'
  | 'challenge-required'
  | 'challenge-pending'
  | 'codes'
  | 'forbidden'
  | 'ready'

export type AuthContextValue = {
  phase: AuthPhase
  user: CurrentUser | null
  home: SessionHome | null
  recoveryCodes: string[] | null
  submitting: boolean
  loggingOut: boolean
  errorMessage: string | null
  successMessage: string | null
  fieldErrors: FieldErrors
  refreshSession: () => Promise<SessionSnapshot>
  signIn: (email: string, password: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, email: string, password: string, confirmation: string) => Promise<void>
  acceptInvitation: (token: string, password: string, confirmation: string) => Promise<void>
  submitChallenge: (payload: { code: string } | { recovery_code: string }) => Promise<void>
  handleEnrolled: (codes: string[]) => void
  acknowledgeRecoveryCodes: () => Promise<void>
  resendVerification: () => Promise<void>
  logout: () => Promise<void>
  clearMessages: () => void
  applyRequestError: (error: unknown, fallback: string) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
