import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { defaultLandingPath, paths } from '../routing/paths'
import { api, isApiError } from './api'
import { AuthContext, type AuthPhase } from './authContext'
import { isPublicBootPath, routeForSnapshot } from './authRouting'
import { resetEnrollmentSetup } from './enrollment'
import { loadSession, type SessionSnapshot } from './session'
import type { CurrentUser, FieldErrors, SessionHome } from './types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [bootPath] = useState(() => window.location.pathname)
  const [phase, setPhase] = useState<AuthPhase>('loading')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [home, setHome] = useState<SessionHome | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const commitSnapshot = useCallback((snapshot: SessionSnapshot) => {
    setErrorMessage(null)
    setFieldErrors({})

    if (snapshot.kind === 'anonymous') {
      setUser(null)
      setHome(null)
      setRecoveryCodes(null)
      setPhase('anonymous')

      return
    }

    if (snapshot.kind === 'expired') {
      setUser(null)
      setHome(null)
      setRecoveryCodes(null)
      setPhase('expired')

      return
    }

    if (snapshot.kind === 'unreachable') {
      setPhase('error')
      setErrorMessage(snapshot.message)

      return
    }

    setUser(snapshot.user)

    if (snapshot.kind === 'unverified') {
      setHome(null)
      setPhase('unverified')

      return
    }

    if (snapshot.kind === 'enroll') {
      setHome(null)
      setPhase('enroll')

      return
    }

    if (snapshot.kind === 'challenge-required') {
      setHome(null)
      setPhase('challenge-required')

      return
    }

    if (snapshot.kind === 'forbidden') {
      setHome(null)
      setPhase('forbidden')

      return
    }

    setHome(snapshot.home)
    setPhase('ready')
  }, [])

  const applySnapshot = useCallback((
    snapshot: SessionSnapshot,
    options?: { path?: string; navigateTo?: string | null },
  ) => {
    commitSnapshot(snapshot)

    const target =
      options?.navigateTo !== undefined
        ? options.navigateTo
        : routeForSnapshot(snapshot, options?.path ?? pathname)

    if (target !== null) {
      navigate(target, { replace: true })
    }
  }, [commitSnapshot, navigate, pathname])

  useEffect(() => {
    let active = true

    void loadSession().then((snapshot) => {
      if (!active) {
        return
      }

      commitSnapshot(snapshot)

      // Token pages keep their URL so the form stays available, but session
      // state is still restored so an existing login is not wiped.
      if (isPublicBootPath(bootPath)) {
        return
      }

      const target = routeForSnapshot(snapshot, bootPath)

      if (target !== null) {
        navigate(target, { replace: true })
      }
    })

    return () => {
      active = false
    }
  }, [bootPath, commitSnapshot, navigate])

  const refreshSession = useCallback(async () => {
    setPhase('loading')
    const snapshot = await loadSession()
    applySnapshot(snapshot)

    return snapshot
  }, [applySnapshot])

  const clearMessages = useCallback(() => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setFieldErrors({})
  }, [])

  const applyRequestError = useCallback((error: unknown, fallback: string) => {
    if (isApiError(error) && (error.status === 401 || error.status === 419) && error.message === 'Session expired.') {
      setPhase('expired')
      navigate(paths.expired, { replace: true })

      return
    }

    if (isApiError(error) && error.status === 419) {
      setPhase('expired')
      navigate(paths.expired, { replace: true })

      return
    }

    if (isApiError(error)) {
      setFieldErrors(error.errors)
      setErrorMessage(error.message)

      return
    }

    setErrorMessage(fallback)
  }, [navigate])

  const signIn = useCallback(async (email: string, password: string) => {
    setSubmitting(true)
    clearMessages()

    try {
      const body = await api<unknown>('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      if (isRecord(body) && body.two_factor === true) {
        setPhase('challenge-pending')
        navigate(paths.mfaChallenge, { replace: true })

        return
      }

      await refreshSession()
    } catch (error) {
      applyRequestError(error, 'Sign-in failed.')
    } finally {
      setSubmitting(false)
    }
  }, [applyRequestError, clearMessages, navigate, refreshSession])

  const forgotPassword = useCallback(async (email: string) => {
    setSubmitting(true)
    clearMessages()

    try {
      const body = await api<unknown>('/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setSuccessMessage(
        isRecord(body) && typeof body.message === 'string'
          ? body.message
          : 'If an account exists for that address, a reset link has been sent.',
      )
    } catch (error) {
      applyRequestError(error, 'The reset link could not be requested.')
    } finally {
      setSubmitting(false)
    }
  }, [applyRequestError, clearMessages])

  const resetPassword = useCallback(async (
    token: string,
    email: string,
    password: string,
    confirmation: string,
  ) => {
    setSubmitting(true)
    clearMessages()

    try {
      await api('/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          email,
          password,
          password_confirmation: confirmation,
        }),
      })
      setSuccessMessage('Your password has been reset. Sign in with the new password.')
      setPhase('anonymous')
      navigate(paths.login, { replace: true })
    } catch (error) {
      applyRequestError(error, 'The password could not be reset.')
    } finally {
      setSubmitting(false)
    }
  }, [applyRequestError, clearMessages, navigate])

  const acceptInvitation = useCallback(async (
    token: string,
    password: string,
    confirmation: string,
  ) => {
    setSubmitting(true)
    clearMessages()

    try {
      await api('/api/v1/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({
          token,
          password,
          password_confirmation: confirmation,
        }),
      })
      setSuccessMessage('Your invitation was accepted. Sign in to continue.')
      setPhase('anonymous')
      navigate(paths.login, { replace: true })
    } catch (error) {
      applyRequestError(error, 'The invitation could not be accepted.')
    } finally {
      setSubmitting(false)
    }
  }, [applyRequestError, clearMessages, navigate])

  const submitChallenge = useCallback(async (
    payload: { code: string } | { recovery_code: string },
  ) => {
    setSubmitting(true)
    clearMessages()

    try {
      await api('/two-factor-challenge', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      await refreshSession()
    } catch (error) {
      applyRequestError(error, 'The authenticator challenge failed.')
    } finally {
      setSubmitting(false)
    }
  }, [applyRequestError, clearMessages, refreshSession])

  const handleEnrolled = useCallback((codes: string[]) => {
    setRecoveryCodes(codes)
    setPhase('codes')
    navigate(paths.mfaCodes, { replace: true })
  }, [navigate])

  const acknowledgeRecoveryCodes = useCallback(async () => {
    setRecoveryCodes(null)

    if (home !== null) {
      setPhase('ready')
      navigate(defaultLandingPath(home.sections), { replace: true })

      return
    }

    await refreshSession()
  }, [home, navigate, refreshSession])

  const resendVerification = useCallback(async () => {
    setSubmitting(true)
    clearMessages()

    try {
      await api('/email/verification-notification', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setSuccessMessage('A verification link has been sent to your email address.')
    } catch (error) {
      applyRequestError(error, 'The verification email could not be sent.')
    } finally {
      setSubmitting(false)
    }
  }, [applyRequestError, clearMessages])

  const logout = useCallback(async () => {
    setLoggingOut(true)

    try {
      await api('/logout', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    } catch (error) {
      if (!(isApiError(error) && (error.status === 401 || error.status === 419))) {
        setLoggingOut(false)
        setErrorMessage(isApiError(error) ? error.message : 'Sign-out did not complete.')

        return
      }
    }

    resetEnrollmentSetup()
    setRecoveryCodes(null)
    setUser(null)
    setHome(null)
    setErrorMessage(null)
    setSuccessMessage(null)
    setFieldErrors({})
    setLoggingOut(false)
    setPhase('anonymous')
    navigate(paths.login, { replace: true })
  }, [navigate])

  const value = useMemo(() => ({
    phase,
    user,
    home,
    recoveryCodes,
    submitting,
    loggingOut,
    errorMessage,
    successMessage,
    fieldErrors,
    refreshSession,
    signIn,
    forgotPassword,
    resetPassword,
    acceptInvitation,
    submitChallenge,
    handleEnrolled,
    acknowledgeRecoveryCodes,
    resendVerification,
    logout,
    clearMessages,
    applyRequestError,
  }), [
    phase,
    user,
    home,
    recoveryCodes,
    submitting,
    loggingOut,
    errorMessage,
    successMessage,
    fieldErrors,
    refreshSession,
    signIn,
    forgotPassword,
    resetPassword,
    acceptInvitation,
    submitChallenge,
    handleEnrolled,
    acknowledgeRecoveryCodes,
    resendVerification,
    logout,
    clearMessages,
    applyRequestError,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
