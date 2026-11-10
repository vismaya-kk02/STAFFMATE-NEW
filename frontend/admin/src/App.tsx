import { Alert, CircularProgress, CssBaseline, ThemeProvider } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { api, isApiError } from './auth/api'
import { resetEnrollmentSetup } from './auth/enrollment'
import { loadSession, type SessionSnapshot } from './auth/session'
import type { AdminHome, CurrentUser, FieldErrors } from './auth/types'
import { AppShell } from './components/AppShell'
import { AdminWorkspace } from './pages/AdminWorkspace'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { MfaChallengePage } from './pages/MfaChallengePage'
import { MfaEnrollPage } from './pages/MfaEnrollPage'
import { RecoveryCodesPage } from './pages/RecoveryCodesPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SignInPage } from './pages/SignInPage'
import { StatusPage } from './pages/StatusPage'
import { theme } from './theme'

const productName = 'Staffmate Admin'

type Screen =
  | 'loading'
  | 'sign-in'
  | 'forgot'
  | 'reset'
  | 'challenge'
  | 'recovery'
  | 'enroll'
  | 'codes'
  | 'unverified'
  | 'challenge-required'
  | 'dashboard'
  | 'forbidden'
  | 'expired'
  | 'error'

type ResetRequest = {
  token: string
  email: string
}

