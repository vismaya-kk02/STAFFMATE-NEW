import { Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, Link, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useState, type FormEvent } from 'react'
import { isApiError } from '../auth/api'
import { beginEnrollment, confirmEnrollment, confirmPassword, resetEnrollmentSetup, type EnrollmentSetup } from '../auth/enrollment'
import type { CrmHome, FieldErrors } from '../auth/types'
import { FormCard } from '../components/FormCard'

export function SignInScreen(props: {
  submitting: boolean
  errorMessage: string | null
  notice: string | null
  fieldErrors: FieldErrors
  onSubmit: (email: string, password: string) => void
  onForgot: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)

  return (
    <FormCard title="Staffmate CRM sign-in" description="Use the email and password for your Staffmate employee account.">
      {props.notice ? <Alert severity="success" sx={{ mb: 2 }}>{props.notice}</Alert> : null}
      {props.errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{props.errorMessage}</Alert> : null}
      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (email.trim() === '' || password === '') {
            setClientError('Enter your email address and password.')
            return
          }
          setClientError(null)
          props.onSubmit(email.trim(), password)
        }}
      >
        <TextField label="Email" type="email" name="email" autoComplete="username" required fullWidth margin="normal" value={email} onChange={(event) => setEmail(event.target.value)} error={clientError !== null || (props.fieldErrors.email?.length ?? 0) > 0} helperText={clientError ?? props.fieldErrors.email?.[0] ?? ' '} />
        <TextField label="Password" type="password" name="password" autoComplete="current-password" required fullWidth margin="normal" value={password} onChange={(event) => setPassword(event.target.value)} error={(props.fieldErrors.password?.length ?? 0) > 0} helperText={props.fieldErrors.password?.[0] ?? ' '} />
        <Button type="submit" variant="contained" fullWidth disabled={props.submitting} sx={{ mt: 2 }}>{props.submitting ? 'Signing in…' : 'Sign in'}</Button>
      </Box>
      <Link component="button" type="button" onClick={props.onForgot} sx={{ mt: 2 }}>Forgot your password?</Link>
    </FormCard>
  )
}

export function ForgotScreen(props: {
  submitting: boolean
  errorMessage: string | null
  notice: string | null
  onSubmit: (email: string) => void
  onBack: () => void
}) {
  const [email, setEmail] = useState('')

  return (
    <FormCard title="Reset your password" description="If an account exists for that address, a reset link will be sent.">
      {props.notice ? <Alert severity="success" sx={{ mb: 2 }}>{props.notice}</Alert> : null}
      {props.errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{props.errorMessage}</Alert> : null}
      <Box component="form" onSubmit={(event) => { event.preventDefault(); props.onSubmit(email.trim()) }}>
        <TextField label="Email" type="email" name="email" autoComplete="username" required fullWidth margin="normal" value={email} onChange={(event) => setEmail(event.target.value)} />
        <Button type="submit" variant="contained" fullWidth disabled={props.submitting} sx={{ mt: 2 }}>Send reset link</Button>
      </Box>
      <Link component="button" type="button" onClick={props.onBack} sx={{ mt: 2 }}>Back to sign-in</Link>
    </FormCard>
  )
}

export function ResetScreen(props: {
  email: string
  submitting: boolean
  errorMessage: string | null
  fieldErrors: FieldErrors
  onSubmit: (email: string, password: string, confirmation: string) => void
}) {
  const [address, setAddress] = useState(props.email)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  return (
    <FormCard title="Choose a new password" description="Use at least 12 characters with upper and lower case letters, a number, and a symbol.">
      {props.errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{props.errorMessage}</Alert> : null}
      <Box component="form" onSubmit={(event) => { event.preventDefault(); props.onSubmit(address.trim(), password, confirmation) }}>
        <TextField label="Email" type="email" name="email" autoComplete="username" required fullWidth margin="normal" value={address} onChange={(event) => setAddress(event.target.value)} error={(props.fieldErrors.email?.length ?? 0) > 0} helperText={props.fieldErrors.email?.[0] ?? ' '} />
        <TextField label="New password" type="password" name="password" autoComplete="new-password" required fullWidth margin="normal" value={password} onChange={(event) => setPassword(event.target.value)} error={(props.fieldErrors.password?.length ?? 0) > 0} helperText={props.fieldErrors.password?.[0] ?? ' '} />
        <TextField label="Confirm new password" type="password" name="password_confirmation" autoComplete="new-password" required fullWidth margin="normal" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} error={(props.fieldErrors.password_confirmation?.length ?? 0) > 0} helperText={props.fieldErrors.password_confirmation?.[0] ?? ' '} />
        <Button type="submit" variant="contained" fullWidth disabled={props.submitting} sx={{ mt: 2 }}>Save password</Button>
      </Box>
    </FormCard>
  )
}

