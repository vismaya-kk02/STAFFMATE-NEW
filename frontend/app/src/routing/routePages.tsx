import { CircularProgress } from '@mui/material'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AcceptInvitationPage } from '../pages/AcceptInvitationPage'
import { DashboardPage } from '../pages/DashboardPage'
import { EmployeesPage } from '../pages/EmployeesPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { MfaChallengePage } from '../pages/MfaChallengePage'
import { MfaEnrollPage } from '../pages/MfaEnrollPage'
import { RecoveryCodesPage } from '../pages/RecoveryCodesPage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import { RolesPage } from '../pages/RolesPage'
import { SignInPage } from '../pages/SignInPage'
import { StatusPage } from '../pages/StatusPage'
import { defaultLandingPath, paths } from './paths'

const productName = 'Staffmate'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()

  return (
    <SignInPage
      productName={productName}
      submitting={auth.submitting}
      errorMessage={auth.errorMessage}
      notice={auth.successMessage}
      fieldErrors={auth.fieldErrors}
      onSubmit={(email, password) => {
        void auth.signIn(email, password)
      }}
      onForgotPassword={() => {
        auth.clearMessages()
        navigate(paths.forgotPassword)
      }}
    />
  )
}

export function ForgotPasswordRoute() {
  const auth = useAuth()
  const navigate = useNavigate()

  return (
    <ForgotPasswordPage
      submitting={auth.submitting}
      errorMessage={auth.errorMessage}
      successMessage={auth.successMessage}
      fieldErrors={auth.fieldErrors}
      onSubmit={(email) => {
        void auth.forgotPassword(email)
      }}
      onBack={() => {
        auth.clearMessages()
        navigate(paths.login)
      }}
    />
  )
}

export function ResetPasswordRoute() {
  const auth = useAuth()
  const { token = '' } = useParams()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''

  if (token === '') {
    return <Navigate to={paths.login} replace />
  }

  return (
    <ResetPasswordPage
      email={email}
      submitting={auth.submitting}
      errorMessage={auth.errorMessage}
      fieldErrors={auth.fieldErrors}
      onSubmit={(nextEmail, password, confirmation) => {
        void auth.resetPassword(token, nextEmail, password, confirmation)
      }}
    />
  )
}

export function AcceptInvitationRoute() {
  const auth = useAuth()
  const { token = '' } = useParams()

  if (token === '') {
    return <Navigate to={paths.login} replace />
  }

  return (
    <AcceptInvitationPage
      submitting={auth.submitting}
      errorMessage={auth.errorMessage}
      fieldErrors={auth.fieldErrors}
      onSubmit={(password, confirmation) => {
        void auth.acceptInvitation(token, password, confirmation)
      }}
    />
  )
}

export function MfaChallengeRoute({ mode }: { mode: 'code' | 'recovery' }) {
  const auth = useAuth()
  const navigate = useNavigate()

  return (
    <MfaChallengePage
      key={mode}
      mode={mode}
      submitting={auth.submitting}
      errorMessage={auth.errorMessage}
      fieldErrors={auth.fieldErrors}
      onSubmitCode={(code) => {
        void auth.submitChallenge({ code })
      }}
      onSubmitRecovery={(recoveryCode) => {
        void auth.submitChallenge({ recovery_code: recoveryCode })
      }}
      onUseRecovery={() => {
        auth.clearMessages()
        navigate(paths.mfaRecovery)
      }}
      onUseCode={() => {
        auth.clearMessages()
        navigate(paths.mfaChallenge)
      }}
    />
  )
}

export function MfaEnrollRoute() {
  const auth = useAuth()

  return (
    <MfaEnrollPage
      onEnrolled={(codes) => {
        auth.handleEnrolled(codes)
      }}
    />
  )
}

export function MfaCodesRoute() {
  const auth = useAuth()

  if (auth.recoveryCodes === null) {
    return <Navigate to={paths.mfaEnroll} replace />
  }

  return (
    <RecoveryCodesPage
      codes={auth.recoveryCodes}
      onAcknowledge={() => {
        void auth.acknowledgeRecoveryCodes()
      }}
    />
  )
}

export function UnverifiedRoute() {
  const auth = useAuth()

  return (
    <StatusPage
      title="Verify your email"
      severity="warning"
      message={
        auth.successMessage ??
        `Sign-in for ${auth.user?.email ?? 'this account'} is waiting on email verification. Protected pages stay closed until the address is verified.`
      }
      actionLabel={auth.submitting ? 'Sending…' : 'Resend verification email'}
      onAction={() => {
        void auth.resendVerification()
      }}
      busy={auth.submitting}
    />
  )
}

export function ChallengeRequiredRoute() {
  const auth = useAuth()

  return (
    <StatusPage
      title="Authenticator required"
      severity="warning"
      message="This session has not completed the authenticator challenge. Sign out and sign in again. A password alone does not open Staffmate."
      actionLabel="Sign out"
      onAction={() => {
        void auth.logout()
      }}
      busy={auth.loggingOut}
    />
  )
}

export function ForbiddenRoute() {
  return (
    <StatusPage
      title="No Staffmate sections available"
      severity="warning"
      message="This account is signed in but has no Admin or CRM permissions. Ask a Super Admin to grant access, then sign in again."
    />
  )
}

export function ExpiredRoute() {
  const auth = useAuth()
  const navigate = useNavigate()

  return (
    <StatusPage
      title="Session expired"
      severity="warning"
      message="Your session is no longer valid. Sign in again."
      actionLabel="Return to sign-in"
      onAction={() => {
        auth.clearMessages()
        navigate(paths.login)
      }}
    />
  )
}

export function UnavailableRoute() {
  const auth = useAuth()

  return (
    <StatusPage
      title="Staffmate is unavailable"
      severity="error"
      message={auth.errorMessage ?? 'Staffmate could not be reached.'}
      actionLabel="Try again"
      onAction={() => {
        void auth.refreshSession()
      }}
    />
  )
}

export function AdminHomeRoute() {
  const { home } = useAuth()

  if (home === null) {
    return null
  }

  return <DashboardPage home={home} />
}

export function AdminEmployeesRoute() {
  const { home } = useAuth()

  if (home === null) {
    return null
  }

  return <EmployeesPage home={home} />
}

export function AdminRolesRoute() {
  const { home } = useAuth()

  if (home === null) {
    return null
  }

  return <RolesPage home={home} />
}

export function RootRedirect() {
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

  if (phase === 'expired') {
    return <Navigate to={paths.expired} replace />
  }

  if (phase === 'error') {
    return <Navigate to={paths.unavailable} replace />
  }

  return <Navigate to={paths.login} replace />
}

export function NotFoundRoute() {
  const { phase, home } = useAuth()

  if (phase === 'loading') {
    return <CircularProgress aria-label="Loading session" />
  }

  if (phase === 'ready' && home !== null) {
    return <Navigate to={defaultLandingPath(home.sections)} replace />
  }

  return <Navigate to={paths.login} replace />
}