export function App() {
  const [resetRequest] = useState(resetRequestFromLocation)
  const [screen, setScreen] = useState<Screen>(resetRequest ? 'reset' : 'loading')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [home, setHome] = useState<AdminHome | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const applySnapshot = useCallback((snapshot: SessionSnapshot) => {
    setErrorMessage(null)
    setFieldErrors({})

    if (snapshot.kind === 'anonymous') {
      setUser(null)
      setHome(null)
      setScreen('sign-in')

      return
    }

    if (snapshot.kind === 'expired') {
      setUser(null)
      setHome(null)
      setScreen('expired')

      return
    }

    if (snapshot.kind === 'unreachable') {
      setScreen('error')
      setErrorMessage(snapshot.message)

      return
    }

    setUser(snapshot.user)

    if (snapshot.kind === 'unverified') {
      setScreen('unverified')

      return
    }

    if (snapshot.kind === 'enroll') {
      setScreen('enroll')

      return
    }

    if (snapshot.kind === 'challenge-required') {
      setScreen('challenge-required')

      return
    }

    if (snapshot.kind === 'forbidden') {
      setScreen('forbidden')

      return
    }

    setHome(snapshot.home)
    setScreen('dashboard')
  }, [])

  useEffect(() => {
    if (resetRequest !== null) {
      return
    }

    let active = true

    void loadSession().then((snapshot) => {
      if (active) {
        applySnapshot(snapshot)
      }
    })

    return () => {
      active = false
    }
  }, [applySnapshot, resetRequest])

  async function refreshSession() {
    setScreen('loading')
    applySnapshot(await loadSession())
  }

  async function handleSignIn(email: string, password: string) {
    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    setFieldErrors({})

    try {
      const body = await api<unknown>('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      if (isRecord(body) && body.two_factor === true) {
        setScreen('challenge')

        return
      }

      await refreshSession()
    } catch (error) {
      applyRequestError(error, 'Sign-in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgot(email: string) {
    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    setFieldErrors({})

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
  }

  async function handleReset(email: string, password: string, passwordConfirmation: string) {
    if (resetRequest === null) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setFieldErrors({})

    try {
      await api('/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: resetRequest.token,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      })
      window.history.replaceState({}, '', '/')
      setSuccessMessage('Your password has been reset. Sign in with the new password.')
      setScreen('sign-in')
    } catch (error) {
      applyRequestError(error, 'The password could not be reset.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleChallenge(code: string) {
    await submitChallenge({ code })
  }

  async function handleRecovery(recoveryCode: string) {
    await submitChallenge({ recovery_code: recoveryCode })
  }

  async function submitChallenge(payload: { code: string } | { recovery_code: string }) {
    setSubmitting(true)
    setErrorMessage(null)
    setFieldErrors({})

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
  }

  function handleEnrolled(codes: string[]) {
    setRecoveryCodes(codes)
    setScreen('codes')
  }

  async function handleAcknowledge() {
    setRecoveryCodes(null)

    if (home !== null) {
      setScreen('dashboard')

      return
    }

    await refreshSession()
  }

  async function handleResendVerification() {
    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

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
  }

  async function handleLogout() {
    setLoggingOut(true)

    try {
      await api('/logout', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      finishSignOut()
    } catch (error) {
      if (isApiError(error) && (error.status === 401 || error.status === 419)) {
        finishSignOut()

        return
      }

      setLoggingOut(false)
      setErrorMessage(isApiError(error) ? error.message : 'Sign-out did not complete.')
    }
  }

  function finishSignOut() {
    resetEnrollmentSetup()
    setRecoveryCodes(null)
    setUser(null)
    setHome(null)
    setErrorMessage(null)
    setSuccessMessage(null)
    setFieldErrors({})
    setLoggingOut(false)
    setScreen('sign-in')
  }

  function applyRequestError(error: unknown, fallback: string) {
    if (isApiError(error) && (error.status === 401 || error.status === 419) && error.message === 'Session expired.') {
      setScreen('expired')

      return
    }

    if (isApiError(error) && error.status === 419) {
      setScreen('expired')

      return
    }

    if (isApiError(error)) {
      setFieldErrors(error.errors)
      setErrorMessage(error.message)

      return
    }

    setErrorMessage(fallback)
  }

  const authenticated =
    screen === 'enroll' ||
    screen === 'codes' ||
    screen === 'unverified' ||
    screen === 'challenge-required' ||
    screen === 'dashboard' ||
    screen === 'forbidden'

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell
      productName={productName}
      align={screen === 'dashboard' ? 'start' : 'center'}
      banner={
        authenticated && errorMessage ? (
          <Alert severity="error" sx={{ width: '100%', maxWidth: screen === 'dashboard' ? 720 : 440, mb: 2 }}>
            {errorMessage}
          </Alert>
        ) : null
      }
      onLogout={authenticated ? () => void handleLogout() : undefined}
      loggingOut={loggingOut}
    >
      {screen === 'loading' ? <CircularProgress aria-label="Loading session" /> : null}
      {screen === 'sign-in' ? (
        <SignInPage
          productName={productName}
          submitting={submitting}
          errorMessage={errorMessage}
          notice={successMessage}
          fieldErrors={fieldErrors}
          onSubmit={(email, password) => {
            void handleSignIn(email, password)
          }}
          onForgotPassword={() => {
            setErrorMessage(null)
            setFieldErrors({})
            setScreen('forgot')
          }}
        />
      ) : null}
      {screen === 'forgot' ? (
        <ForgotPasswordPage
          submitting={submitting}
          errorMessage={errorMessage}
          successMessage={successMessage}
          fieldErrors={fieldErrors}
          onSubmit={(email) => {
            void handleForgot(email)
          }}
          onBack={() => {
            setErrorMessage(null)
            setSuccessMessage(null)
            setFieldErrors({})
            setScreen('sign-in')
          }}
        />
      ) : null}
      {screen === 'reset' && resetRequest ? (
        <ResetPasswordPage
          email={resetRequest.email}
          submitting={submitting}
          errorMessage={errorMessage}
          fieldErrors={fieldErrors}
          onSubmit={(email, password, confirmation) => {
            void handleReset(email, password, confirmation)
          }}
        />
      ) : null}
      {screen === 'challenge' || screen === 'recovery' ? (
        <MfaChallengePage
          key={screen}
          mode={screen === 'recovery' ? 'recovery' : 'code'}
          submitting={submitting}
          errorMessage={errorMessage}
          fieldErrors={fieldErrors}
          onSubmitCode={(code) => {
            void handleChallenge(code)
          }}
          onSubmitRecovery={(recoveryCode) => {
            void handleRecovery(recoveryCode)
          }}
          onUseRecovery={() => {
            setErrorMessage(null)
            setFieldErrors({})
            setScreen('recovery')
          }}
          onUseCode={() => {
            setErrorMessage(null)
            setFieldErrors({})
            setScreen('challenge')
          }}
        />
      ) : null}
      {screen === 'enroll' ? (
        <MfaEnrollPage
          onEnrolled={(codes) => {
            handleEnrolled(codes)
          }}
        />
      ) : null}
      {screen === 'codes' && recoveryCodes !== null ? (
        <RecoveryCodesPage
          codes={recoveryCodes}
          onAcknowledge={() => {
            void handleAcknowledge()
          }}
        />
      ) : null}
      {screen === 'dashboard' && home !== null ? <AdminWorkspace home={home} /> : null}
      {screen === 'unverified' ? (
        <StatusPage
          title="Verify your email"
          severity="warning"
          message={
            successMessage ??
            `Sign-in for ${user?.email ?? 'this account'} is waiting on email verification. Protected Admin pages stay closed until the address is verified.`
          }
          actionLabel={submitting ? 'Sending…' : 'Resend verification email'}
          onAction={() => {
            void handleResendVerification()
          }}
          busy={submitting}
        />
      ) : null}
      {screen === 'challenge-required' ? (
        <StatusPage
          title="Authenticator required"
          severity="warning"
          message="This session has not completed the authenticator challenge. Sign out and sign in again. A password alone does not open Admin."
          actionLabel="Sign out"
          onAction={() => {
            void handleLogout()
          }}
          busy={loggingOut}
        />
      ) : null}
      {screen === 'forbidden' ? (
        <StatusPage
          title="Admin access is not available"
          severity="warning"
          message="This account does not have an administrative role. Sign out and use Staffmate CRM for employee work."
        />
      ) : null}
      {screen === 'expired' ? (
        <StatusPage
          title="Session expired"
          severity="warning"
          message="Your session is no longer valid. Sign in again."
          actionLabel="Return to sign-in"
          onAction={() => {
            setErrorMessage(null)
            setScreen('sign-in')
          }}
        />
      ) : null}
      {screen === 'error' ? (
        <StatusPage
          title="Admin is unavailable"
          severity="error"
          message={errorMessage ?? 'The Admin service could not be reached.'}
          actionLabel="Try again"
          onAction={() => {
            void refreshSession()
          }}
        />
      ) : null}
    </AppShell>
    </ThemeProvider>
  )
}

function resetRequestFromLocation(): ResetRequest | null {
  const match = window.location.pathname.match(/^\/reset-password\/([^/]+)\/?$/)

  if (match === null) {
    return null
  }

  const token = decodeURIComponent(match[1] ?? '')
  const email = new URLSearchParams(window.location.search).get('email') ?? ''

  if (token === '') {
    return null
  }

  return { token, email }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