export function AcceptScreen(props: {
  submitting: boolean
  errorMessage: string | null
  fieldErrors: FieldErrors
  onSubmit: (password: string, confirmation: string) => void
}) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  return (
    <FormCard title="Accept your invitation" description="Choose a password for this invitation. You will sign in next and enroll an authenticator before CRM opens.">
      {props.errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{props.errorMessage}</Alert> : null}
      <Box component="form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); props.onSubmit(password, confirmation) }}>
        <TextField label="Password" type="password" name="password" autoComplete="new-password" required fullWidth margin="normal" value={password} onChange={(event) => setPassword(event.target.value)} error={(props.fieldErrors.password?.length ?? 0) > 0} helperText={props.fieldErrors.password?.[0] ?? 'At least 12 characters, with upper and lower case letters, a number, and a symbol.'} />
        <TextField label="Confirm password" type="password" name="password_confirmation" autoComplete="new-password" required fullWidth margin="normal" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} error={(props.fieldErrors.password_confirmation?.length ?? 0) > 0} helperText={props.fieldErrors.password_confirmation?.[0] ?? ' '} />
        <Button type="submit" variant="contained" fullWidth disabled={props.submitting} sx={{ mt: 2 }}>Create account password</Button>
      </Box>
    </FormCard>
  )
}

export function ChallengeScreen(props: {
  mode: 'code' | 'recovery'
  submitting: boolean
  errorMessage: string | null
  fieldErrors: FieldErrors
  onCode: (code: string) => void
  onRecovery: (code: string) => void
  onSwitch: () => void
}) {
  const [value, setValue] = useState('')

  return (
    <FormCard title={props.mode === 'code' ? 'Authenticator challenge' : 'Use a recovery code'} description={props.mode === 'code' ? 'Enter the six-digit code from your authenticator.' : 'Each recovery code works once.'}>
      {props.errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{props.errorMessage}</Alert> : null}
      <Box component="form" onSubmit={(event) => { event.preventDefault(); props.mode === 'code' ? props.onCode(value) : props.onRecovery(value.trim()) }}>
        <TextField
          label={props.mode === 'code' ? 'Authenticator code' : 'Recovery code'}
          name={props.mode === 'code' ? 'code' : 'recovery_code'}
          autoComplete={props.mode === 'code' ? 'one-time-code' : 'off'}
          required
          fullWidth
          margin="normal"
          value={value}
          onChange={(event) => setValue(props.mode === 'code' ? event.target.value.replace(/\D/g, '').slice(0, 6) : event.target.value)}
          error={(props.fieldErrors.code?.length ?? 0) > 0 || (props.fieldErrors.recovery_code?.length ?? 0) > 0}
          helperText={props.fieldErrors.code?.[0] ?? props.fieldErrors.recovery_code?.[0] ?? ' '}
          slotProps={{ htmlInput: { inputMode: props.mode === 'code' ? 'numeric' : 'text' } }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={props.submitting} sx={{ mt: 2 }}>Verify</Button>
      </Box>
      <Link component="button" type="button" onClick={props.onSwitch} sx={{ mt: 2 }}>{props.mode === 'code' ? 'Use a recovery code' : 'Use an authenticator code'}</Link>
    </FormCard>
  )
}

export function EnrollScreen(props: { onEnrolled: (codes: string[]) => void }) {
  const [setup, setSetup] = useState<EnrollmentSetup | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    void beginEnrollment()
      .then((next) => {
        if (!active) return
        setSetup(next)
        setLoading(false)
      })
      .catch((error: unknown) => {
        if (!active) return
        if (isApiError(error) && error.status === 423) {
          setNeedsPassword(true)
        } else {
          setErrorMessage(isApiError(error) ? error.message : 'Authenticator setup could not be started.')
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <FormCard title="Set up your authenticator"><CircularProgress aria-label="Loading authenticator setup" /></FormCard>
  }

  if (needsPassword || setup === null) {
    return (
      <FormCard title="Confirm your password" description="Enrollment needs a recent password confirmation.">
        {errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert> : null}
        <Box component="form" onSubmit={(event) => {
          event.preventDefault()
          setSubmitting(true)
          void confirmPassword(password)
            .then(() => {
              resetEnrollmentSetup()
              return beginEnrollment()
            })
            .then((next) => {
              setSetup(next)
              setNeedsPassword(false)
            })
            .catch((error: unknown) => setErrorMessage(isApiError(error) ? error.message : 'Password confirmation failed.'))
            .finally(() => setSubmitting(false))
        }}>
          <TextField label="Password" type="password" name="password" autoComplete="current-password" required fullWidth margin="normal" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ mt: 2 }}>Continue</Button>
        </Box>
      </FormCard>
    )
  }

  const svg = setup.qr.svg.trimStart().startsWith('<svg') ? setup.qr.svg : ''

  return (
    <FormCard title="Set up your authenticator" description="Scan the QR code or enter the key, then confirm the six-digit code." maxWidth={520}>
      {errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert> : null}
      {svg !== '' ? <Box role="img" aria-label="Authenticator QR code" sx={{ mb: 2, '& svg': { width: 180, height: 180 } }} dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      <TextField label="Manual entry key" value={setup.secret.secretKey} fullWidth margin="normal" slotProps={{ htmlInput: { readOnly: true } }} />
      <Box component="form" onSubmit={(event) => {
        event.preventDefault()
        setSubmitting(true)
        void confirmEnrollment(code)
          .then((codes) => props.onEnrolled(codes))
          .catch((error: unknown) => setErrorMessage(isApiError(error) ? error.message : 'The code could not be confirmed.'))
          .finally(() => setSubmitting(false))
      }}>
        <TextField label="Authenticator code" name="code" autoComplete="one-time-code" required fullWidth margin="normal" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ mt: 2 }}>Confirm authenticator</Button>
      </Box>
    </FormCard>
  )
}

