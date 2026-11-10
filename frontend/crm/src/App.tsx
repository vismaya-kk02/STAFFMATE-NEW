import { CircularProgress, CssBaseline, ThemeProvider } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { api, isApiError } from './auth/api'
import { resetEnrollmentSetup } from './auth/enrollment'
import { loadSession, type SessionSnapshot } from './auth/session'
import type { CrmHome, CurrentUser, FieldErrors } from './auth/types'
import { AppShell } from './components/AppShell'
import {
  AcceptScreen,
  ChallengeScreen,
  EnrollScreen,
  ForgotScreen,
  HomeScreen,
  MessageScreen,
  RecoveryScreen,
  ResetScreen,
  SignInScreen,
} from './pages/CrmScreens'
import { theme } from './theme'

const productName = 'Staffmate CRM'

type Screen =
  | 'loading'
  | 'sign-in'
  | 'forgot'
  | 'reset'
  | 'accept'
  | 'challenge'
  | 'recovery'
  | 'enroll'
  | 'codes'
  | 'unverified'
  | 'challenge-required'
  | 'home'
  | 'expired'
  | 'error'

export function App() {
  const [resetRequest] = useState(readReset)
  const [invitationToken] = useState(readInvitation)
  const [screen, setScreen] = useState<Screen>(invitationToken ? 'accept' : resetRequest ? 'reset' : 'loading')
  const [home, setHome] = useState<CrmHome | null>(null)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const applySnapshot = useCallback((snapshot: SessionSnapshot) => {
    setErrorMessage(null)
    setFieldErrors({})

    if (snapshot.kind === 'anonymous') {
      setScreen('sign-in')
      return
    }
    if (snapshot.kind === 'expired') {
      setScreen('expired')
      return
    }
    if (snapshot.kind === 'unreachable') {
      setErrorMessage(snapshot.message)
      setScreen('error')
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

    setHome(snapshot.home)
    setScreen('home')
  }, [])

  useEffect(() => {
    if (invitationToken !== null || resetRequest !== null) {
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
  }, [applySnapshot, invitationToken, resetRequest])

  async function refresh() {
    setScreen('loading')
    applySnapshot(await loadSession())
  }

  async function signIn(email: string, password: string) {
    setSubmitting(true)
    setErrorMessage(null)
    setFieldErrors({})
    setNotice(null)

    try {
      const body = await api<unknown>('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      if (isRecord(body) && body.two_factor === true) {
        setScreen('challenge')
        return
      }

      await refresh()
    } catch (error) {
      showError(error, 'Sign-in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function challenge(payload: { code: string } | { recovery_code: string }) {
    setSubmitting(true)
    setErrorMessage(null)
    setFieldErrors({})

    try {
      await api('/two-factor-challenge', { method: 'POST', body: JSON.stringify(payload) })
      await refresh()
    } catch (error) {
      showError(error, 'The authenticator challenge failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function accept(password: string, confirmation: string) {
    if (invitationToken === null) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setFieldErrors({})

    try {
      await api('/api/v1/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({
          token: invitationToken,
          password,
          password_confirmation: confirmation,
        }),
      })
      window.history.replaceState({}, '', '/')
      setNotice('Your password is saved. Sign in and enroll an authenticator.')
      setScreen('sign-in')
    } catch (error) {
      showError(error, 'The invitation could not be accepted.')
    } finally {
      setSubmitting(false)
    }
  }

  async function forgot(email: string) {
    setSubmitting(true)
    setErrorMessage(null)
    setNotice(null)

    try {
      const body = await api<unknown>('/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setNotice(isRecord(body) && typeof body.message === 'string' ? body.message : 'If an account exists for that address, a reset link has been sent.')
    } catch (error) {
      showError(error, 'The reset link could not be requested.')
    } finally {
      setSubmitting(false)
    }
  }

  async function resetPassword(email: string, password: string, confirmation: string) {
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
          password_confirmation: confirmation,
        }),
      })
      window.history.replaceState({}, '', '/')
      setNotice('Your password has been reset. Sign in with the new password.')
      setScreen('sign-in')
    } catch (error) {
      showError(error, 'The password could not be reset.')
    } finally {
      setSubmitting(false)
    }
  }

  async function logout() {
    setLoggingOut(true)

    try {
      await api('/logout', { method: 'POST', body: JSON.stringify({}) })
    } catch (error) {
      if (!isApiError(error) || (error.status !== 401 && error.status !== 419)) {
        setLoggingOut(false)
        setErrorMessage(isApiError(error) ? error.message : 'Sign-out did not complete.')
        return
      }
    }

    resetEnrollmentSetup()
    setCodes(null)
    setHome(null)
    setUser(null)
    setErrorMessage(null)
    setNotice(null)
    setFieldErrors({})
    setLoggingOut(false)
    setScreen('sign-in')
  }

  function showError(error: unknown, fallback: string) {
    if (isApiError(error) && (error.status === 419 || error.message === 'Session expired.')) {
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

  const authenticated = screen === 'enroll' || screen === 'codes' || screen === 'unverified' || screen === 'challenge-required' || screen === 'home'

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell
        productName={productName}
        align={screen === 'home' ? 'start' : 'center'}
        onLogout={authenticated ? () => void logout() : undefined}
        loggingOut={loggingOut}
      >
        {screen === 'loading' ? <CircularProgress aria-label="Loading session" /> : null}
        {screen === 'sign-in' ? (
          <SignInScreen
            submitting={submitting}
            errorMessage={errorMessage}
            notice={notice}
            fieldErrors={fieldErrors}
            onSubmit={(email, password) => void signIn(email, password)}
            onForgot={() => { setErrorMessage(null); setNotice(null); setScreen('forgot') }}
          />
        ) : null}
        {screen === 'forgot' ? (
          <ForgotScreen
            submitting={submitting}
            errorMessage={errorMessage}
            notice={notice}
            onSubmit={(email) => void forgot(email)}
            onBack={() => setScreen('sign-in')}
          />
        ) : null}
        {screen === 'reset' && resetRequest ? (
          <ResetScreen
            email={resetRequest.email}
            submitting={submitting}
            errorMessage={errorMessage}
            fieldErrors={fieldErrors}
            onSubmit={(email, password, confirmation) => void resetPassword(email, password, confirmation)}
          />
        ) : null}
        {screen === 'accept' ? (
          <AcceptScreen
            submitting={submitting}
            errorMessage={errorMessage}
            fieldErrors={fieldErrors}
            onSubmit={(password, confirmation) => void accept(password, confirmation)}
          />
        ) : null}
        {screen === 'challenge' || screen === 'recovery' ? (
          <ChallengeScreen
            key={screen}
            mode={screen === 'recovery' ? 'recovery' : 'code'}
            submitting={submitting}
            errorMessage={errorMessage}
            fieldErrors={fieldErrors}
            onCode={(code) => void challenge({ code })}
            onRecovery={(code) => void challenge({ recovery_code: code })}
            onSwitch={() => setScreen(screen === 'recovery' ? 'challenge' : 'recovery')}
          />
        ) : null}
        {screen === 'enroll' ? <EnrollScreen onEnrolled={(next) => { setCodes(next); setScreen('codes') }} /> : null}
        {screen === 'codes' && codes !== null ? <RecoveryScreen codes={codes} onDone={() => void refresh()} /> : null}
        {screen === 'home' && home !== null ? <HomeScreen home={home} /> : null}
        {screen === 'unverified' ? <MessageScreen title="Verify your email" message={`Sign-in for ${user?.email ?? 'this account'} is waiting on email verification.`} /> : null}
        {screen === 'challenge-required' ? <MessageScreen title="Authenticator required" message="This session has not completed the authenticator challenge. Sign out and sign in again." action="Sign out" onAction={() => void logout()} /> : null}
        {screen === 'expired' ? <MessageScreen title="Session expired" message="Your session is no longer valid. Sign in again." action="Return to sign-in" onAction={() => setScreen('sign-in')} /> : null}
        {screen === 'error' ? <MessageScreen title="CRM is unavailable" message={errorMessage ?? 'The CRM service could not be reached.'} action="Try again" onAction={() => void refresh()} /> : null}
      </AppShell>
    </ThemeProvider>
  )
}

function readReset(): { token: string; email: string } | null {
  const match = window.location.pathname.match(/^\/reset-password\/([^/]+)\/?$/)

  if (match === null) {
    return null
  }

  const token = decodeURIComponent(match[1] ?? '')

  if (token === '') {
    return null
  }

  return { token, email: new URLSearchParams(window.location.search).get('email') ?? '' }
}

function readInvitation(): string | null {
  const match = window.location.pathname.match(/^\/accept-invitation\/([^/]+)\/?$/)

  if (match === null) {
    return null
  }

  const token = decodeURIComponent(match[1] ?? '')

  return token === '' ? null : token
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