export function RecoveryScreen(props: { codes: string[]; onDone: () => void }) {
  const [stored, setStored] = useState(false)

  return (
    <FormCard title="Save your recovery codes" description="These codes stay on this screen only. They are not saved in browser storage." maxWidth={560}>
      <Box component="ul" aria-label="Recovery codes" sx={{ fontFamily: 'ui-monospace, Consolas, monospace' }}>
        {props.codes.map((code) => <Typography key={code} component="li">{code}</Typography>)}
      </Box>
      <FormControlLabel control={<Checkbox checked={stored} onChange={(event) => setStored(event.target.checked)} />} label="I have stored these recovery codes in a safe place." />
      <Button type="button" variant="contained" fullWidth disabled={!stored} onClick={props.onDone}>Continue to CRM</Button>
    </FormCard>
  )
}

export function HomeScreen({ home }: { home: CrmHome }) {
  return (
    <FormCard title="CRM home" maxWidth={720}>
      <Typography variant="body1">{home.name}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{home.email}</Typography>
      <Typography variant="subtitle1" component="h3">Roles</Typography>
      <Box component="ul">{home.roles.map((role) => <Typography key={role} component="li">{role}</Typography>)}</Box>
      <Typography variant="subtitle1" component="h3" sx={{ mt: 2 }}>Available navigation</Typography>
      <Stack component="ul" sx={{ m: 0, pl: 3 }}>
        {home.navigation.map((item) => <Typography key={item.key} component="li">{item.label}</Typography>)}
      </Stack>
    </FormCard>
  )
}

export function MessageScreen(props: { title: string; message: string; action?: string; onAction?: () => void }) {
  return (
    <FormCard title={props.title}>
      <Alert severity="info" sx={{ mb: 2 }}>{props.message}</Alert>
      {props.action && props.onAction ? <Button type="button" variant="contained" onClick={props.onAction}>{props.action}</Button> : null}
    </FormCard>
  )
}
